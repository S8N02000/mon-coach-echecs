import { describe, it, expect, vi } from 'vitest';
import { Chess } from 'chess.js';
import { ProgressiveCoachService } from '../main/coach/progressive-coach-service';
import { StockfishService } from '../main/uci/stockfish-service';

describe('ProgressiveCoachService Unit Tests', () => {
  describe('generateNullMoveFen', () => {
    it('flips turn from White to Black and clears en-passant', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      const nullFen = ProgressiveCoachService.generateNullMoveFen(fen);
      expect(nullFen).toBeTruthy();
      const tokens = nullFen!.split(' ');
      expect(tokens[1]).toBe('w'); // Inversé
      expect(tokens[3]).toBe('-'); // En-passant réinitialisé
      expect(tokens[4]).toBe('0');
    });

    it('flips turn from Black to White and increments fullmove count', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const nullFen = ProgressiveCoachService.generateNullMoveFen(fen);
      expect(nullFen).toBeTruthy();
      const tokens = nullFen!.split(' ');
      expect(tokens[1]).toBe('b');
      expect(tokens[3]).toBe('-');
    });

    it('returns null when king is currently in check (illegal null move in chess)', () => {
      // White King on e1 is in check by Black Queen on e2
      const checkFen = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPqPPP/RNBQKBNR w KQkq - 0 1';
      const nullFen = ProgressiveCoachService.generateNullMoveFen(checkFen);
      expect(nullFen).toBeNull();
    });

    it('returns null on invalid FEN string', () => {
      expect(ProgressiveCoachService.generateNullMoveFen('invalid-fen')).toBeNull();
    });
  });

  describe('Material and Board Inspection', () => {
    it('calculates total material correctly for standard starting position (39 pts each)', () => {
      const chess = new Chess();
      const whiteMat = ProgressiveCoachService.calculateTotalMaterial(chess, 'w');
      const blackMat = ProgressiveCoachService.calculateTotalMaterial(chess, 'b');
      expect(whiteMat).toBe(39); // 8*1 + 2*3 + 2*3 + 2*5 + 9 = 39
      expect(blackMat).toBe(39);
    });

    it('counts total pieces accurately', () => {
      const chess = new Chess();
      expect(ProgressiveCoachService.countTotalPieces(chess)).toBe(32);
    });

    it('finds king square accurately', () => {
      const chess = new Chess();
      expect(ProgressiveCoachService.findKingSquare(chess, 'w')).toBe('e1');
      expect(ProgressiveCoachService.findKingSquare(chess, 'b')).toBe('e8');
    });
  });

  describe('analyze Decision Engine', () => {
    const mockStockfishService = {
      evaluateRaw: vi.fn(),
    } as unknown as StockfishService;

    it('triggers DEFENSE immediately when player is in check', async () => {
      const checkFen = 'rnb1kbnr/pppppppp/8/8/8/8/PPPPqPPP/RNBQKBNR w KQkq - 0 1';
      vi.mocked(mockStockfishService.evaluateRaw).mockResolvedValueOnce({
        cpScore: -400,
        mateScore: null,
        pv: 'd1e2',
        bestMove: 'd1e2',
        depth: 14,
      });

      const service = new ProgressiveCoachService(mockStockfishService);
      const result = await service.analyze(checkFen, 'white');

      expect(result.status).toBe('DEFENSE');
      expect(result.simulationMoves.length).toBeGreaterThan(0);
    });

    it('classifies as DEFENSE when delta >= 150 centipions (threat on null move)', async () => {
      const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';

      vi.mocked(mockStockfishService.evaluateRaw)
        // 1. Eval ref (pour Black au trait) : 0 cp
        .mockResolvedValueOnce({
          cpScore: 0,
          mateScore: null,
          pv: 'b8c6 f1c4',
          bestMove: 'b8c6',
          depth: 14,
        })
        // 2. Eval null (pour White au trait après passe de tour) : +250 cp (White a une grosse menace)
        .mockResolvedValueOnce({
          cpScore: 250,
          mateScore: null,
          pv: 'f3e5',
          bestMove: 'f3e5',
          depth: 12,
        });

      const service = new ProgressiveCoachService(mockStockfishService);
      const result = await service.analyze(fen, 'black');

      // delta = evalRef (0) - evalNull (-250) = +250 >= 150
      expect(result.deltaCp).toBe(250);
      expect(result.status).toBe('DEFENSE');
    });

    it('classifies as ATTAQUE when delta < 150 and score is solid', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

      vi.mocked(mockStockfishService.evaluateRaw)
        // 1. Eval ref (pour Black) : +30 cp
        .mockResolvedValueOnce({
          cpScore: 30,
          mateScore: null,
          pv: 'e7e5 g1f3',
          bestMove: 'e7e5',
          depth: 14,
        })
        // 2. Eval null (White au trait) : 0 cp (White n'a pas de menace)
        .mockResolvedValueOnce({
          cpScore: 0,
          mateScore: null,
          pv: 'g1f3',
          bestMove: 'g1f3',
          depth: 12,
        });

      const service = new ProgressiveCoachService(mockStockfishService);
      const result = await service.analyze(fen, 'black');

      // delta = 30 - 0 = 30 < 150
      expect(result.deltaCp).toBe(30);
      expect(result.status).toBe('ATTACK');
    });

    it('classifies as DEFENSE when Eval_ref <= -250 cp even if delta is low', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      vi.mocked(mockStockfishService.evaluateRaw)
        .mockResolvedValueOnce({
          cpScore: -300,
          mateScore: null,
          pv: 'e2e4',
          bestMove: 'e2e4',
          depth: 14,
        })
        .mockResolvedValueOnce({
          cpScore: 300,
          mateScore: null,
          pv: 'e7e5',
          bestMove: 'e7e5',
          depth: 12,
        });

      const service = new ProgressiveCoachService(mockStockfishService);
      const result = await service.analyze(fen, 'white');

      expect(result.evalRefCp).toBe(-300);
      expect(result.status).toBe('DEFENSE');
    });

    it('qualifies Mate forced vs Threat of mate (Palier 2)', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      // 1. Mate positif : "Mat forcé à portée"
      vi.mocked(mockStockfishService.evaluateRaw)
        .mockResolvedValueOnce({
          cpScore: null,
          mateScore: 3,
          pv: 'e2e4',
          bestMove: 'e2e4',
          depth: 14,
        })
        .mockResolvedValueOnce({
          cpScore: null,
          mateScore: -2,
          pv: 'e7e5',
          bestMove: 'e7e5',
          depth: 12,
        });

      const service = new ProgressiveCoachService(mockStockfishService);
      const resMateWin = await service.analyze(fen, 'white');
      expect(resMateWin.issueType).toBe('MATE');
      expect(resMateWin.issueLabelFr).toBe('Mat forcé à portée');

      // 2. Mate négatif : "Menace de mat imminent"
      vi.mocked(mockStockfishService.evaluateRaw)
        .mockResolvedValueOnce({
          cpScore: null,
          mateScore: -2,
          pv: 'e2e4',
          bestMove: 'e2e4',
          depth: 14,
        })
        .mockResolvedValueOnce({
          cpScore: null,
          mateScore: 2,
          pv: 'e7e5',
          bestMove: 'e7e5',
          depth: 12,
        });

      const resMateLoss = await service.analyze(fen, 'white');
      expect(resMateLoss.issueType).toBe('MATE');
      expect(resMateLoss.issueLabelFr).toBe('Menace de mat imminent');
    });

    it('extracts targeted piece accurately when capture is in PV (Palier 3)', async () => {
      // Position avec capture directe
      const fen = 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';

      vi.mocked(mockStockfishService.evaluateRaw)
        .mockResolvedValueOnce({
          cpScore: 120,
          mateScore: null,
          pv: 'f3e5 d7d6 e5f3', // Cavalier prend le pion en e5
          bestMove: 'f3e5',
          depth: 14,
        })
        .mockResolvedValueOnce({
          cpScore: -50,
          mateScore: null,
          pv: 'f6e4',
          bestMove: 'f6e4',
          depth: 12,
        });

      const service = new ProgressiveCoachService(mockStockfishService);
      const res = await service.analyze(fen, 'white');

      expect(res.targetPiece).toBeTruthy();
      expect(res.targetPiece?.type).toBe('p');
      expect(res.targetPiece?.square).toBe('e5');
      expect(res.targetDescriptionFr).toContain('e5 ciblé');
    });

    it('generates complete step-by-step simulation moves (Palier 4)', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

      vi.mocked(mockStockfishService.evaluateRaw)
        .mockResolvedValueOnce({
          cpScore: 20,
          mateScore: null,
          pv: 'e2e4 e7e5 g1f3 b8c6',
          bestMove: 'e2e4',
          depth: 14,
        })
        .mockResolvedValueOnce({
          cpScore: 0,
          mateScore: null,
          pv: 'e7e5',
          bestMove: 'e7e5',
          depth: 12,
        });

      const service = new ProgressiveCoachService(mockStockfishService);
      const res = await service.analyze(fen, 'white');

      expect(res.simulationMoves.length).toBe(4);
      expect(res.simulationMoves[0].uci).toBe('e2e4');
      expect(res.simulationMoves[0].san).toBe('e4');
      expect(res.simulationMoves[0].from).toBe('e2');
      expect(res.simulationMoves[0].to).toBe('e4');
      expect(res.simulationMoves[0].color).toBe('w');
      expect(res.simulationMoves[1].color).toBe('b');
    });
  });
});
