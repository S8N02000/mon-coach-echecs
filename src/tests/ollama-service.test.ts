import { describe, it, expect, beforeEach } from 'vitest';
import { OllamaService } from '../main/ai/ollama-service';

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
});
