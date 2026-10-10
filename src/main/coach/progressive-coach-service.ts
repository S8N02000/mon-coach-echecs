import { Chess, Square, PieceSymbol } from 'chess.js';
import { StockfishService } from '../uci/stockfish-service';
import {
  ProgressiveCoachResult,
  ProgressiveCoachMove,
  TargetPieceInfo,
} from '../../renderer/types/chess';

const PIECE_NAMES_FR: Record<string, string> = {
  p: 'Pion',
  n: 'Cavalier',
  b: 'Fou',
  r: 'Tour',
  q: 'Dame',
  k: 'Roi',
};

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

export class ProgressiveCoachService {
  constructor(private stockfishService: StockfishService) {}

  /**
   * Génère un FEN pour la règle du coup nul (Null Move Heuristic).
   * Retourne null si le FEN est invalide ou si le camp au trait est actuellement en échec.
   */
  public static generateNullMoveFen(fen: string): string | null {
    try {
      const chess = new Chess(fen);
      // Aux échecs, si le roi est en échec, passer son tour est illégal
      if (chess.inCheck()) {
        return null;
      }

      const parts = fen.trim().split(/\s+/);
      if (parts.length < 4) return null;

      const [pieces, activeColor, castling, , halfmove = '0', fullmove = '1'] = parts;
      const nextColor = activeColor === 'w' ? 'b' : 'w';
      const nextEnPassant = '-';
      const nextFullmove = activeColor === 'b' ? String(parseInt(fullmove, 10) + 1) : fullmove;

      return `${pieces} ${nextColor} ${castling} ${nextEnPassant} 0 ${nextFullmove}`;
    } catch {
      return null;
    }
  }

  /**
   * Calcule le matériel total d'une couleur donnée sur un échiquier chess.js
   */
  public static calculateTotalMaterial(chess: Chess, color: 'w' | 'b'): number {
    const board = chess.board();
    let total = 0;
    for (const row of board) {
      for (const sq of row) {
        if (sq && sq.color === color) {
          total += PIECE_VALUES[sq.type] || 0;
        }
      }
    }
    return total;
  }

  /**
   * Compte le nombre total de pièces sur le plateau
   */
  public static countTotalPieces(chess: Chess): number {
    const board = chess.board();
    let count = 0;
    for (const row of board) {
      for (const sq of row) {
        if (sq) count++;
      }
    }
    return count;
  }

