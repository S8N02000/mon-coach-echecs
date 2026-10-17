import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { app } from 'electron';

export function getCurrentDir(metaUrl: string): string {
  return path.dirname(fileURLToPath(metaUrl));
}

export function getResourcesBinDir(): string {
  // 1. Packaged Electron app: process.resourcesPath/bin
  if (app?.isPackaged) {
    return path.join(process.resourcesPath, 'bin');
  }

  // 2. Dev mode: ./resources/bin from cwd
  const cwdBin = path.join(process.cwd(), 'resources', 'bin');
  if (fs.existsSync(cwdBin)) {
    return cwdBin;
  }

  // 3. Fallback relative to module
  const moduleBin = path.join(getCurrentDir(import.meta.url), '..', '..', '..', 'resources', 'bin');
  return moduleBin;
}

export function getModelsDir(): string {
  if (app?.isPackaged) {
    return path.join(process.resourcesPath, 'models');
  }
  const cwdModels = path.join(process.cwd(), 'resources', 'models');
  if (fs.existsSync(cwdModels)) {
    return cwdModels;
  }
  return path.join(getCurrentDir(import.meta.url), '..', '..', '..', 'resources', 'models');
}

export function getAppDataModelsDir(): string {
  try {
    if (app?.getPath) {
      const p = path.join(app.getPath('userData'), 'models');
      fs.mkdirSync(p, { recursive: true });
      return p;
    }
  } catch {}
  const local = path.join(process.cwd(), 'resources', 'models');
  fs.mkdirSync(local, { recursive: true });
  return local;
}

export function getPreloadPath(): string {
  const currentDir = getCurrentDir(import.meta.url);
  const cjs = path.join(currentDir, '..', 'preload', 'preload.cjs');
  if (fs.existsSync(cjs)) {
    return cjs;
  }
  return path.join(currentDir, '..', 'preload', 'preload.js');
}

export function getDistHtmlPath(): string {
  const currentDir = getCurrentDir(import.meta.url);
  return path.join(currentDir, '..', '..', 'dist', 'index.html');
}

export function getAppIconPath(): string | undefined {
  if (app?.isPackaged) {
    const packagedIcon = path.join(process.resourcesPath, 'resources', 'icon.png');
    if (fs.existsSync(packagedIcon)) return packagedIcon;
  }
  const cwdIcon = path.join(process.cwd(), 'build', 'icon.png');
  if (fs.existsSync(cwdIcon)) return cwdIcon;
  const resIcon = path.join(process.cwd(), 'resources', 'icon.png');
  if (fs.existsSync(resIcon)) return resIcon;
  return undefined;
}
