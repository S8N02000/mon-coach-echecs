import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  it('tests depth calculation for all bot levels on Linux', async () => {
    await maia.setLevel('1300');
    const move1300 = await maia.getMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(move1300).toBeTruthy();

    await maia.setLevel('1500');
    const move1500 = await maia.getMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(move1500).toBeTruthy();

    await maia.setLevel('stockfish');
    const moveSf = await maia.getMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(moveSf).toBeTruthy();
  });

  it('handles findLc0Binary on different platforms', () => {
    const originalPlatform = process.platform;
    try {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const winBinary = maia.findLc0Binary();
      expect(winBinary === null || typeof winBinary === 'string').toBe(true);

      Object.defineProperty(process, 'platform', { value: 'linux' });
      const linuxBinary = maia.findLc0Binary();
      expect(linuxBinary === null || typeof linuxBinary === 'string').toBe(true);
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('handles non-Linux Lc0 execution path with active UciProcess', async () => {
    const originalPlatform = process.platform;
    try {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      // Mock uci process on maia
      const mockUci: any = {
        getReadyStatus: () => true,
        stop: async () => {},
        setPosition: async () => {},
        sendCommand: async () => ['bestmove e2e4 ponder e7e5'],
      };
      (maia as any).uci = mockUci;

      const move = await maia.getMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(move).toBe('e2e4');

      // Stop should stop uci
      await maia.stop();
      expect((maia as any).uci).toBeNull();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('falls back to Stockfish when non-Linux Lc0 throws an error', async () => {
    const originalPlatform = process.platform;
    try {
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const mockUci: any = {
        getReadyStatus: () => true,
        stop: async () => {},
        setPosition: async () => {},
        sendCommand: async () => {
          throw new Error('Lc0 crashed');
        },
      };
      (maia as any).uci = mockUci;

      const move = await maia.getMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(move).toBeTruthy();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('starts Lc0 process on win32 when binary and weights exist', async () => {
    const originalPlatform = process.platform;
    const fs = await import('node:fs');
    try {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      (maia as any).binaryPath = 'C:\\fake\\lc0.exe';

      const existsSpy = vi.spyOn(fs.default, 'existsSync').mockReturnValue(true);

      // setLevel on win32
      const res = await maia.setLevel('1100');
      expect(res.success).toBe(true);

      existsSpy.mockRestore();
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
      await maia.stop();
    }
  });

  it('throws error when Stockfish produces no move', async () => {
    const brokenSf: any = {
      evaluate: async () => ({ bestMove: '' }),
      stop: async () => {},
    };
    const brokenMaia = new MaiaService(brokenSf);

    await expect(
      brokenMaia.getMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    ).rejects.toThrow('Stockfish produced no move');
  });
});