  /**
   * Trouve la case du roi d'une couleur donnée
   */
  public static findKingSquare(chess: Chess, color: 'w' | 'b'): string {
    const board = chess.board();
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (sq && sq.type === 'k' && sq.color === color) {
          const rank = 8 - r;
          return `${files[c]}${rank}`;
        }
      }
    }
    return color === 'w' ? 'e1' : 'e8';
  }

  /**
   * Analyse complète de la position selon le CDC du Coach Décisionnel Progressif
   */
  public async analyze(
    fen: string,
    playerColor: 'white' | 'black'
  ): Promise<ProgressiveCoachResult> {
    const chess = new Chess(fen);
    const playerSide = playerColor === 'white' ? 'w' : 'b';
    const isPlayerTurn = chess.turn() === playerSide;
    const isPlayerInCheck = chess.inCheck();

    // 1. Évaluation courante (Eval_ref) à profondeur 14
    const evalRefRaw = await this.stockfishService.evaluateRaw(fen, 14);

    let evalRefCp = 0;
    if (evalRefRaw.mateScore !== null) {
      evalRefCp = evalRefRaw.mateScore > 0 ? 10000 : -10000;
    } else if (evalRefRaw.cpScore !== null) {
      // UCI score cp est relatif au camp au trait
      // Si c'est au tour du joueur, c'est directement le score du joueur
      evalRefCp = isPlayerTurn ? evalRefRaw.cpScore : -evalRefRaw.cpScore;
    }

    // 2. Évaluation par coup nul (Eval_null) à profondeur 12
    let evalNullCp = 0;
    const nullFen = ProgressiveCoachService.generateNullMoveFen(fen);

    if (isPlayerInCheck || !nullFen) {
      // Si le joueur est en échec direct ou null move impossible :
      // Menace immédiate absolue -> Eval_null s'effondre pour le joueur
      evalNullCp = -10000;
    } else {
      const evalNullRaw = await this.stockfishService.evaluateRaw(nullFen, 12);
      if (evalNullRaw.mateScore !== null) {
        // Dans nullFen, c'est à l'adversaire de jouer :
        // Si l'adversaire mate (mateScore > 0), c'est une défaite pour le joueur (-10000)
        evalNullCp = evalNullRaw.mateScore > 0 ? -10000 : 10000;
      } else if (evalNullRaw.cpScore !== null) {
        // Dans nullFen, score est pour l'adversaire :
        // Pour le joueur, score = -cpScore
        evalNullCp = -evalNullRaw.cpScore;
      }
    }

    // 3. Seuil de décision : Attaque vs Défense (Palier 1)
    const deltaCp = evalRefCp - evalNullCp;
    let status: 'ATTACK' | 'DEFENSE' = 'ATTACK';

    if (isPlayerInCheck || deltaCp >= 150 || evalRefCp <= -250) {
      status = 'DEFENSE';
    } else {
      status = 'ATTACK';
    }

    // 4. Qualification de l'enjeu (Palier 2) & Simulation (Palier 4) & Cible (Palier 3)
    const simulationChess = new Chess(fen);
    const pvMovesUci = (evalRefRaw.pv || '').trim().split(/\s+/).filter(Boolean);

    const simulationMoves: ProgressiveCoachMove[] = [];
    let firstCapturedPiece: {
      type: string;
      square: string;
      isOpponentTargeted: boolean;
      san: string;
    } | null = null;
    let firstMoveInfo: { piece: string; to: string; from: string } | null = null;

    const initialPlayerMat = ProgressiveCoachService.calculateTotalMaterial(
      simulationChess,
      playerSide
    );
    const initialOpponentMat = ProgressiveCoachService.calculateTotalMaterial(
      simulationChess,
      playerSide === 'w' ? 'b' : 'w'
    );
    const initialNetMat = initialPlayerMat - initialOpponentMat;

    // Déroulement de la PV (jusqu'à 8 demi-coups)
    for (let i = 0; i < Math.min(pvMovesUci.length, 8); i++) {
      const uci = pvMovesUci[i];
      if (uci.length < 4) break;

      const from = uci.slice(0, 2) as Square;
      const to = uci.slice(2, 4) as Square;
      const promotion = uci.length > 4 ? (uci[4] as PieceSymbol) : undefined;

      const movingColor = simulationChess.turn();
      const moveRes = simulationChess.move({ from, to, promotion });
      if (!moveRes) break;

      if (i === 0) {
        firstMoveInfo = { piece: moveRes.piece, to: moveRes.to, from: moveRes.from };
      }

      if (!firstCapturedPiece && moveRes.captured) {
        firstCapturedPiece = {
          type: moveRes.captured,
          square: moveRes.to,
          isOpponentTargeted: movingColor === playerSide,
          san: moveRes.san,
        };
      }

      simulationMoves.push({
        uci,
        san: moveRes.san,
        fen: simulationChess.fen(),
        from: moveRes.from,
        to: moveRes.to,
        color: movingColor,
      });
    }

    const finalPlayerMat = ProgressiveCoachService.calculateTotalMaterial(
      simulationChess,
      playerSide
    );
    const finalOpponentMat = ProgressiveCoachService.calculateTotalMaterial(
      simulationChess,
      playerSide === 'w' ? 'b' : 'w'
    );
    const finalNetMat = finalPlayerMat - finalOpponentMat;
    const materialDelta = finalNetMat - initialNetMat;

    // Palier 2 : Enjeu
    let issueType: 'MATE' | 'MATERIAL' | 'POSITION' = 'POSITION';
    let issueDelta = 0;
    let issueLabelFr = 'Avantage positionnel';

    if (evalRefRaw.mateScore !== null) {
      issueType = 'MATE';
      issueDelta = evalRefRaw.mateScore;
      if (evalRefRaw.mateScore > 0) {
        issueLabelFr = 'Mat forcé à portée';
      } else {
        issueLabelFr = 'Menace de mat imminent';
      }
    } else if (materialDelta !== 0) {
      issueType = 'MATERIAL';
      issueDelta = materialDelta;
      if (materialDelta > 0) {
        issueLabelFr = `Gain de matériel (+${materialDelta} pts)`;
      } else {
        issueLabelFr = `Perte de matériel (${materialDelta} pts)`;
      }
    } else {
      issueType = 'POSITION';
      issueDelta = evalRefCp;
      issueLabelFr = status === 'ATTACK' ? 'Avantage positionnel' : 'Pression positionnelle';
    }

    // Palier 3 : Précision de la cible
    let targetPiece: TargetPieceInfo | null = null;
    let targetDescriptionFr = 'Initiative tactique';

    if (firstCapturedPiece) {
      const pName = PIECE_NAMES_FR[firstCapturedPiece.type] || 'Pièce';
      targetPiece = {
        type: firstCapturedPiece.type,
        square: firstCapturedPiece.square,
        nameFr: `${pName} en ${firstCapturedPiece.square}`,
      };
      if (firstCapturedPiece.isOpponentTargeted) {
        targetDescriptionFr = `${pName} ${firstCapturedPiece.square} ciblé`;
      } else {
        targetDescriptionFr = `${pName} ${firstCapturedPiece.square} vulnérable`;
      }
    } else {
      const pieceCount = ProgressiveCoachService.countTotalPieces(new Chess(fen));
      if (pieceCount <= 6) {
        // Finale simple : cibler roi adverse ou case promotion
        const oppKingSq = ProgressiveCoachService.findKingSquare(
          new Chess(fen),
          playerSide === 'w' ? 'b' : 'w'
        );
        targetPiece = {
          type: 'k',
          square: oppKingSq,
          nameFr: `Roi adverse en ${oppKingSq}`,
        };
        targetDescriptionFr = `Roi adverse en ${oppKingSq}`;
      } else if (firstMoveInfo) {
        const pName = PIECE_NAMES_FR[firstMoveInfo.piece] || 'Pièce';
        targetPiece = {
          type: firstMoveInfo.piece,
          square: firstMoveInfo.to,
          nameFr: `${pName} vers ${firstMoveInfo.to}`,
        };
        if (firstMoveInfo.piece === 'p') {
          targetDescriptionFr = `Pion ${firstMoveInfo.to} d'ouverture de ligne`;
        } else {
          targetDescriptionFr = `Case clé d'infiltration en ${firstMoveInfo.to}`;
        }
      }
    }

    return {
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
    };
  }
}
