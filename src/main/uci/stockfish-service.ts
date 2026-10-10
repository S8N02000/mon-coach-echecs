import path from 'node:path';
import fs from 'node:fs';
import { UciProcess } from './uci-process';
import { EvalResult } from '../../renderer/types/chess';
import { parseUciOutput } from './uci-parser';
import { getResourcesBinDir } from '../utils/paths';

export class StockfishService {
  private uci: UciProcess | null = null;
  private binaryPath: string | null = null;

  constructor() {
    this.binaryPath = this.findBinaryPath();
  }

  public findBinaryPath(): string | null {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'stockfish.exe' : 'stockfish';

    const binDir = getResourcesBinDir();
    const candidates = [
      path.join(binDir, binaryName),
      path.join(process.cwd(), 'resources', 'bin', binaryName),
      isWindows ? 'C:\\stockfish\\stockfish.exe' : '/usr/games/stockfish',
      isWindows ? null : '/usr/bin/stockfish',
    ].filter(Boolean) as string[];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
    return null;
  }

  public async init(): Promise<boolean> {
    if (!this.binaryPath) {
      this.binaryPath = this.findBinaryPath();
    }
    if (!this.binaryPath) {
      console.warn('[StockfishService] Binary not found.');
      return false;
    }

    try {
      this.uci = new UciProcess({
        binaryPath: this.binaryPath,
        name: 'Stockfish',
        timeoutMs: 8000,
      });
      await this.uci.start();
      console.log('[StockfishService] Stockfish initialized successfully with binary:', this.binaryPath);
      return true;
    } catch (err) {
      console.error('[StockfishService] Initialization error:', err);
      return false;
    }
  }

  public async evaluate(fen: string, depth: number = 10): Promise<EvalResult> {
    if (!this.uci || !this.uci.getReadyStatus()) {
      const initialized = await this.init();
      if (!initialized || !this.uci) {
        throw new Error('Stockfish is not available');
      }
    }

    // Set position safely via setPosition (position fen ... -> isready -> readyok)
    await this.uci.setPosition(fen);
    const lines = await this.uci.sendCommand(`go depth ${depth}`, /^bestmove/);
    return parseUciOutput(lines, depth, fen);
  }

  public static parseUciOutput(lines: string[], targetDepth: number, fen?: string): EvalResult {
    return parseUciOutput(lines, targetDepth, fen);
  }

  public async stop(): Promise<void> {
    if (this.uci) {
      await this.uci.stop();
      this.uci = null;
    }
  }

  public isAvailable(): boolean {
    return this.binaryPath !== null && fs.existsSync(this.binaryPath);
  }
}
