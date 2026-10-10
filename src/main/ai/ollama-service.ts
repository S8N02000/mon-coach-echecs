import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import { CoachPayload, GpuInfo, ModelInfo } from '../../renderer/types/chess';
import { PromptBuilder } from './prompt-builder';

export class OllamaService {
  private host = '127.0.0.1';
  private port = 11434;
  private selectedModel = 'deepseek-r1:8b';
  private availableModels: string[] = [];
  private installedDetails: ModelInfo[] = [];
  private cachedGpuInfo: GpuInfo | null = null;

  constructor() {
    this.refreshModels().catch(() => {});
  }

  public getSelectedModel(): string {
    return this.selectedModel;
  }

  public setSelectedModel(model: string): void {
    this.selectedModel = model;
  }

  public getAvailableModels(): string[] {
    return this.availableModels;
  }

  public getInstalledDetails(): ModelInfo[] {
    return this.installedDetails;
  }

  public getGpuInfo(): GpuInfo {
    if (this.cachedGpuInfo) {
      return this.cachedGpuInfo;
    }

    try {
      // Query nvidia-smi for dedicated GPU details
      const output = execSync(
        'nvidia-smi --query-gpu=gpu_name,memory.total,memory.free --format=csv,noheader,nounits',
        { timeout: 2000, encoding: 'utf-8' }
      ).trim();

      const parts = output.split(',').map((s) => s.trim());
      if (parts.length >= 3) {
        const name = parts[0];
        const totalMb = parseFloat(parts[1]) || 0;
        const freeMb = parseFloat(parts[2]) || 0;

        this.cachedGpuInfo = {
          name,
          totalVramGb: Math.round((totalMb / 1024) * 10) / 10,
          freeVramGb: Math.round((freeMb / 1024) * 10) / 10,
          hasDedicatedGpu: true,
        };
        return this.cachedGpuInfo;
      }
    } catch (_) {
      // Fallback if no nvidia-smi
    }

    this.cachedGpuInfo = {
      name: 'GPU Partagé / Processeur (CPU)',
      totalVramGb: 0,
      freeVramGb: 0,
      hasDedicatedGpu: false,
    };
    return this.cachedGpuInfo;
  }

  public getRecommendedCatalog(totalVramGb: number): ModelInfo[] {
    const catalog = [
      {
        name: 'deepseek-r1:14b',
        displayName: 'DeepSeek-R1 14B',
        sizeFormatted: '~9.0 Go',
        parameterSize: '14.8B',
        isInstalled: this.availableModels.some((m) => m.includes('14b')),
        isRecommended: totalVramGb >= 10,
        minVramGb: 9.0,
        fitsVram: totalVramGb >= 9.0,
        badge: 'Explications Maître (Grand modèle de raisonnement)',
      },
      {
        name: 'deepseek-r1:8b',
        displayName: 'DeepSeek-R1 8B',
        sizeFormatted: '5.2 Go',
        parameterSize: '8.2B',
        isInstalled: this.availableModels.some((m) => m.includes('8b')),
        isRecommended: totalVramGb >= 6 && totalVramGb < 14,
        minVramGb: 5.5,
        fitsVram: totalVramGb >= 5.5 || totalVramGb === 0,
        badge: 'Idéal & Réactif (Recommandé pour RTX 4070 Ti / 8-12 Go)',
      },
      {
        name: 'deepseek-r1:7b',
        displayName: 'DeepSeek-R1 7B',
        sizeFormatted: '4.7 Go',
        parameterSize: '7.6B',
        isInstalled: this.availableModels.some((m) => m.includes('7b')),
        isRecommended: totalVramGb >= 6 && totalVramGb < 10,
        minVramGb: 5.0,
        fitsVram: totalVramGb >= 5.0 || totalVramGb === 0,
        badge: 'Compact & Fluide (Rapide pour 6-8 Go VRAM)',
      },
      {
        name: 'deepseek-r1:1.5b',
        displayName: 'DeepSeek-R1 1.5B',
        sizeFormatted: '1.1 Go',
        parameterSize: '1.8B',
        isInstalled: this.availableModels.some((m) => m.includes('1.5b')),
        isRecommended: totalVramGb < 6,
        minVramGb: 1.5,
        fitsVram: true,
        badge: 'Ultra-Léger (Idéal PC portable ou sans carte dédiée)',
      },
    ];

    return catalog;
  }

  public async isOnline(): Promise<boolean> {
    try {
      await this.refreshModels();
      return true;
    } catch {
      return false;
    }
  }

