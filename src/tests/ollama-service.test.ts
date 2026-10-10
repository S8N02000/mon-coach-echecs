import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OllamaService } from '../main/ai/ollama-service';
import http from 'node:http';
import { EventEmitter } from 'node:events';

describe('OllamaService Full Coverage', () => {
  let service: OllamaService;

  beforeEach(() => {
    service = new OllamaService();
  });

  it('detects GPU info structure and VRAM', () => {
    const gpu = service.getGpuInfo();
    expect(gpu).toHaveProperty('name');
    expect(gpu).toHaveProperty('totalVramGb');
    expect(gpu).toHaveProperty('freeVramGb');
    expect(gpu).toHaveProperty('hasDedicatedGpu');
    expect(typeof gpu.name).toBe('string');
  });

  it('provides recommended catalog tailored to VRAM tiers', () => {
    // 4 GB VRAM (entry level / laptop)
    const cat4 = service.getRecommendedCatalog(4);
    const rec4 = cat4.find((m) => m.name === 'deepseek-r1:1.5b');
    expect(rec4?.isRecommended).toBe(true);

    // 8-12 GB VRAM (RTX 4070 Ti)
    const cat12 = service.getRecommendedCatalog(12);
    const rec8b = cat12.find((m) => m.name === 'deepseek-r1:8b');
    expect(rec8b?.isRecommended).toBe(true);
    expect(rec8b?.fitsVram).toBe(true);

    // 16+ GB VRAM (Master tier)
    const cat16 = service.getRecommendedCatalog(16);
    const rec14b = cat16.find((m) => m.name === 'deepseek-r1:14b');
    expect(rec14b?.isRecommended).toBe(true);
    expect(rec14b?.fitsVram).toBe(true);
  });

  it('manages selected model properly', () => {
    service.setSelectedModel('deepseek-r1:7b');
    expect(service.getSelectedModel()).toBe('deepseek-r1:7b');

    service.setSelectedModel('deepseek-r1:8b');
    expect(service.getSelectedModel()).toBe('deepseek-r1:8b');
  });

  it('refreshes and detects installed models details', async () => {
    const online = await service.isOnline();
    expect(typeof online).toBe('boolean');

    if (online) {
      const models = service.getAvailableModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);

      const details = service.getInstalledDetails();
      expect(Array.isArray(details)).toBe(true);
      expect(details[0]).toHaveProperty('name');
      expect(details[0]).toHaveProperty('displayName');
      expect(details[0]).toHaveProperty('sizeFormatted');
    }
  });

  it('falls back gracefully when asking coach if offline', async () => {
    const offlineService = new OllamaService();
    // Point to non-existent port to force offline fallback
    (offlineService as any).port = 54321;

    const res = await offlineService.askCoach({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      coupJoue: 'f3',
      deltaScore: '-2.5',
      meilleurCoup: 'e4',
      refutationLisible: 'Pion e5 prend le centre',
      styleVocabulaire: 'debutant',
    });

    expect(res).toContain('[Coach Hors-ligne]');
    expect(res).toContain('f3');
    expect(res).toContain('-2.5');
  });

  describe('HTTP Mocking & Model Selection Logic', () => {
    function mockHttpRequest(statusCode: number, responseBody: string, shouldTimeout = false, shouldError = false) {
      return vi.spyOn(http, 'request').mockImplementation((_options: any, callback?: any) => {
        const req: any = new EventEmitter();
        req.write = vi.fn();
        req.destroy = vi.fn();
        req.end = vi.fn(() => {
          if (shouldError) {
            req.emit('error', new Error('Connection refused'));
            return;
          }
          if (shouldTimeout) {
            req.emit('timeout');
            return;
          }
          if (callback) {
            const res: any = new EventEmitter();
            res.statusCode = statusCode;
            callback(res);
            res.emit('data', responseBody);
            res.emit('end');
          }
        });
        return req;
      });
    }

    it('auto-selects deepseek-r1:14b when installed and VRAM >= 10GB', async () => {
      const spy = mockHttpRequest(200, JSON.stringify({
        models: [
          { name: 'deepseek-r1:14b', size: 9 * 1024 * 1024 * 1024, details: { parameter_size: '14B' } },
          { name: 'llama3:8b', size: 4 * 1024 * 1024 * 1024, details: { parameter_size: '8B' } },
        ],
      }));
      vi.spyOn(service, 'getGpuInfo').mockReturnValue({
        name: 'RTX 4070 Ti',
        totalVramGb: 12.0,
        freeVramGb: 11.0,
        hasDedicatedGpu: true,
      });

      const models = await service.refreshModels();
      expect(models).toContain('deepseek-r1:14b');
      expect(service.getSelectedModel()).toBe('deepseek-r1:14b');
      spy.mockRestore();
    });

    it('auto-selects deepseek-r1:8b when 14b is not present', async () => {
      const spy = mockHttpRequest(200, JSON.stringify({
        models: [
          { name: 'deepseek-r1:8b', size: 5 * 1024 * 1024 * 1024, details: { parameter_size: '8B' } },
          { name: 'mistral:7b', size: 4 * 1024 * 1024 * 1024, details: { parameter_size: '7B' } },
        ],
      }));

      const models = await service.refreshModels();
      expect(models).toContain('deepseek-r1:8b');
      expect(service.getSelectedModel()).toBe('deepseek-r1:8b');
      spy.mockRestore();
    });

    it('auto-selects deepseek-r1:7b when 8b is not present', async () => {
      const spy = mockHttpRequest(200, JSON.stringify({
        models: [
          { name: 'deepseek-r1:7b', size: 4.5 * 1024 * 1024 * 1024, details: { parameter_size: '7B' } },
        ],
      }));

      const models = await service.refreshModels();
      expect(service.getSelectedModel()).toBe('deepseek-r1:7b');
      spy.mockRestore();
    });

    it('handles non-200 HTTP status code in refreshModels', async () => {
      const spy = mockHttpRequest(500, 'Internal Server Error');
      await expect(service.refreshModels()).rejects.toThrow('Ollama returned status 500');
      spy.mockRestore();
    });

    it('handles timeout in refreshModels', async () => {
      const spy = mockHttpRequest(200, '', true);
      await expect(service.refreshModels()).rejects.toThrow('Ollama request timed out');
      spy.mockRestore();
    });

    it('asks coach and returns cleaned answer with thinking removed', async () => {
      vi.spyOn(service, 'ensureOllamaRunning').mockResolvedValue(true);
      const spy = mockHttpRequest(200, JSON.stringify({
        message: {
          content: '<think>Calcul tactique profond</think>Attention, vous perdez votre cavalier.',
        },
      }));

      const answer = await service.askCoach({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        coupJoue: 'f3',
        deltaScore: '-2.0',
        refutationLisible: 'e5',
        meilleurCoup: 'e4',
        styleVocabulaire: 'debutant',
      });

      expect(answer).toBe('Attention, vous perdez votre cavalier.');
      expect(answer).not.toContain('<think>');
      spy.mockRestore();
    });

    it('handles askCoach request timeout with fallback message', async () => {
      vi.spyOn(service, 'ensureOllamaRunning').mockResolvedValue(true);
      const spy = mockHttpRequest(200, '', true);

      const answer = await service.askCoach({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        coupJoue: 'f3',
        deltaScore: '-2.0',
        refutationLisible: 'e5',
        meilleurCoup: 'e4',
        styleVocabulaire: 'debutant',
      });

      expect(answer).toContain('met du temps à répondre');
      spy.mockRestore();
    });

    it('handles askCoach network error with fallback message', async () => {
      vi.spyOn(service, 'ensureOllamaRunning').mockResolvedValue(true);
      const spy = mockHttpRequest(200, '', false, true);

      const answer = await service.askCoach({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        coupJoue: 'f3',
        deltaScore: '-2.0',
        refutationLisible: 'e5',
        meilleurCoup: 'e4',
        styleVocabulaire: 'debutant',
      });

      expect(answer).toContain('Erreur de communication avec Ollama');
      spy.mockRestore();
    });
  });
});
