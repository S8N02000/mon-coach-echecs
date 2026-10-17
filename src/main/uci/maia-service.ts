import path from 'node:path';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import { UciProcess } from './uci-process';
import { StockfishService } from './stockfish-service';
import { BotLevel, MaiaDownloadProgress, MaiaModelId, MaiaModelProfile } from '../../renderer/types/chess';
import { getResourcesBinDir, getModelsDir, getAppDataModelsDir } from '../utils/paths';

export const MAIA_PROFILES_METADATA: Record<
  MaiaModelId,
  {
    name: string;
    subName: string;
    badge: string;
    sizeMb: number;
    description: string;
    recommendedFor: string;
    downloadUrl: string;
    fileName: string;
  }
> = {
  '5m': {
    name: 'Maia 3 - Rapide & Éco',
    subName: 'Modèle 5M (Ultra-léger)',
    badge: '⚡ Rapide & Éco',
    sizeMb: 21,
    description: 'Démarrage instantané, consommation minimale. Idéal sur ordinateurs portables et jeu sur batterie.',
    recommendedFor: 'PC portables et ordinateurs sans carte graphique dédiée',
    downloadUrl: 'https://huggingface.co/UofTCSSLab/Maia3-5M/resolve/main/maia3-5m.pt',
    fileName: 'maia3-5m.pt',
  },
  '23m': {
    name: 'Maia 3 - Équilibré',
    subName: 'Modèle 23M (Recommandé)',
    badge: '⚖️ Équilibré',
    sizeMb: 92,
    description: 'Le juste milieu idéal. Excellente intuition tactique humaine avec un calcul très fluide.',
    recommendedFor: 'La plupart des PC récents',
    downloadUrl: 'https://huggingface.co/UofTCSSLab/Maia3-23M/resolve/main/maia3-23m.pt',
    fileName: 'maia3-23m.pt',
  },
  '79m': {
    name: 'Maia 3 - Grand Maître Réaliste',
    subName: 'Modèle 79M (Haute Précision)',
    badge: '🧠 Grand Maître',
    sizeMb: 316,
    description: 'La simulation humaine ultime. Capture toutes les finesses psychologiques et stratégiques des forts joueurs.',
    recommendedFor: 'PC avec carte graphique dédiée (NVIDIA / AMD)',
    downloadUrl: 'https://huggingface.co/UofTCSSLab/Maia3-79M/resolve/main/maia3-79m.pt',
    fileName: 'maia3-79m.pt',
  },
};

export class MaiaService {
  private uci: UciProcess | null = null;
  private currentLevel: BotLevel = '1100';
  private selectedModel: MaiaModelId = '5m';
  private stockfishService: StockfishService;
  private binaryPath: string | null = null; // Lc0 binary
  private maia3Binary: string | null = null; // Maia3-UCI binary
  private weightsDir: string;
  private activeEngineType: 'maia3' | 'lc0' | 'stockfish' = 'stockfish';

  constructor(stockfishService: StockfishService) {
    this.stockfishService = stockfishService;
    this.weightsDir = this.findWeightsDir();
    this.binaryPath = this.findLc0Binary();
    this.maia3Binary = this.findMaia3Binary();

    if (this.maia3Binary) {
      this.activeEngineType = 'maia3';
    } else if (this.binaryPath) {
      this.activeEngineType = 'lc0';
    } else {
      this.activeEngineType = 'stockfish';
    }

    // Démarrage initial au niveau 1100 par défaut
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

  public findMaia3Binary(): string | null {
    const isWindows = process.platform === 'win32';
    const binaryName = isWindows ? 'maia3-uci.exe' : 'maia3-uci';
    const venvPython = isWindows
      ? path.join(process.cwd(), 'resources', 'maia3_env', 'Scripts', 'maia3-uci.exe')
      : path.join(process.cwd(), 'resources', 'maia3_env', 'bin', 'maia3-uci');

    const pythonEmbedWindows = isWindows
      ? [
          path.join(getResourcesBinDir(), 'python_win', 'python.exe'),
          path.join(process.cwd(), 'resources', 'bin', 'python_win', 'python.exe'),
          path.join(getResourcesBinDir(), 'maia3-uci.cmd'),
          path.join(process.cwd(), 'resources', 'bin', 'maia3-uci.cmd'),
        ]
      : [];

    const candidates = [
      venvPython,
      ...pythonEmbedWindows,
      path.join(getResourcesBinDir(), binaryName),
      path.join(process.cwd(), 'resources', 'bin', binaryName),
    ];

    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        return cand;
      }
    }
    return null;
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

