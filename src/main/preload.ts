import { contextBridge, ipcRenderer } from 'electron';
import { BotLevel, CoachPayload, CoachResponse, EvalResult, SystemStatus } from '../renderer/types/chess';

const chessAPI = {
  platform: process.platform,

  setBotLevel: (level: BotLevel): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('chess:set-bot-level', level);
  },

  getBotMove: (fen: string): Promise<string> => {
    return ipcRenderer.invoke('chess:get-bot-move', fen);
  },

  evaluatePosition: (fen: string, depth?: number): Promise<EvalResult> => {
    return ipcRenderer.invoke('chess:evaluate-position', fen, depth);
  },

  askCoach: (payload: CoachPayload): Promise<CoachResponse | string> => {
    return ipcRenderer.invoke('chess:ask-coach', payload);
  },

  getSystemStatus: (): Promise<SystemStatus> => {
    return ipcRenderer.invoke('chess:get-system-status');
  },

  setOllamaModel: (model: string): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke('chess:set-ollama-model', model);
  },

  exportPgnFile: (pgn: string, defaultName?: string): Promise<{ success: boolean; filePath?: string }> => {
    return ipcRenderer.invoke('chess:export-pgn', pgn, defaultName);
  },

  getProgressiveCoachData: (fen: string, playerColor: 'white' | 'black') => {
    return ipcRenderer.invoke('chess:get-progressive-coach-data', fen, playerColor);
  },
};

contextBridge.exposeInMainWorld('chessAPI', chessAPI);
