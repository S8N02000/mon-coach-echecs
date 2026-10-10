import { describe, it, expect } from 'vitest';
import { getCurrentDir, getResourcesBinDir, getPreloadPath, getDistHtmlPath } from '../main/utils/paths';
import path from 'node:path';
import fs from 'node:fs';

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
});
