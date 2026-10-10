import { useState, useEffect, useRef, useCallback } from 'react';
import { DrawShape } from 'chessground/draw';
import { Key } from 'chessground/types';
import {
  ProgressiveCoachState,
  ProgressiveCoachResult,
  ProgressiveCoachMove,
  TargetPieceInfo,
} from '../types/chess';

const STORAGE_KEY = 'mon-coach-progressive-enabled';

interface UseProgressiveCoachProps {
  fen: string;
  playerColor: 'white' | 'black';
  isPlayerTurn: boolean;
  isGameOver: boolean;
}

export function useProgressiveCoach({
  fen,
  playerColor,
  isPlayerTurn,
  isGameOver,
}: UseProgressiveCoachProps) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [currentLevel, setCurrentLevel] = useState<0 | 1 | 2 | 3>(enabled ? 1 : 0);
  const [status, setStatus] = useState<'ATTACK' | 'DEFENSE'>('ATTACK');
  const [evalRefCp, setEvalRefCp] = useState<number>(0);
  const [evalNullCp, setEvalNullCp] = useState<number>(0);
  const [deltaCp, setDeltaCp] = useState<number>(0);
  const [issueType, setIssueType] = useState<'MATE' | 'MATERIAL' | 'POSITION'>('POSITION');
  const [issueDelta, setIssueDelta] = useState<number>(0);
  const [issueLabelFr, setIssueLabelFr] = useState<string>('Avantage positionnel');
  const [targetPiece, setTargetPiece] = useState<TargetPieceInfo | null>(null);
  const [targetDescriptionFr, setTargetDescriptionFr] = useState<string>('Initiative tactique');
  const [simulationMoves, setSimulationMoves] = useState<ProgressiveCoachMove[]>([]);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  const [simulationStepIndex, setSimulationStepIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Token pour éviter les conditions de course sur requêtes asynchrones
  const activeRequestIdRef = useRef<number>(0);

  // Synchronisation de la persistance localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(enabled));
    } catch {}
  }, [enabled]);

  // Analyse asynchrone via IPC
  const runAnalysis = useCallback(
    async (targetFen: string, targetPlayerColor: 'white' | 'black') => {
      if (!window.chessAPI?.getProgressiveCoachData) return;

      const requestId = ++activeRequestIdRef.current;
      setIsLoading(true);

      try {
        const result: ProgressiveCoachResult = await window.chessAPI.getProgressiveCoachData(
          targetFen,
          targetPlayerColor
        );

        // Si une nouvelle requête a été émise entre-temps, ignorer
        if (requestId !== activeRequestIdRef.current) return;

        setStatus(result.status);
        setEvalRefCp(result.evalRefCp);
        setEvalNullCp(result.evalNullCp);
        setDeltaCp(result.deltaCp);
        setIssueType(result.issueType);
        setIssueDelta(result.issueDelta);
        setIssueLabelFr(result.issueLabelFr);
        setTargetPiece(result.targetPiece);
        setTargetDescriptionFr(result.targetDescriptionFr);
        setSimulationMoves(result.simulationMoves || []);
      } catch (err) {
        console.warn('[useProgressiveCoach] Erreur analyse:', err);
      } finally {
        if (requestId === activeRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  // Réinitialisation & lancement automatique à chaque nouveau tour du joueur
  useEffect(() => {
    if (!enabled || isGameOver) {
      if (!enabled) setCurrentLevel(0);
      setSimulationActive(false);
      return;
    }

    // Si la simulation était active et que la position change, fermeture forcée
    setSimulationActive(false);
    setSimulationStepIndex(0);

    // À chaque coup de l'adversaire (au trait du joueur), réinitialiser au Palier 1
    setCurrentLevel(1);

    if (isPlayerTurn) {
      runAnalysis(fen, playerColor);
    }
  }, [fen, isPlayerTurn, isGameOver, enabled, playerColor, runAnalysis]);

  // Gestion du raccourci clavier Échap pour fermer la simulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && simulationActive) {
        setSimulationActive(false);
        setSimulationStepIndex(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [simulationActive]);

  // Bascule du mode coach
  const toggleEnabled = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (!next) {
        setCurrentLevel(0);
        setSimulationActive(false);
      } else {
        setCurrentLevel(1);
        if (isPlayerTurn && !isGameOver) {
          runAnalysis(fen, playerColor);
        }
      }
      return next;
    });
  }, [fen, isPlayerTurn, isGameOver, playerColor, runAnalysis]);

  // Progression manuelle des paliers
  const advanceLevel = useCallback(() => {
    if (!enabled) return;
    setCurrentLevel((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 3;
      return prev;
    });
  }, [enabled]);

  // Démarrer la simulation (Palier 4)
  const startSimulation = useCallback(() => {
    if (simulationMoves.length === 0) return;
    setSimulationActive(true);
    setSimulationStepIndex(0);
  }, [simulationMoves]);

  // Quitter la simulation
  const exitSimulation = useCallback(() => {
    setSimulationActive(false);
    setSimulationStepIndex(0);
  }, []);

  // Navigation coup par coup dans la simulation
  const stepSimulation = useCallback(
    (action: 'first' | 'prev' | 'next' | 'last') => {
      if (!simulationActive || simulationMoves.length === 0) return;
      setSimulationStepIndex((prev) => {
        switch (action) {
          case 'first':
            return -1; // -1 correspond à la position initiale avant le 1er coup
          case 'prev':
            return Math.max(-1, prev - 1);
          case 'next':
            return Math.min(simulationMoves.length - 1, prev + 1);
          case 'last':
            return simulationMoves.length - 1;
          default:
            return prev;
        }
      });
    },
    [simulationActive, simulationMoves]
  );

  // FEN affiché actuellement (mode réel vs mode ghost board simulation)
  const displayFen =
    simulationActive && simulationStepIndex >= 0 && simulationMoves[simulationStepIndex]
      ? simulationMoves[simulationStepIndex].fen
      : fen;

  // Flèches SVG sur l'échiquier lors de la simulation
  const simulationShapes: DrawShape[] = [];
  if (simulationActive && simulationStepIndex >= 0 && simulationMoves[simulationStepIndex]) {
    const move = simulationMoves[simulationStepIndex];
    const isPlayerMove = move.color === (playerColor === 'white' ? 'w' : 'b');
    simulationShapes.push({
      orig: move.from as Key,
      dest: move.to as Key,
      brush: isPlayerMove ? 'blue' : 'red',
    });
  }

  const state: ProgressiveCoachState = {
    enabled,
    currentLevel,
    status,
    issueType,
    issueDelta,
    issueLabelFr,
    targetPiece,
    targetDescriptionFr,
    simulation: {
      active: simulationActive,
      stepIndex: simulationStepIndex,
      moves: simulationMoves,
    },
    isLoading,
  };

  return {
    state,
    enabled,
    currentLevel,
    status,
    evalRefCp,
    evalNullCp,
    deltaCp,
    issueType,
    issueDelta,
    issueLabelFr,
    targetPiece,
    targetDescriptionFr,
    simulationMoves,
    simulationActive,
    simulationStepIndex,
    isLoading,
    displayFen,
    simulationShapes,
    toggleEnabled,
    setCurrentLevel,
    advanceLevel,
    startSimulation,
    exitSimulation,
    stepSimulation,
  };
}
