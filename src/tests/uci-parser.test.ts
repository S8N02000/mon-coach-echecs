import { describe, it, expect } from 'vitest';
import { parseUciOutput } from '../main/uci/uci-parser';

describe('UCI Parser (Stockfish Output)', () => {
  it('parses centipawn score and bestmove correctly for White turn', () => {
    const lines = [
      'info depth 10 seldepth 12 score cp 85 nodes 15200 nps 600000 tbhits 0 time 25 pv e2e4 e7e5 g1f3',
      'bestmove e2e4 ponder e7e5',
    ];
    // FEN with White to move ('w')
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = parseUciOutput(lines, 10, fen);

    expect(result.bestMove).toBe('e2e4');
    expect(result.score).toBe('+0.85');
    expect(result.numericScore).toBeCloseTo(0.85, 2);
    expect(result.refutationLineUci).toBe('e2e4 e7e5 g1f3');
    expect(result.depth).toBe(10);
  });

  it('parses centipawn score correctly for Black turn', () => {
    const lines = [
      'info depth 12 score cp 120 pv d7d5 d2d4',
      'bestmove d7d5',
    ];
    // FEN with Black to move ('b')
    const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
    const result = parseUciOutput(lines, 12, fen);

    expect(result.bestMove).toBe('d7d5');
    // In Stockfish, cp 120 for Black means Black is ahead (+1.20 for Black, so -1.20 from White perspective)
    expect(result.numericScore).toBeCloseTo(-1.20, 2);
  });

  it('parses mate score correctly (clamped to max +10 for eval bar)', () => {
    const lines = [
      'info depth 8 score mate 2 pv f7f8q e8f8',
      'bestmove f7f8q',
    ];
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = parseUciOutput(lines, 8, fen);

    expect(result.bestMove).toBe('f7f8q');
    expect(result.score).toBe('+M2');
    expect(result.numericScore).toBe(10);
  });

  it('parses negative mate score correctly (clamped to min -10 for eval bar)', () => {
    const lines = [
      'info depth 6 score mate -1 pv d8h4',
      'bestmove g2g4',
    ];
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const result = parseUciOutput(lines, 6, fen);

    expect(result.score).toBe('-M1');
    expect(result.numericScore).toBe(-10);
  });

  it('parses mate 0 correctly when Black is checkmated (White wins)', () => {
    const lines = [
      'info depth 0 score mate 0',
      'bestmove (none)',
    ];
    // Black is to move and checkmated ('b')
    const fen = 'r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
    const result = parseUciOutput(lines, 10, fen);

    expect(result.bestMove).toBe('');
    expect(result.score).toBe('+M0');
    expect(result.numericScore).toBe(10);
  });

  it('parses mate 0 correctly when White is checkmated (Black wins)', () => {
    const lines = [
      'info depth 0 score mate 0',
      'bestmove (none)',
    ];
    // White is to move and checkmated ('w')
    const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
    const result = parseUciOutput(lines, 10, fen);

    expect(result.bestMove).toBe('');
    expect(result.score).toBe('-M0');
    expect(result.numericScore).toBe(-10);
  });

  it('parses mate correctly when Black has mate in 1 on Black turn', () => {
    const lines = [
      'info depth 6 score mate 1 pv d8h4',
      'bestmove d8h4',
    ];
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2';
    const result = parseUciOutput(lines, 6, fen);

    // Black is winning, so from White's perspective score is -M1 and -10
    expect(result.score).toBe('-M1');
    expect(result.numericScore).toBe(-10);
  });

  it('parses mate correctly when White has forced mate on Black turn (mate -1)', () => {
    const lines = [
      'info depth 6 score mate -1 pv e8e7 f7f8q',
      'bestmove e8e7',
    ];
    const fen = 'rnbqkbnr/pppp1Qpp/8/4p3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 2';
    const result = parseUciOutput(lines, 6, fen);

    // Black is losing, so from White's perspective score is +M1 and +10
    expect(result.score).toBe('+M1');
    expect(result.numericScore).toBe(10);
  });

  describe('parseRawUciOutput', () => {
    it('parses raw UCI output with bestmove and centipawn score', async () => {
      const { parseRawUciOutput } = await import('../main/uci/uci-parser');
      const lines = [
        'info depth 14 seldepth 16 score cp 45 nodes 100000 nps 1500000 pv e2e4 e7e5 g1f3 b8c6',
        'bestmove e2e4 ponder e7e5',
      ];
      const result = parseRawUciOutput(lines);

      expect(result.bestMove).toBe('e2e4');
      expect(result.cpScore).toBe(45);
      expect(result.mateScore).toBeNull();
      expect(result.pv).toBe('e2e4 e7e5 g1f3 b8c6');
      expect(result.depth).toBe(14);
    });

    it('parses raw UCI output with mate score', async () => {
      const { parseRawUciOutput } = await import('../main/uci/uci-parser');
      const lines = [
        'info depth 8 score mate 3 pv f7f8q e8f8',
        'bestmove f7f8q',
      ];
      const result = parseRawUciOutput(lines);

      expect(result.bestMove).toBe('f7f8q');
      expect(result.cpScore).toBeNull();
      expect(result.mateScore).toBe(3);
      expect(result.depth).toBe(8);
      expect(result.pv).toBe('f7f8q e8f8');
    });

    it('handles bestmove (none)', async () => {
      const { parseRawUciOutput } = await import('../main/uci/uci-parser');
      const lines = [
        'info depth 0 score mate 0',
        'bestmove (none)',
      ];
      const result = parseRawUciOutput(lines);

      expect(result.bestMove).toBe('');
      expect(result.mateScore).toBe(0);
      expect(result.cpScore).toBeNull();
    });

    it('handles lines without depth, score or pv', async () => {
      const { parseRawUciOutput } = await import('../main/uci/uci-parser');
      const lines = [
        'Stockfish 16 by the Stockfish developers',
        'info string NNUE evaluation enabled',
      ];
      const result = parseRawUciOutput(lines);

      expect(result.bestMove).toBe('');
      expect(result.cpScore).toBeNull();
      expect(result.mateScore).toBeNull();
      expect(result.pv).toBe('');
      expect(result.depth).toBe(0);
    });
  });
});