  public async ensureOllamaRunning(): Promise<boolean> {
    const online = await this.isOnline();
    if (online) return true;

    try {
      const proc = spawn('ollama', ['serve'], {
        detached: true,
        stdio: 'ignore',
      });
      proc.unref();

      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 400));
        if (await this.isOnline()) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  public async refreshModels(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          host: this.host,
          port: this.port,
          path: '/api/tags',
          method: 'GET',
          timeout: 2500,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            if (res.statusCode === 200) {
              try {
                const parsed = JSON.parse(data);
                const rawList = parsed.models || [];
                const gpu = this.getGpuInfo();

                this.availableModels = rawList.map((m: any) => m.name || m.model);

                this.installedDetails = rawList.map((m: any) => {
                  const sizeGb = m.size ? Math.round((m.size / (1024 * 1024 * 1024)) * 10) / 10 : 0;
                  const name = m.name || m.model;
                  const param = m.details?.parameter_size || '';
                  return {
                    name,
                    displayName: name.toUpperCase(),
                    sizeFormatted: `${sizeGb} Go`,
                    parameterSize: param,
                    isInstalled: true,
                    isRecommended: name.includes('deepseek-r1'),
                    minVramGb: sizeGb * 1.1,
                    fitsVram: gpu.totalVramGb >= sizeGb * 1.1 || gpu.totalVramGb === 0,
                    badge: name.includes('deepseek-r1') ? 'Modèle de raisonnement' : 'Modèle général',
                  };
                });

                // Sélection par défaut :
                // 1. Si deepseek-r1:14b est installé et qu'on a >= 10 Go
                // 2. Sinon deepseek-r1:8b (actuellement présent !)
                // 3. Sinon deepseek-r1:7b
                // 4. Sinon premier modèle
                if (!this.availableModels.includes(this.selectedModel)) {
                  const has14b = this.availableModels.find((m) => m.includes('14b'));
                  const has8b = this.availableModels.find((m) => m.includes('8b'));
                  const has7b = this.availableModels.find((m) => m.includes('7b'));
                  const anyDeepSeek = this.availableModels.find((m) => m.includes('deepseek'));

                  if (has14b && gpu.totalVramGb >= 10) {
                    this.selectedModel = has14b;
                  } else if (has8b) {
                    this.selectedModel = has8b;
                  } else if (has7b) {
                    this.selectedModel = has7b;
                  } else if (anyDeepSeek) {
                    this.selectedModel = anyDeepSeek;
                  } else if (this.availableModels.length > 0) {
                    this.selectedModel = this.availableModels[0];
                  }
                }

                resolve(this.availableModels);
              } catch (err) {
                reject(err);
              }
            } else {
              reject(new Error(`Ollama returned status ${res.statusCode}`));
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Ollama request timed out'));
      });
      req.on('error', reject);
      req.end();
    });
  }

  public async askCoach(payload: CoachPayload): Promise<string> {
    const isReady = await this.ensureOllamaRunning();
    if (!isReady) {
      return `[Coach Hors-ligne] Votre coup (${payload.coupJoue}) entraîne une perte d'environ ${payload.deltaScore}. La meilleure alternative calculée était ${payload.meilleurCoup || 'autre'}. Réfutation : ${payload.refutationLisible}. (Démarrez Ollama pour une analyse détaillée).`;
    }

    const messages = PromptBuilder.buildMessages(payload);

    return new Promise((resolve) => {
      const body = JSON.stringify({
        model: this.selectedModel,
        stream: false,
        options: {
          temperature: 0.2,
        },
        messages,
      });

      const req = http.request(
        {
          host: this.host,
          port: this.port,
          path: '/api/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 45000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              const rawContent = json.message?.content || json.response || '';
              const cleaned = PromptBuilder.cleanCoachResponse(rawContent);

              if (cleaned) {
                resolve(cleaned);
              } else {
                resolve(`Votre coup (${payload.coupJoue}) concède ${payload.deltaScore}. Attention à la riposte adverse : ${payload.refutationLisible}.`);
              }
            } catch (e) {
              resolve(`Votre coup (${payload.coupJoue}) est dangereux (${payload.deltaScore}). L'adversaire réplique avec : ${payload.refutationLisible}.`);
            }
          });
        }
      );

      req.on('timeout', () => {
        req.destroy();
        resolve(`Le coach IA met du temps à répondre. Retenez que ce coup (${payload.coupJoue}) concède ${payload.deltaScore} : ${payload.refutationLisible}.`);
      });

      req.on('error', (err) => {
        console.error('[OllamaService] Error chatting with Ollama:', err);
        resolve(`Erreur de communication avec Ollama (${this.selectedModel}). Votre coup (${payload.coupJoue}) est sanctionné par : ${payload.refutationLisible}.`);
      });

      req.write(body);
      req.end();
    });
  }
}
