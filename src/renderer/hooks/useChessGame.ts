import { useState, useRef, useCallback, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { Key } from 'chessground/types';
import { DrawShape } from 'chessground/draw';
import { BotLevel, PlayerColor, EvalResult, VocabularyStyle, TacticalStep, GameOverState } from '../types/chess';
import { useAudio } from './useAudio';

export interface BlunderState {
  isOpen: boolean;
  deltaScore: string;
  pendingMove: { orig: Key; dest: Key; san: string } | null;
  moveDescriptionFr?: string;
  refutationLineUci: string;
  blunderFen: string;
  bestMove: string;
}

export const DEFAULT_STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export function useChessGame() {
  const [chess] = useState<Chess>(() => new Chess());
  const [startingFen, setStartingFen] = useState<string>(DEFAULT_STARTING_FEN);
  const [fen, setFen] = useState<string>(chess.fen());
  const [history, setHistory] = useState<{ san: string; fen: string; from: Key; to: Key }[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [gameOverDismissed, setGameOverDismissed] = useState<boolean>(false);

  // Settings
  const [playerColor, setPlayerColor] = useState<PlayerColor>('white');
  const [actualPlayerColor, setActualPlayerColor] = useState<'white' | 'black'>('white');
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [botLevel, setBotLevel] = useState<BotLevel>(() => {
    return (typeof window !== 'undefined' && window.chessAPI?.platform === 'linux') ? 'stockfish' : '1100';
  });
  const [blunderGuardEnabled, setBlunderGuardEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vocabularyStyle, setVocabularyStyle] = useState<VocabularyStyle>('debutant');

  // Evaluation & AI
  const [evalResult, setEvalResult] = useState<EvalResult>({
    score: '+0.2',
    numericScore: 0.2,
    bestMove: '',
    refutationLineUci: '',
    depth: 10,
  });
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [tacticalSteps, setTacticalSteps] = useState<TacticalStep[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [isCoachThinking, setIsCoachThinking] = useState<boolean>(false);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  // Blunder State
  const [blunderState, setBlunderState] = useState<BlunderState>({
    isOpen: false,
    deltaScore: '',
    pendingMove: null,
    refutationLineUci: '',
    blunderFen: '',
    bestMove: '',
  });

  const {
    playMove,
    playCapture,
    playCheck,
    playBlunder,
    playCoachChime,
    playVictory,
    playDefeat,
  } = useAudio(soundEnabled);
  const lastEvalRef = useRef<number>(0.2);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (botTimeoutRef.current) {
        clearTimeout(botTimeoutRef.current);
      }
    };
  }, []);

  // Legal moves for Chessground
  const getDests = useCallback((): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>();
    const moves = chess.moves({ verbose: true });
    for (const move of moves) {
      if (!dests.has(move.from as Key)) {
        dests.set(move.from as Key, []);
      }
      dests.get(move.from as Key)!.push(move.to as Key);

      // Support complet et ergonomique du roque (Roi vers case finale, Roi sur Tour, ou Tour sur Roi)
      if (move.piece === 'k') {
        if (move.san === 'O-O') {
          const rookSq = (move.color === 'w' ? 'h1' : 'h8') as Key;
          if (!dests.get(move.from as Key)!.includes(rookSq)) {
            dests.get(move.from as Key)!.push(rookSq);
          }
          if (!dests.has(rookSq)) {
            dests.set(rookSq, []);
          }
          if (!dests.get(rookSq)!.includes(move.from as Key)) {
            dests.get(rookSq)!.push(move.from as Key);
          }
        } else if (move.san === 'O-O-O') {
          const rookSq = (move.color === 'w' ? 'a1' : 'a8') as Key;
          if (!dests.get(move.from as Key)!.includes(rookSq)) {
            dests.get(move.from as Key)!.push(rookSq);
          }
          if (!dests.has(rookSq)) {
            dests.set(rookSq, []);
          }
          if (!dests.get(rookSq)!.includes(move.from as Key)) {
            dests.get(rookSq)!.push(move.from as Key);
          }
        }
      }
    }
    return dests;
  }, [chess, fen]);

  // Turn and Check state
  const turnColor: 'white' | 'black' = chess.turn() === 'w' ? 'white' : 'black';
  const isPlayerTurn = turnColor === actualPlayerColor && !isBotThinking && !blunderState.isOpen;
  const isGameOver = chess.isGameOver();

  // Dynamic visual shapes on chessboard
  const getShapes = useCallback((): DrawShape[] => {
    const shapes: DrawShape[] = [];

    if (blunderState.isOpen) {
      // 1. Coup gaffé tenté par le joueur : flèche jaune + halo rouge sur la case d'arrivée
      if (blunderState.pendingMove) {
        shapes.push({
          orig: blunderState.pendingMove.dest,
          brush: 'red',
        });
        shapes.push({
          orig: blunderState.pendingMove.orig,
          dest: blunderState.pendingMove.dest,
          brush: 'yellow',
        });
      }

      // 2. Meilleur coup alternatif recommandé par l'ordinateur : flèche verte
      if (blunderState.bestMove && blunderState.bestMove.length >= 4) {
        shapes.push({
          orig: blunderState.bestMove.slice(0, 2) as Key,
          dest: blunderState.bestMove.slice(2, 4) as Key,
          brush: 'green',
        });
      }

      // 3. Réfutation ou étape tactique sélectionnée
      if (selectedStepIndex !== null && tacticalSteps[selectedStepIndex]) {
        const step = tacticalSteps[selectedStepIndex];
        shapes.push({
          orig: step.from as Key,
          dest: step.to as Key,
          brush: step.isPupilMove ? 'green' : 'red',
        });
      } else if (tacticalSteps.length > 0) {
        // Affiche la riposte immédiate de l'adversaire en flèche rouge
        const firstStep = tacticalSteps[0];
        shapes.push({
          orig: firstStep.from as Key,
          dest: firstStep.to as Key,
          brush: 'red',
        });
      } else if (blunderState.refutationLineUci && blunderState.refutationLineUci.length >= 4) {
        shapes.push({
          orig: blunderState.refutationLineUci.slice(0, 2) as Key,
          dest: blunderState.refutationLineUci.slice(2, 4) as Key,
          brush: 'red',
        });
      }
    } else {
      // Mode normal : affichage des étapes tactiques du coach
      if (selectedStepIndex !== null && tacticalSteps[selectedStepIndex]) {
        const step = tacticalSteps[selectedStepIndex];
        shapes.push({
          orig: step.from as Key,
          dest: step.to as Key,
          brush: step.isPupilMove ? 'green' : 'red',
        });
      } else if (tacticalSteps.length > 0) {
        // Affiche jusqu'à 2 étapes successives (vert pour le joueur, rouge pour la riposte)
        for (let i = 0; i < Math.min(tacticalSteps.length, 2); i++) {
          const step = tacticalSteps[i];
          shapes.push({
            orig: step.from as Key,
            dest: step.to as Key,
            brush: step.isPupilMove ? 'green' : 'red',
          });
        }
      }
    }

    return shapes;
  }, [blunderState, tacticalSteps, selectedStepIndex]);

  // Trigger bot move via IPC
  const triggerBotMove = useCallback(async () => {
    if (typeof window === 'undefined' || !window.chessAPI) return;
    if (chess.isGameOver()) return;
    setIsBotThinking(true);

    try {
      const currentFen = chess.fen();
      const botMoveUci = await window.chessAPI.getBotMove(currentFen);

      if (botMoveUci && botMoveUci.length >= 4) {
        const from = botMoveUci.slice(0, 2) as Square;
        const to = botMoveUci.slice(2, 4) as Square;
        const promotion = botMoveUci.length > 4 ? botMoveUci[4] : undefined;

        const moveRes = chess.move({ from, to, promotion });
        if (moveRes) {
          if (chess.isGameOver()) {
            if (chess.isCheckmate()) {
              playDefeat();
              setCoachMessage("Échec et mat. L'ordinateur a maté votre Roi. Vous pouvez relancer une partie avec 'Refaire à 0' pour une revanche ou analyser les coups.");
            } else {
              setCoachMessage("Partie nulle ! Aucun des deux camps ne peut l'emporter.");
            }
          } else {
            if (moveRes.captured) {
              playCapture();
            } else {
              playMove();
            }
            if (chess.inCheck()) {
              playCheck();
            }
          }

          const newFen = chess.fen();
          setFen(newFen);
          setHistory((prev) => [
            ...prev,
            { san: moveRes.san, fen: newFen, from: moveRes.from as Key, to: moveRes.to as Key },
          ]);
          setCurrentMoveIndex((prev) => prev + 1);

          // Update Stockfish eval in background
          window.chessAPI.evaluatePosition(newFen, 10).then((res) => {
            setEvalResult(res);
            lastEvalRef.current = res.numericScore;
          }).catch(() => {});
        }
      }
    } catch (err) {
      console.error('[useChessGame] Error getting bot move:', err);
    } finally {
      setIsBotThinking(false);
    }
  }, [chess, playMove, playCapture, playCheck, playDefeat]);

  // Start new game
  const startNewGame = useCallback((colorChoice: PlayerColor = playerColor) => {
    chess.reset();
    let assignedColor: 'white' | 'black' = 'white';
    if (colorChoice === 'random') {
      assignedColor = Math.random() > 0.5 ? 'white' : 'black';
    } else {
      assignedColor = colorChoice;
    }

    setPlayerColor(colorChoice);
    setActualPlayerColor(assignedColor);
    setBoardOrientation(assignedColor);
    setStartingFen(DEFAULT_STARTING_FEN);
    setFen(chess.fen());
    setHistory([]);
    setCurrentMoveIndex(-1);
    setGameOverDismissed(false);
    setCoachMessage(null);
    setTacticalSteps([]);
    setSelectedStepIndex(null);
    setBlunderState({
      isOpen: false,
      deltaScore: '',
      pendingMove: null,
      refutationLineUci: '',
      blunderFen: '',
      bestMove: '',
    });
    lastEvalRef.current = 0.2;
    setEvalResult({
      score: '+0.2',
      numericScore: 0.2,
      bestMove: '',
      refutationLineUci: '',
      depth: 10,
    });

    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }

    // If player is Black, bot plays first move as White
    if (assignedColor === 'black') {
      botTimeoutRef.current = setTimeout(() => {
        triggerBotMove();
      }, 400);
    }
  }, [chess, playerColor, triggerBotMove]);

  // Handle human move
  const handleHumanMove = useCallback(async (orig: Key, dest: Key) => {
    if (!isPlayerTurn) return;

    let moveOrig = orig;
    let moveDest = dest;

    // Check legal move
    const legalMoves = chess.moves({ verbose: true });
    const isLegalMove = (from: string, to: string) =>
      legalMoves.some((m) => m.from === from && m.to === to);

    // Normalisation intelligente du roque (Roi sur Tour ou Tour sur Roi) :
    // On ne transforme le geste en roque QUE si :
    // 1) Le coup demandé n'est PAS DÉJÀ un coup direct légal (ex: Tour qui se déplace légalement sur la case vide e1 ou e8) !
    // 2) ET le roque correspondant est légal dans la position actuelle.
    if (!isLegalMove(moveOrig, moveDest)) {
      if (moveOrig === 'e1' && moveDest === 'h1' && isLegalMove('e1', 'g1')) {
        moveDest = 'g1';
      } else if (moveOrig === 'e1' && moveDest === 'a1' && isLegalMove('e1', 'c1')) {
        moveDest = 'c1';
      } else if (moveOrig === 'e8' && moveDest === 'h8' && isLegalMove('e8', 'g8')) {
        moveDest = 'g8';
      } else if (moveOrig === 'e8' && moveDest === 'a8' && isLegalMove('e8', 'c8')) {
        moveDest = 'c8';
      } else if (moveOrig === 'h1' && moveDest === 'e1' && isLegalMove('e1', 'g1')) {
        moveOrig = 'e1';
        moveDest = 'g1';
      } else if (moveOrig === 'a1' && moveDest === 'e1' && isLegalMove('e1', 'c1')) {
        moveOrig = 'e1';
        moveDest = 'c1';
      } else if (moveOrig === 'h8' && moveDest === 'e8' && isLegalMove('e8', 'g8')) {
        moveOrig = 'e8';
        moveDest = 'g8';
      } else if (moveOrig === 'a8' && moveDest === 'e8' && isLegalMove('e8', 'c8')) {
        moveOrig = 'e8';
        moveDest = 'c8';
      }
    }

    const matchingMove = legalMoves.find(
      (m) => m.from === moveOrig && m.to === moveDest
    );

    if (!matchingMove) return;

    // Try move on chess instance
    const moveRes = chess.move({
      from: moveOrig as Square,
      to: moveDest as Square,
      promotion: 'q',
    });

    if (!moveRes) return;

    const newFen = chess.fen();
    const isPlayerCheckmate = chess.isCheckmate();

    // Check blunder if guard is active (an opponent checkmate can never be a blunder)
    let moveEval: EvalResult | null = null;
    if (isPlayerCheckmate) {
      const playerIsWhite = actualPlayerColor === 'white';
      moveEval = {
        score: playerIsWhite ? '+M0' : '-M0',
        numericScore: playerIsWhite ? 10 : -10,
        bestMove: '',
        refutationLineUci: '',
        depth: 0,
      };
    } else if (blunderGuardEnabled) {
      try {
        const afterEval = await window.chessAPI.evaluatePosition(newFen, 10);
        moveEval = afterEval;
        const playerIsWhite = actualPlayerColor === 'white';
        const prevPlayerScore = playerIsWhite ? lastEvalRef.current : -lastEvalRef.current;
        const newPlayerScore = playerIsWhite ? afterEval.numericScore : -afterEval.numericScore;
        const delta = newPlayerScore - prevPlayerScore;

        if (delta <= -2.0) {
          // Blunder detected!
          playBlunder();
          // Le meilleur coup alternatif pour l'élève est celui calculé sur la position d'origine (avant la gaffe)
          const pupilAlternativeMove = evalResult.bestMove || '';

          // Traduction descriptive en français du coup gaffé tenté
          const pieceNamesFr: Record<string, string> = {
            p: 'Pion', n: 'Cavalier', b: 'Fou', r: 'Tour', q: 'Dame', k: 'Roi'
          };
          const pName = pieceNamesFr[moveRes.piece] || 'Pièce';
          const capDesc = moveRes.captured
            ? ` prend le ${pieceNamesFr[moveRes.captured] || 'pièce'} en ${moveRes.to}`
            : ` se déplace en ${moveRes.to}`;
          const playedDescFr = `${pName} ${playerIsWhite ? 'blanc' : 'noir'}${capDesc}`;

          setBlunderState({
            isOpen: true,
            deltaScore: `${delta.toFixed(1)} pions`,
            pendingMove: { orig: moveRes.from as Key, dest: moveRes.to as Key, san: moveRes.san },
            moveDescriptionFr: playedDescFr,
            refutationLineUci: afterEval.refutationLineUci || afterEval.bestMove,
            blunderFen: newFen,
            bestMove: pupilAlternativeMove,
          });
          chess.undo();
          return;
        }
      } catch (e) {
        console.warn('Error during blunder evaluation:', e);
      }
    }

    const nextIndex = currentMoveIndex + 1;
    setFen(newFen);
    setGameOverDismissed(false);
    setHistory((prev) => {
      const base = currentMoveIndex >= 0 ? prev.slice(0, currentMoveIndex + 1) : [];
      return [
        ...base,
        { san: moveRes.san, fen: newFen, from: moveRes.from as Key, to: moveRes.to as Key },
      ];
    });
    setCurrentMoveIndex(nextIndex);
    setTacticalSteps([]);
    setSelectedStepIndex(null);

    // Commit move sound & game over check
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        playVictory();
        setCoachMessage("🎉 Échec et mat ! Magnifique coup, vous avez remporté la partie !");
      } else {
        setCoachMessage("Partie nulle ! Aucun joueur ne peut forcer la victoire.");
      }
      if (moveEval) {
        setEvalResult(moveEval);
        lastEvalRef.current = moveEval.numericScore;
      }
    } else {
      if (moveRes.captured) {
        playCapture();
      } else {
        playMove();
      }
      if (chess.inCheck()) {
        playCheck();
      }
      setCoachMessage(null);

      // Apply eval result without sending concurrent duplicate command
      if (moveEval) {
        setEvalResult(moveEval);
        lastEvalRef.current = moveEval.numericScore;
      }

      // Forward turn to bot
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = setTimeout(() => {
        triggerBotMove();
      }, 150);
    }
  }, [
    isPlayerTurn,
    chess,
    actualPlayerColor,
    blunderGuardEnabled,
    currentMoveIndex,
    playMove,
    playCapture,
    playCheck,
    playBlunder,
    playVictory,
    triggerBotMove,
  ]);

  // Actions from Blunder Banner
  const handleBlunderUndo = useCallback(() => {
    setBlunderState({
      isOpen: false,
      deltaScore: '',
      pendingMove: null,
      refutationLineUci: '',
      blunderFen: '',
      bestMove: '',
    });
    setCoachMessage(null);
    setTacticalSteps([]);
    setSelectedStepIndex(null);
    setFen(chess.fen());
  }, [chess]);

  const handleBlunderConfirm = useCallback(() => {
    if (!blunderState.pendingMove) return;

    const moveRes = chess.move({
      from: blunderState.pendingMove.orig as Square,
      to: blunderState.pendingMove.dest as Square,
      promotion: 'q',
    });

    if (moveRes) {
      const nextIndex = currentMoveIndex + 1;
      const newFen = chess.fen();
      setFen(newFen);
      setHistory((prev) => {
        const base = currentMoveIndex >= 0 ? prev.slice(0, currentMoveIndex + 1) : [];
        return [
          ...base,
          {
            san: moveRes.san,
            fen: newFen,
            from: blunderState.pendingMove!.orig,
            to: blunderState.pendingMove!.dest,
          },
        ];
      });
      setCurrentMoveIndex(nextIndex);
      setCoachMessage(null);
      setTacticalSteps([]);
      setSelectedStepIndex(null);

      setBlunderState({
        isOpen: false,
        deltaScore: '',
        pendingMove: null,
        refutationLineUci: '',
        blunderFen: '',
        bestMove: '',
      });

      if (chess.isGameOver()) {
        if (chess.isCheckmate()) {
          playVictory();
          setCoachMessage("🎉 Échec et mat ! Magnifique coup, vous avez remporté la partie !");
        } else {
          setCoachMessage("Partie nulle ! Aucun joueur ne peut forcer la victoire.");
        }
      } else {
        if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
        botTimeoutRef.current = setTimeout(() => triggerBotMove(), 250);
      }
    }
  }, [blunderState, chess, currentMoveIndex, triggerBotMove, playVictory]);

  // Undo Move
  const handleUndo = useCallback(() => {
    if (history.length === 0 || blunderState.isOpen) return;

    if (botTimeoutRef.current) {
      clearTimeout(botTimeoutRef.current);
      botTimeoutRef.current = null;
    }

    chess.undo();
    if (chess.turn() !== (actualPlayerColor === 'white' ? 'w' : 'b') && history.length > 1) {
      chess.undo();
      setHistory((prev) => prev.slice(0, -2));
      setCurrentMoveIndex((prev) => Math.max(-1, prev - 2));
    } else {
      setHistory((prev) => prev.slice(0, -1));
      setCurrentMoveIndex((prev) => Math.max(-1, prev - 1));
    }

    setFen(chess.fen());
    setGameOverDismissed(false);
    setCoachMessage(null);
    setTacticalSteps([]);
    setSelectedStepIndex(null);
  }, [chess, history.length, actualPlayerColor, blunderState.isOpen]);

  // Jump to specific past move in history
  const jumpToMove = useCallback((index: number) => {
    setCoachMessage(null);
    setTacticalSteps([]);
    setSelectedStepIndex(null);
    if (index === -1) {
      if (startingFen && startingFen !== DEFAULT_STARTING_FEN) {
        chess.load(startingFen);
      } else {
        chess.reset();
      }
      setFen(chess.fen());
      setCurrentMoveIndex(-1);
    } else if (index >= 0 && index < history.length) {
      const targetFen = history[index].fen;
      chess.load(targetFen);
      setFen(targetFen);
      setCurrentMoveIndex(index);
    }
  }, [chess, history, startingFen]);

  // Ask AI Coach
  const askCoach = useCallback(async () => {
    setIsCoachThinking(true);
    try {
      const payloadFen = blunderState.isOpen ? blunderState.blunderFen : fen;
      const baseFen = blunderState.isOpen ? fen : undefined;
      const coupJoueLisible = blunderState.isOpen ? blunderState.moveDescriptionFr : undefined;
      const lastPlayedSan = blunderState.isOpen
        ? blunderState.pendingMove?.san || ''
        : history.length > 0
        ? history[history.length - 1].san
        : 'Coup initial';

      // Détermine qui a joué le dernier coup analysé
      let whoPlayedLastMove: 'player' | 'opponent' | 'none' = 'none';
      if (blunderState.isOpen) {
        whoPlayedLastMove = 'player';
      } else if (history.length > 0) {
        const lastMoveTurn = (history.length % 2 === 1) ? 'white' : 'black';
        whoPlayedLastMove = lastMoveTurn === actualPlayerColor ? 'player' : 'opponent';
      }

      const evalDisplay = typeof evalResult.score === 'number'
        ? (evalResult.score > 0 ? `+${evalResult.score}` : `${evalResult.score}`)
        : evalResult.score;

      const refutationSource = blunderState.isOpen
        ? (blunderState.refutationLineUci || blunderState.bestMove)
        : (evalResult.refutationLineUci || evalResult.bestMove);

      const response = await window.chessAPI.askCoach({
        fen: payloadFen,
        baseFen,
        playerColor: actualPlayerColor,
        coupJoue: lastPlayedSan,
        coupJoueLisible,
        whoPlayedLastMove,
        isBlunder: blunderState.isOpen,
        deltaScore: blunderState.isOpen ? blunderState.deltaScore : `${evalDisplay} pions`,
        refutationLisible: refutationSource || 'Position équilibrée',
        refutationUci: refutationSource,
        meilleurCoup: blunderState.isOpen ? blunderState.bestMove : evalResult.bestMove,
        styleVocabulaire: vocabularyStyle,
      });

      if (typeof response === 'object' && response !== null && 'message' in response) {
        setCoachMessage(response.message);
        if (response.steps && response.steps.length > 0) {
          setTacticalSteps(response.steps);
          setSelectedStepIndex(null);
        }
      } else {
        setCoachMessage(response as string);
      }
      playCoachChime();
    } catch (err) {
      console.error('[useChessGame] Error calling coach:', err);
      setCoachMessage("Impossible de joindre le Coach IA pour l'instant.");
    } finally {
      setIsCoachThinking(false);
    }
  }, [
    blunderState,
    fen,
    history,
    actualPlayerColor,
    evalResult,
    vocabularyStyle,
    playCoachChime,
  ]);

  // Generate clean standard-compliant PGN string
  const getPgn = useCallback((): string => {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
    const playerIsWhite = actualPlayerColor === 'white';
    const isLinux = typeof window !== 'undefined' && window.chessAPI?.platform === 'linux';
    const botDisplayName =
      botLevel === 'stockfish'
        ? 'Stockfish 19 (Maître)'
        : isLinux
        ? `Stockfish (${botLevel})`
        : `Maia (${botLevel})`;
    const whiteName = playerIsWhite ? 'Joueur' : botDisplayName;
    const blackName = playerIsWhite ? botDisplayName : 'Joueur';

    let result = '*';
    let termination = 'En cours';
    if (chess.isGameOver()) {
      if (chess.isCheckmate()) {
        result = chess.turn() === 'b' ? '1-0' : '0-1';
        termination = chess.turn() === 'b' ? 'Les Blancs gagnent par échec et mat' : 'Les Noirs gagnent par échec et mat';
      } else if (chess.isStalemate()) {
        result = '1/2-1/2';
        termination = 'Partie nulle (pat)';
      } else if (chess.isThreefoldRepetition()) {
        result = '1/2-1/2';
        termination = 'Partie nulle (répétition)';
      } else if (chess.isInsufficientMaterial()) {
        result = '1/2-1/2';
        termination = 'Partie nulle (matériel insuffisant)';
      } else if (chess.isDraw()) {
        result = '1/2-1/2';
        termination = 'Partie nulle';
      }
    }

    const headers: string[] = [
      `[Event "Partie d'entraînement"]`,
      `[Site "Mon Coach Échecs"]`,
      `[Date "${today}"]`,
      `[Round "1"]`,
      `[White "${whiteName}"]`,
      `[Black "${blackName}"]`,
      `[Result "${result}"]`,
      `[Termination "${termination}"]`,
    ];

    const isCustomFen = Boolean(startingFen && startingFen !== DEFAULT_STARTING_FEN);
    if (isCustomFen) {
      headers.push(`[SetUp "1"]`);
      headers.push(`[FEN "${startingFen}"]`);
    }

    const fenTokens = (startingFen || '').split(' ');
    const startColor = fenTokens[1] || 'w';
    let fullMoveNum = parseInt(fenTokens[5] || '1', 10) || 1;

    const tokens: string[] = [];
    let isWhiteMove = startColor === 'w';

    for (let i = 0; i < history.length; i++) {
      if (isWhiteMove) {
        tokens.push(`${fullMoveNum}. ${history[i].san}`);
        isWhiteMove = false;
      } else {
        if (i === 0 && startColor === 'b') {
          tokens.push(`${fullMoveNum}... ${history[i].san}`);
        } else {
          tokens.push(history[i].san);
        }
        fullMoveNum++;
        isWhiteMove = true;
      }
    }

    let movesBody = '';
    let currentLine = '';
    for (const token of tokens) {
      if ((currentLine + ' ' + token).trim().length > 78) {
        movesBody += (movesBody ? '\n' : '') + currentLine.trim();
        currentLine = token;
      } else {
        currentLine = (currentLine + ' ' + token).trim();
      }
    }
    if (currentLine.trim()) {
      movesBody += (movesBody ? '\n' : '') + currentLine.trim();
    }

    movesBody = movesBody ? `${movesBody} ${result}` : result;

    return `${headers.join('\n')}\n\n${movesBody}\n`;
  }, [actualPlayerColor, botLevel, chess, history, startingFen]);

  // Game over state
  const getGameOverState = useCallback((): GameOverState => {
    if (!chess.isGameOver()) {
      return {
        isGameOver: false,
        reason: null,
        winner: null,
        userResult: null,
        title: '',
        subtitle: '',
        scoreDisplay: '*',
        isOpen: false,
      };
    }

    let reason: 'checkmate' | 'stalemate' | 'threefold' | 'insufficient' | 'draw' = 'draw';
    let winner: 'white' | 'black' | 'draw' = 'draw';
    let userResult: 'win' | 'loss' | 'draw' = 'draw';
    let title = 'Partie terminée';
    let subtitle = '';
    let scoreDisplay = '1/2-1/2';

    if (chess.isCheckmate()) {
      reason = 'checkmate';
      winner = chess.turn() === 'w' ? 'black' : 'white';
      scoreDisplay = winner === 'white' ? '1-0' : '0-1';
      const userWon = actualPlayerColor === winner;
      userResult = userWon ? 'win' : 'loss';
      title = userWon ? 'Victoire par échec et mat !' : 'Échec et mat !';
      subtitle = userWon
        ? 'Félicitations ! Vous avez maté le Roi adverse.'
        : "Votre Roi est échec et mat. L'ordinateur remporte la partie.";
    } else if (chess.isStalemate()) {
      reason = 'stalemate';
      winner = 'draw';
      userResult = 'draw';
      title = 'Partie nulle par pat';
      subtitle = 'Le Roi n’est pas en échec mais aucun coup légal n’est possible.';
      scoreDisplay = '1/2-1/2';
    } else if (chess.isThreefoldRepetition()) {
      reason = 'threefold';
      winner = 'draw';
      userResult = 'draw';
      title = 'Partie nulle (répétition)';
      subtitle = 'La même position a été répétée trois fois sur l’échiquier.';
      scoreDisplay = '1/2-1/2';
    } else if (chess.isInsufficientMaterial()) {
      reason = 'insufficient';
      winner = 'draw';
      userResult = 'draw';
      title = 'Partie nulle (matériel)';
      subtitle = 'Matériel insuffisant pour forcer le mat.';
      scoreDisplay = '1/2-1/2';
    } else {
      reason = 'draw';
      winner = 'draw';
      userResult = 'draw';
      title = 'Partie nulle';
      subtitle = 'La partie se termine par la nulle.';
      scoreDisplay = '1/2-1/2';
    }

    return {
      isGameOver: true,
      reason,
      winner,
      userResult,
      title,
      subtitle,
      scoreDisplay,
      isOpen: !gameOverDismissed,
    };
  }, [chess, actualPlayerColor, gameOverDismissed]);

  // Change bot level
  const handleSetBotLevel = useCallback(async (level: BotLevel) => {
    setBotLevel(level);
    await window.chessAPI.setBotLevel(level);
  }, []);

  return {
    fen,
    history,
    currentMoveIndex,
    playerColor,
    actualPlayerColor,
    boardOrientation,
    botLevel,
    blunderGuardEnabled,
    soundEnabled,
    vocabularyStyle,
    evalResult,
    coachMessage,
    tacticalSteps,
    selectedStepIndex,
    setSelectedStepIndex,
    isCoachThinking,
    isBotThinking,
    isGameOver,
    gameOverState: getGameOverState(),
    dismissGameOver: () => setGameOverDismissed(true),
    showGameOver: () => setGameOverDismissed(false),
    turnColor,
    isPlayerTurn,
    blunderState,
    dests: getDests(),
    shapes: getShapes(),
    pgn: getPgn(),
    startNewGame,
    handleHumanMove,
    handleBlunderUndo,
    handleBlunderConfirm,
    handleUndo,
    jumpToMove,
    askCoach,
    setPlayerColor,
    setBoardOrientation,
    setBlunderGuardEnabled,
    setSoundEnabled,
    setVocabularyStyle,
    handleSetBotLevel,
    flipBoard: () => setBoardOrientation((o) => (o === 'white' ? 'black' : 'white')),
    loadPgnOrFen: (text: string): boolean => {
      try {
        if (text.includes('/') && text.split(' ').length >= 2) {
          const cleanFen = text.trim();
          chess.load(cleanFen);
          setStartingFen(cleanFen);
          setFen(chess.fen());
          setHistory([]);
          setCurrentMoveIndex(-1);
          setGameOverDismissed(false);
          return true;
        } else {
          chess.loadPgn(text.trim());
          const header = chess.header();
          const pgnFen = header['SetUp'] === '1' && header['FEN'] ? header['FEN'] : DEFAULT_STARTING_FEN;
          setStartingFen(pgnFen);
          setFen(chess.fen());
          const moves = chess.history({ verbose: true });
          const newHist = moves.map((m) => ({
            san: m.san,
            fen: m.after,
            from: m.from as Key,
            to: m.to as Key,
          }));
          setHistory(newHist);
          setCurrentMoveIndex(newHist.length - 1);
          setGameOverDismissed(false);
          return true;
        }
      } catch (e) {
        return false;
      }
    },
  };
}