  public findCheckpointPath(modelId: MaiaModelId): string | null {
    const fileName = `maia3-${modelId}.pt`;
    // 1. AppData models dir (writable user folder)
    const appData = path.join(getAppDataModelsDir(), fileName);
    if (fs.existsSync(appData)) return appData;

    // 2. Resources models dir (bundled with installer)
    const res = path.join(getModelsDir(), fileName);
    if (fs.existsSync(res)) return res;

    // 3. Local dev models dir
    const dev = path.join(process.cwd(), 'resources', 'models', fileName);
    if (fs.existsSync(dev)) return dev;

    // 4. Hugging Face hub cache
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    if (homeDir) {
      const hfHubDir = path.join(
        homeDir,
        '.cache',
        'huggingface',
        'hub',
        `models--UofTCSSLab--Maia3-${modelId.toUpperCase()}`,
        'snapshots'
      );
      if (fs.existsSync(hfHubDir)) {
        try {
          const snapshots = fs.readdirSync(hfHubDir);
          for (const s of snapshots) {
            const pt = path.join(hfHubDir, s, fileName);
            if (fs.existsSync(pt)) return pt;
          }
        } catch {}
      }
    }
    return null;
  }

  public getSelectedModel(): MaiaModelId {
    return this.selectedModel;
  }

  public async setSelectedModel(modelId: MaiaModelId): Promise<{ success: boolean; error?: string }> {
    this.selectedModel = modelId;
    if (this.currentLevel !== 'stockfish') {
      // Reconfigurer ou redémarrer le processus Maia avec le nouveau profil
      await this.setLevel(this.currentLevel);
    }
    return { success: true };
  }

  public async downloadModel(
    modelId: MaiaModelId,
    onProgress?: (progress: MaiaDownloadProgress) => void
  ): Promise<{ success: boolean; error?: string }> {
    const profile = MAIA_PROFILES_METADATA[modelId];
    if (!profile) {
      return { success: false, error: `Modèle inconnu : ${modelId}` };
    }

    const targetDir = getAppDataModelsDir();
    const finalPath = path.join(targetDir, profile.fileName);
    const tempPath = `${finalPath}.tmp`;

    if (fs.existsSync(finalPath)) {
      if (onProgress) {
        onProgress({
          model: modelId,
          progress: 100,
          downloadedMb: profile.sizeMb,
          totalMb: profile.sizeMb,
          status: 'completed',
        });
      }
      return { success: true };
    }

    return new Promise((resolve) => {
      const downloadStream = (url: string, redirectCount = 0) => {
        if (redirectCount > 5) {
          resolve({ success: false, error: 'Trop de redirections HTTP' });
          return;
        }

        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, { headers: { 'User-Agent': 'MonCoachEchecs/1.0' } }, (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            downloadStream(res.headers.location, redirectCount + 1);
            return;
          }

          if (res.statusCode !== 200) {
            resolve({ success: false, error: `Erreur HTTP ${res.statusCode}` });
            return;
          }

          const totalBytes = parseInt(res.headers['content-length'] || '0', 10) || profile.sizeMb * 1024 * 1024;
          let downloadedBytes = 0;
          let lastEmitTime = 0;

          const fileStream = fs.createWriteStream(tempPath);

          res.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            const now = Date.now();
            if (now - lastEmitTime > 150 && onProgress) {
              lastEmitTime = now;
              const progress = Math.min(100, Math.round((downloadedBytes / totalBytes) * 100));
              onProgress({
                model: modelId,
                progress,
                downloadedMb: Math.round((downloadedBytes / (1024 * 1024)) * 10) / 10,
                totalMb: Math.round((totalBytes / (1024 * 1024)) * 10) / 10,
                status: 'downloading',
              });
            }
          });

          res.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(async () => {
              try {
                if (fs.existsSync(finalPath)) {
                  fs.unlinkSync(finalPath);
                }
                fs.renameSync(tempPath, finalPath);
                if (onProgress) {
                  onProgress({
                    model: modelId,
                    progress: 100,
                    downloadedMb: profile.sizeMb,
                    totalMb: profile.sizeMb,
                    status: 'completed',
                  });
                }
                // Si c'est le modèle actuellement sélectionné, recharger le moteur
                if (this.selectedModel === modelId && this.currentLevel !== 'stockfish') {
                  await this.setLevel(this.currentLevel);
                }
                resolve({ success: true });
              } catch (err: any) {
                resolve({ success: false, error: err.message });
              }
            });
          });

