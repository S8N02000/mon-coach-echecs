import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MaiaService } from '../main/uci/maia-service';
import { StockfishService } from '../main/uci/stockfish-service';

describe('MaiaService Full Coverage', () => {
  let stockfish: StockfishService;
  let maia: MaiaService;

  beforeEach(() => {
    stockfish = new StockfishService();
    maia = new MaiaService(stockfish);
  });

  afterEach(async () => {
    await maia.stop();
    await stockfish.stop();
  });

  it('reports correct status structure and weights list', () => {
    const status = maia.getStatus();
    expect(status).toHaveProperty('currentLevel');
    expect(status).toHaveProperty('lc0Available');
    expect(status).toHaveProperty('weights');
    expect(status.weights).toHaveProperty('1100');
    expect(status.weights).toHaveProperty('1300');
    expect(status.weights).toHaveProperty('1500');
  });

  it('switches between all Maia levels and Stockfish master', async () => {
    const res1100 = await maia.setLevel('1100');
    expect(res1100.success).toBe(true);
    expect(maia.getStatus().currentLevel).toBe('1100');

    const res1300 = await maia.setLevel('1300');
    expect(res1300.success).toBe(true);
    expect(maia.getStatus().currentLevel).toBe('1300');

    const res1500 = await maia.setLevel('1500');
    expect(res1500.success).toBe(true);
    expect(maia.getStatus().currentLevel).toBe('1500');

    const resSf = await maia.setLevel('stockfish');
    expect(resSf.success).toBe(true);
    expect(maia.getStatus().currentLevel).toBe('stockfish');
  });

  it('generates moves in both White and Black positions', async () => {
    await maia.setLevel('1100');
    // Start position (White to move)
    const moveWhite = await maia.getMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(typeof moveWhite).toBe('string');
    expect(moveWhite.length).toBeGreaterThanOrEqual(4);

    // After 1. e4 (Black to move)
    const moveBlack = await maia.getMove('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
    expect(typeof moveBlack).toBe('string');
    expect(moveBlack.length).toBeGreaterThanOrEqual(4);
  });
});
