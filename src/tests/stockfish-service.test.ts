import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StockfishService } from '../main/uci/stockfish-service';

describe('StockfishService Full Coverage', () => {
  let stockfish: StockfishService;

  beforeEach(() => {
    stockfish = new StockfishService();
  });

  afterEach(async () => {
    await stockfish.stop();
  });

  it('checks binary availability and initializes engine', async () => {
    const isAvail = stockfish.isAvailable();
    expect(isAvail).toBe(true);

    await stockfish.init();
    expect(stockfish.isAvailable()).toBe(true);
  });

  it('evaluates starting position with default and custom depths', async () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const eval8 = await stockfish.evaluate(startFen, 8);
    expect(eval8).toHaveProperty('score');
    expect(eval8).toHaveProperty('numericScore');
    expect(eval8).toHaveProperty('bestMove');
    expect(eval8.depth).toBeGreaterThanOrEqual(8);
  });

  it('evaluates tactical blunders and captures', async () => {
    // Scholar's mate position (White delivers mate on f7)
    // 1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7#
    const mateFen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
    const evalMate = await stockfish.evaluate(mateFen, 6);
    expect(evalMate.score).toContain('M');
  });

  it('gracefully handles stop when called multiple times', async () => {
    await stockfish.init();
    await stockfish.stop();
    await stockfish.stop();
    expect(true).toBe(true);
  });

  it('evaluates raw UCI output using evaluateRaw', async () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const rawEval = await stockfish.evaluateRaw(startFen, 6);
    expect(rawEval).toHaveProperty('bestMove');
    expect(rawEval).toHaveProperty('depth');
    expect(typeof rawEval.depth).toBe('number');
  });

  it('delegates static parseUciOutput to parser', () => {
    const lines = [
      'info depth 10 score cp 50 pv e2e4',
      'bestmove e2e4',
    ];
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const res = StockfishService.parseUciOutput(lines, 10, fen);
    expect(res.bestMove).toBe('e2e4');
    expect(res.numericScore).toBeCloseTo(0.5, 2);
  });

  it('handles missing binary gracefully and rejects evaluate', async () => {
    const brokenSf = new StockfishService('Broken-SF');
    (brokenSf as any).binaryPath = null;
    (brokenSf as any).findBinaryPath = () => null;

    expect(brokenSf.isAvailable()).toBe(false);
    const ready = await brokenSf.init();
    expect(ready).toBe(false);

    await expect(
      brokenSf.evaluate('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1)
    ).rejects.toThrow('Stockfish is not available');

    await expect(
      brokenSf.evaluateRaw('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 1)
    ).rejects.toThrow('Stockfish is not available');
  });
});
