import path from 'node:path';
import fs from 'node:fs';
import { UciProcess } from './uci-process';
import { StockfishService } from './stockfish-service';
import { BotLevel } from '../../renderer/types/chess';
import { getResourcesBinDir } from '../utils/paths';

export class MaiaService {
  private uci: UciProcess | null = null;
  private currentLevel: BotLevel = '1100';
  private stockfishService: StockfishService;
  private binaryPath: string | null = null;
  private weightsDir: string;

  constructor(stockfishService: StockfishService) {
    this.stockfishService = stockfishService;
    this.weightsDir = this.findWeightsDir();
    this.binaryPath = this.findLc0Binary();
    // Démarrage initial de Maia au niveau 1100 par défaut
    this.setLevel('1100').catch((err) => {
      console.warn('[MaiaService] Error during initial setLevel:', err);
    });
  }

  private findWeightsDir(): string {
    const binDir = getResourcesBinDir();
    const candidates = [
      path.join(binDir, 'weights'),
      path.join(process.cwd(), 'resources', 'bin', 'weights'),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
    return path.join(process.cwd(), 'resources', 'bin', 'weights');
  }

  public findLc0Binary(): string | null {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'lc0.exe' : 'lc0';

    const binDir = getResourcesBinDir();
    const candidates = [
      path.join(binDir, binaryName),
      path.join(process.cwd(), 'resources', 'bin', binaryName),
      isWindows ? null : '/usr/games/lc0',
      isWindows ? null : '/usr/bin/lc0',
    ].filter(Boolean) as string[];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
    return null;
  }

  public async setLevel(level: BotLevel): Promise<{ success: boolean }> {
    this.currentLevel = level;
    if (level === 'stockfish') {
      if (this.uci) {
        await this.uci.stop();
        this.uci = null;
      }
      return { success: true };
    }

    if (this.binaryPath && fs.existsSync(this.binaryPath)) {
      const weightFile = path.join(this.weightsDir, `maia-${level}.pb.gz`);
      if (fs.existsSync(weightFile)) {
        // Restart Lc0 with new weights and eigen CPU backend (zero VRAM conflict with Ollama)
        if (this.uci) {
          await this.uci.stop();
        }
        try {
          this.uci = new UciProcess({
            binaryPath: this.binaryPath,
            args: [`--weights=${weightFile}`, '--backend=eigen'],
            name: `Lc0-Maia-${level}`,
            timeoutMs: 6000,
          });
          await this.uci.start();
          console.log(`[MaiaService] Successfully started Maia ${level} (Lc0 with ${weightFile})`);
          return { success: true };
        } catch (err) {
          console.warn('[MaiaService] Could not launch Lc0, falling back to calibrated Stockfish:', err);
          this.uci = null;
        }
      }
    }
    return { success: true };
  }

  public async getMove(fen: string): Promise<string> {
    // 1. Stockfish master level
    if (this.currentLevel === 'stockfish') {
      const res = await this.stockfishService.evaluate(fen, 14);
      if (res.bestMove) return res.bestMove;
      throw new Error('Stockfish produced no move');
    }

    // 2. Maia Lc0 mode : s'assurer que le processus est démarré
    if (!this.uci || !this.uci.getReadyStatus()) {
      await this.setLevel(this.currentLevel);
    }

    if (this.uci && this.uci.getReadyStatus()) {
      try {
        await this.uci.setPosition(fen);
        // Dans Maia, le coup humain instinctif est calculé avec "go nodes 1"
        const lines = await this.uci.sendCommand('go nodes 1', /^bestmove/, 4000);
        for (const line of lines) {
          if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            if (parts[1]) {
              console.log(`[MaiaService] Coup joué par le vrai réseau Maia ${this.currentLevel} (Lc0) : ${parts[1]}`);
              return parts[1];
            }
          }
        }
      } catch (err) {
        console.warn('[MaiaService] Lc0 error during go nodes 1, falling back:', err);
      }
    }

    // 3. Fallback: Calibrated Stockfish depth simulation si Lc0 indisponible
    console.warn(`[MaiaService] Attention : repli sur Stockfish pour le niveau ${this.currentLevel}`);
    const depthMap: Record<string, number> = {
      '1100': 4,
      '1300': 8,
      '1500': 11,
    };
    const depth = depthMap[this.currentLevel] || 8;
    const evalRes = await this.stockfishService.evaluate(fen, depth);
    if (evalRes.bestMove) return evalRes.bestMove;

    throw new Error('No bot move could be generated');
  }

  public async stop(): Promise<void> {
    if (this.uci) {
      await this.uci.stop();
      this.uci = null;
    }
  }

  public getStatus() {
    return {
      currentLevel: this.currentLevel,
      lc0Available: this.binaryPath !== null && fs.existsSync(this.binaryPath),
      isUciReady: this.uci !== null && this.uci.getReadyStatus(),
      weights: {
        '1100': fs.existsSync(path.join(this.weightsDir, 'maia-1100.pb.gz')),
        '1300': fs.existsSync(path.join(this.weightsDir, 'maia-1300.pb.gz')),
        '1500': fs.existsSync(path.join(this.weightsDir, 'maia-1500.pb.gz')),
      },
    };
  }
}
