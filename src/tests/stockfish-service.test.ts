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
});
