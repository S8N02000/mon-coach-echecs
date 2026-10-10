import path from 'node:path';
import fs from 'node:fs';
import { UciProcess } from './uci-process';
import { EvalResult } from '../../renderer/types/chess';
import { parseUciOutput, parseRawUciOutput, RawUciEval } from './uci-parser';
import { getResourcesBinDir } from '../utils/paths';

export class StockfishService {
  private uci: UciProcess | null = null;
  private binaryPath: string | null = null;
  private name: string;
  private queueMutex: Promise<any> = Promise.resolve();

  constructor(name: string = 'Stockfish') {
    this.name = name;
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
      console.warn(`[${this.name}] Binary not found.`);
      return false;
    }

    try {
      this.uci = new UciProcess({
        binaryPath: this.binaryPath,
        name: this.name,
        timeoutMs: 8000,
      });
      await this.uci.start();
      console.log(`[${this.name}] Initialized successfully with binary:`, this.binaryPath);
      return true;
    } catch (err) {
      console.error(`[${this.name}] Initialization error:`, err);
      return false;
    }
  }

  private async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queueMutex.then(task, task);
    this.queueMutex = next.catch(() => {});
    return next;
  }

  public async evaluate(fen: string, depth: number = 10): Promise<EvalResult> {
    return this.enqueue(async () => {
      if (!this.uci || !this.uci.getReadyStatus()) {
        const initialized = await this.init();
        if (!initialized || !this.uci) {
          throw new Error('Stockfish is not available');
        }
      }

      await this.uci.setPosition(fen);
      const lines = await this.uci.sendCommand(`go depth ${depth}`, /^bestmove/);
      return parseUciOutput(lines, depth, fen);
    });
  }

  public async evaluateRaw(fen: string, depth: number = 14) {
    return this.enqueue(async () => {
      if (!this.uci || !this.uci.getReadyStatus()) {
        const initialized = await this.init();
        if (!initialized || !this.uci) {
          throw new Error('Stockfish is not available');
        }
      }

      await this.uci.setPosition(fen);
      const lines = await this.uci.sendCommand(`go depth ${depth}`, /^bestmove/);
      return parseRawUciOutput(lines);
    });
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