          fileStream.on('error', (err) => {
            try {
              if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            } catch {}
            resolve({ success: false, error: err.message });
          });
        });

        req.on('error', (err) => {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          } catch {}
          resolve({ success: false, error: err.message });
        });
      };

      downloadStream(profile.downloadUrl);
    });
  }

  public getMaia3Info(gpuTotalVramGb?: number) {
    const recommendedModel: MaiaModelId =
      gpuTotalVramGb && gpuTotalVramGb >= 5 ? '79m' : gpuTotalVramGb && gpuTotalVramGb >= 2 ? '23m' : '5m';

    const profiles: MaiaModelProfile[] = (['5m', '23m', '79m'] as const).map((id) => {
      const meta = MAIA_PROFILES_METADATA[id];
      const checkpoint = this.findCheckpointPath(id);
      return {
        id,
        name: meta.name,
        subName: meta.subName,
        badge: meta.badge,
        sizeMb: meta.sizeMb,
        description: meta.description,
        recommendedFor: meta.recommendedFor,
        isDownloaded: Boolean(checkpoint),
        isActive: this.selectedModel === id,
        isRecommended: recommendedModel === id,
      };
    });

    return {
      available: this.maia3Binary !== null && fs.existsSync(this.maia3Binary),
      activeModel: this.selectedModel,
      recommendedModel,
      profiles,
    };
  }

  public async setLevel(level: BotLevel): Promise<{ success: boolean }> {
    this.currentLevel = level;

    // En mode Stockfish explicite : on utilise Stockfish directement
    if (level === 'stockfish') {
      if (this.uci) {
        await this.uci.stop();
        this.uci = null;
      }
      return { success: true };
    }

    // 1. Priorité à Maia 3 (Chessformer avec sélection dynamique d'Elo et du profil actif)
    if (this.maia3Binary && fs.existsSync(this.maia3Binary)) {
      try {
        const eloNum = parseInt(level, 10) || 1500;

        // Si le processus Maia 3 est déjà actif et prêt, réutilisation instantanée en changeant l'Elo UCI
        if (this.uci && this.activeEngineType === 'maia3' && this.uci.getReadyStatus()) {
          this.uci.writeLine(`setoption name Elo value ${eloNum}`);
          this.uci.writeLine(`setoption name SelfElo value ${eloNum}`);
          this.uci.writeLine(`setoption name OppoElo value ${eloNum}`);
          console.log(`[MaiaService] Successfully reconfigured Maia 3 (${this.selectedModel}) with Elo ${eloNum}`);
          return { success: true };
        }

        const checkpoint = this.findCheckpointPath(this.selectedModel);
        const isPythonBinary = this.maia3Binary.toLowerCase().endsWith('python.exe');
        const prefixArgs = isPythonBinary ? ['-m', 'maia3.uci'] : [];

        const args = [
          ...prefixArgs,
          '--model',
          this.selectedModel,
          '--temperature',
          '0.2',
          '--device',
          'cuda',
        ];
        if (checkpoint) {
          args.push('--checkpoint', checkpoint);
        } else {
          args.push('--local-files-only');
        }

        if (this.uci) await this.uci.stop();

        try {
          this.uci = new UciProcess({
            binaryPath: this.maia3Binary,
            args,
            name: `Maia3-${this.selectedModel}`,
            timeoutMs: 12000,
          });
          await this.uci.start();
          this.activeEngineType = 'maia3';
        } catch (cudaErr) {
          console.warn('[MaiaService] CUDA start failed, falling back to CPU:', cudaErr);
          const cpuArgs = args.filter((a) => a !== 'cuda').concat('cpu');
          this.uci = new UciProcess({
            binaryPath: this.maia3Binary,
            args: cpuArgs,
            name: `Maia3-${this.selectedModel}-CPU`,
            timeoutMs: 15000,
          });
          await this.uci.start();
          this.activeEngineType = 'maia3';
        }

        // Configuration de l'Elo humain cible
        this.uci.writeLine(`setoption name Elo value ${eloNum}`);
        this.uci.writeLine(`setoption name SelfElo value ${eloNum}`);
        this.uci.writeLine(`setoption name OppoElo value ${eloNum}`);
        console.log(`[MaiaService] Successfully configured Maia 3 (${this.selectedModel}) with Elo ${eloNum}`);
        return { success: true };
      } catch (err) {
        console.warn('[MaiaService] Maia 3 failed, attempting fallback to Lc0:', err);
        if (this.uci) await this.uci.stop();
        this.uci = null;
      }
    }

    // 2. Fallback vers Lc0 avec réseaux neuronaux Maia 1 (1100, 1300, 1500, 1700, 1900)
    if (this.binaryPath && fs.existsSync(this.binaryPath)) {
      let weightLevel = level;
      if (level === '2100') weightLevel = '1900'; // Poids le plus fort pour Lc0

      const weightFile = path.join(this.weightsDir, `maia-${weightLevel}.pb.gz`);
      if (fs.existsSync(weightFile)) {
        if (this.uci) {
          await this.uci.stop();
        }
        try {
          this.uci = new UciProcess({
            binaryPath: this.binaryPath,
            args: [`--weights=${weightFile}`, '--backend=eigen'],
            name: `Lc0-Maia-${weightLevel}`,
            timeoutMs: 8000,
          });
          await this.uci.start();
          this.activeEngineType = 'lc0';
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
    // 1. Si mode Stockfish explicite : calcul direct ultra-rapide par Stockfish
    if (this.currentLevel === 'stockfish') {
      const res = await this.stockfishService.evaluate(fen, 14);
      if (res.bestMove) {
        console.log(`[MaiaService] Coup joué par Stockfish Grand Maître (depth 14) : ${res.bestMove}`);
        return res.bestMove;
      }
      throw new Error('Stockfish produced no move');
    }

    // 2. S'assurer que le moteur neuronal (Maia 3 ou Lc0) est démarré et prêt
    if (!this.uci || !this.uci.getReadyStatus()) {
      await this.setLevel(this.currentLevel);
    }

    if (this.uci && this.uci.getReadyStatus()) {
      try {
        await this.uci.setPosition(fen);
        const command = this.activeEngineType === 'maia3' ? 'go' : 'go nodes 1';
        const lines = await this.uci.sendCommand(command, /^bestmove/, 6000);
        for (const line of lines) {
          if (line.startsWith('bestmove')) {
            const parts = line.split(' ');
            if (parts[1] && parts[1] !== '0000') {
              console.log(
                `[MaiaService] Coup joué par ${this.activeEngineType.toUpperCase()} (${this.selectedModel}) Elo ${this.currentLevel} : ${parts[1]}`
              );
              return parts[1];
            }
          }
        }
      } catch (err) {
        console.warn(`[MaiaService] ${this.activeEngineType} error during search, falling back:`, err);
      }
    }

    // 3. Fallback: Stockfish calibré si aucun moteur neuronal n'a pu répondre
    console.warn(`[MaiaService] Repli sur Stockfish calibré pour le niveau ${this.currentLevel}`);
    const depthMap: Record<string, number> = {
      '1100': 4,
      '1300': 6,
      '1500': 8,
      '1700': 10,
      '1900': 12,
      '2100': 14,
      'stockfish': 16,
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
      engineType: this.activeEngineType,
      selectedModel: this.selectedModel,
      maia3Available: this.maia3Binary !== null && fs.existsSync(this.maia3Binary),
      lc0Available: this.binaryPath !== null && fs.existsSync(this.binaryPath),
      isUciReady: this.uci !== null && this.uci.getReadyStatus(),
      weights: {
        '1100': fs.existsSync(path.join(this.weightsDir, 'maia-1100.pb.gz')),
        '1200': fs.existsSync(path.join(this.weightsDir, 'maia-1200.pb.gz')),
        '1300': fs.existsSync(path.join(this.weightsDir, 'maia-1300.pb.gz')),
        '1400': fs.existsSync(path.join(this.weightsDir, 'maia-1400.pb.gz')),
        '1500': fs.existsSync(path.join(this.weightsDir, 'maia-1500.pb.gz')),
        '1600': fs.existsSync(path.join(this.weightsDir, 'maia-1600.pb.gz')),
        '1700': fs.existsSync(path.join(this.weightsDir, 'maia-1700.pb.gz')),
        '1800': fs.existsSync(path.join(this.weightsDir, 'maia-1800.pb.gz')),
        '1900': fs.existsSync(path.join(this.weightsDir, 'maia-1900.pb.gz')),
      },
    };
  }
}
