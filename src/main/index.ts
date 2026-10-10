import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'node:fs';
import { exec } from 'node:child_process';
import { StockfishService } from './uci/stockfish-service';
import { MaiaService } from './uci/maia-service';
import { OllamaService } from './ai/ollama-service';
import { PromptBuilder } from './ai/prompt-builder';
import { ProgressiveCoachService } from './coach/progressive-coach-service';
import { BotLevel, CoachPayload, CoachResponse, TacticalStep } from '../renderer/types/chess';
import { getPreloadPath, getDistHtmlPath, getAppIconPath } from './utils/paths';

let mainWindow: BrowserWindow | null = null;
const stockfishService = new StockfishService('Stockfish-Analysis');
const botEngineService = new StockfishService('Stockfish-Bot');
const maiaService = new MaiaService(botEngineService);
const ollamaService = new OllamaService();
const progressiveCoachService = new ProgressiveCoachService(stockfishService);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: '#09090b',
    title: 'Mon Coach Échecs - IA Locale',
    icon: getAppIconPath(),
    show: false,
    webPreferences: {
      preload: getPreloadPath(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(getDistHtmlPath());
  }
}

// -------------------------------------------------------------
// Handlers IPC
// -------------------------------------------------------------
ipcMain.handle('chess:set-bot-level', async (_, level: BotLevel) => {
  return await maiaService.setLevel(level);
});

ipcMain.handle('chess:get-bot-move', async (_, fen: string) => {
  return await maiaService.getMove(fen);
});

ipcMain.handle('chess:evaluate-position', async (_, fen: string, depth?: number) => {
  return await stockfishService.evaluate(fen, depth || 10);
});

ipcMain.handle('chess:get-progressive-coach-data', async (_, fen: string, playerColor: 'white' | 'black') => {
  return await progressiveCoachService.analyze(fen, playerColor);
});

ipcMain.handle('chess:ask-coach', async (_, payload: CoachPayload): Promise<CoachResponse> => {
  let steps: TacticalStep[] = [];
  const refutationSource = payload.refutationUci || payload.refutationLisible || '';

  // 1. Traduire la réfutation tactique avec la position 'fen' (après coup ou gaffe)
  if (refutationSource && (refutationSource.includes(' ') || /^[a-h][1-8][a-h][1-8]/.test(refutationSource))) {
    const translated = PromptBuilder.translatePvToFrench(
      payload.fen,
      refutationSource,
      payload.playerColor || 'white'
    );
    payload.refutationLisible = translated.readableText;
    payload.tacticalSteps = translated.steps;
    steps = translated.steps;
  }

  // 2. Décrire en français clair le coup joué (sur baseFen si dispo, sinon fen)
  const fenBeforeMove = payload.baseFen || payload.fen;
  if (payload.coupJoue && (!payload.coupJoueLisible || payload.coupJoueLisible === payload.coupJoue)) {
    const coupTrans = PromptBuilder.describeMove(
      fenBeforeMove,
      payload.coupJoue,
      payload.playerColor || 'white'
    );
    payload.coupJoueLisible = coupTrans.description;
  }

  // 3. Traduire le meilleur coup alternatif pour l'élève sur la position avant le coup
  if (payload.meilleurCoup && (!payload.meilleurCoupLisible || payload.meilleurCoupLisible === payload.meilleurCoup)) {
    const bestMoveTrans = PromptBuilder.describeMove(
      fenBeforeMove,
      payload.meilleurCoup,
      payload.playerColor || 'white'
    );
    payload.meilleurCoupLisible = bestMoveTrans.description;
  }

  const message = await ollamaService.askCoach(payload);
  return {
    message,
    steps,
  };
});

ipcMain.handle('chess:get-system-status', async () => {
  const isOnline = await ollamaService.isOnline();
  const models = ollamaService.getAvailableModels();
  const selectedModel = ollamaService.getSelectedModel();
  const installedModelDetails = ollamaService.getInstalledDetails();
  const gpu = ollamaService.getGpuInfo();
  const recommendedCatalog = ollamaService.getRecommendedCatalog(gpu.totalVramGb);
  const maiaStatus = maiaService.getStatus();

  return {
    gpu,
    ollama: {
      online: isOnline,
      models,
      installedModelDetails,
      recommendedCatalog,
      selectedModel,
    },
    engines: {
      stockfish: stockfishService.isAvailable(),
      lc0: maiaStatus.lc0Available,
      maiaWeights: maiaStatus.weights,
    },
  };
});

ipcMain.handle('chess:set-ollama-model', async (_, model: string) => {
  ollamaService.setSelectedModel(model);
  return { success: true };
});

ipcMain.handle('chess:export-pgn', async (_, pgn: string, defaultName?: string) => {
  if (!mainWindow) return { success: false };
  const today = new Date().toISOString().slice(0, 10);
  const resolvedDefaultName = defaultName && defaultName !== 'partie.pgn' ? defaultName : `partie-${today}.pgn`;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter la partie en PGN',
    defaultPath: resolvedDefaultName,
    filters: [{ name: 'Fichiers PGN (*.pgn)', extensions: ['pgn'] }],
  });

  if (canceled || !filePath) {
    return { success: false };
  }

  await fs.promises.writeFile(filePath, pgn, 'utf-8');
  return { success: true, filePath };
});

// -------------------------------------------------------------
// Cycle de vie de l'application
// -------------------------------------------------------------
app.whenReady().then(async () => {
  console.log('[Main] Application démarrée. Initialisation des services...');
  
  ollamaService.ensureOllamaRunning().catch((e) => console.warn('Ollama check:', e));
  stockfishService.init().catch((e) => console.warn('Stockfish init:', e));
  botEngineService.init().catch((e) => console.warn('Bot engine init:', e));
  const initialBotLevel = process.platform === 'linux' ? 'stockfish' : '1100';
  maiaService.setLevel(initialBotLevel).catch((e) => console.warn('Maia init:', e));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', async () => {
  console.log('[Main] Fermeture de l\'application : nettoyage des processus UCI et VRAM...');
  await Promise.all([
    stockfishService.stop().catch(() => {}),
    botEngineService.stop().catch(() => {}),
    maiaService.stop().catch(() => {}),
  ]);

  if (process.platform === 'win32') {
    exec('taskkill /IM lc0.exe /F 2>nul', () => {});
    exec('taskkill /IM stockfish.exe /F 2>nul', () => {});
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
