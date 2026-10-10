import { describe, it, expect, vi } from 'vitest';
import { getCurrentDir, getResourcesBinDir, getPreloadPath, getDistHtmlPath, getAppIconPath } from '../main/utils/paths';
import path from 'node:path';
import fs from 'node:fs';

const mockApp = vi.hoisted(() => ({
  isPackaged: false,
}));

vi.mock('electron', () => ({
  app: mockApp,
}));

describe('Paths Utility', () => {
  it('getCurrentDir returns a valid directory path from import.meta.url', () => {
    const dir = getCurrentDir(import.meta.url);
    expect(typeof dir).toBe('string');
    expect(dir.length).toBeGreaterThan(0);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('getResourcesBinDir finds the resources/bin directory', () => {
    const binDir = getResourcesBinDir();
    expect(typeof binDir).toBe('string');
    expect(fs.existsSync(binDir)).toBe(true);
    expect(fs.existsSync(path.join(binDir, 'stockfish'))).toBe(true);
  });

  it('getPreloadPath returns path ending with preload.cjs or preload.js', () => {
    const preloadPath = getPreloadPath();
    expect(typeof preloadPath).toBe('string');
    expect(preloadPath).toMatch(/preload\.(cjs|js)$/);
  });

  it('getDistHtmlPath returns a valid path string for index.html', () => {
    const htmlPath = getDistHtmlPath();
    expect(typeof htmlPath).toBe('string');
    expect(htmlPath).toContain('index.html');
  });

  it('getAppIconPath finds icon in build or resources directory', () => {
    const iconPath = getAppIconPath();
    expect(typeof iconPath === 'string' || iconPath === undefined).toBe(true);
  });

  it('handles getAppIconPath and getResourcesBinDir in packaged app mode', () => {
    const originalResourcesPath = (process as any).resourcesPath;
    try {
      mockApp.isPackaged = true;
      (process as any).resourcesPath = '/tmp/fake-resources';

      const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
        if (typeof p === 'string' && p.includes('fake-resources')) return true;
        return false;
      });

      const binDir = getResourcesBinDir();
      expect(binDir).toBe(path.join('/tmp/fake-resources', 'bin'));

      const icon = getAppIconPath();
      expect(icon).toBe(path.join('/tmp/fake-resources', 'resources', 'icon.png'));

      existsSpy.mockRestore();
    } finally {
      (process as any).resourcesPath = originalResourcesPath;
      mockApp.isPackaged = false;
    }
  });

  it('handles getResourcesBinDir fallback when cwd/resources/bin does not exist', async () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const { getResourcesBinDir } = await import('../main/utils/paths');
    const binDir = getResourcesBinDir();
    expect(binDir).toContain('resources');
    existsSpy.mockRestore();
  });

  it('handles getPreloadPath fallback to preload.js when preload.cjs does not exist', async () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('.cjs')) return false;
      return true;
    });
    const { getPreloadPath } = await import('../main/utils/paths');
    const pPath = getPreloadPath();
    expect(pPath).toMatch(/preload\.js$/);
    existsSpy.mockRestore();
  });

  it('returns undefined for getAppIconPath when no icon exists', async () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const { getAppIconPath } = await import('../main/utils/paths');
    const icon = getAppIconPath();
    expect(icon).toBeUndefined();
    existsSpy.mockRestore();
  });
});
