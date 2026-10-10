import { Key } from 'chessground/types';
import { BotLevel, EvalResult, PlayerColor, VocabularyStyle } from '../types/chess';

export const STORAGE_SETTINGS_KEY = 'mon-coach-user-settings';
export const STORAGE_GAME_SESSION_KEY = 'mon-coach-game-session';

export interface UserSettings {
  botLevel: BotLevel;
  blunderGuardEnabled: boolean;
  soundEnabled: boolean;
  vocabularyStyle: VocabularyStyle;
  playerColor: PlayerColor;
  boardOrientation: 'white' | 'black';
  selectedOllamaModel?: string;
}

export interface SavedGameMove {
  san: string;
  fen: string;
  from: Key;
  to: Key;
}

export interface SavedGameSession {
  startingFen: string;
  fen: string;
  history: SavedGameMove[];
  currentMoveIndex: number;
  playerColor: PlayerColor;
  actualPlayerColor: 'white' | 'black';
  boardOrientation: 'white' | 'black';
  evalResult?: EvalResult;
  gameOverDismissed?: boolean;
}

export function getDefaultSettings(platform?: string): UserSettings {
  const isLinux =
    platform === 'linux' ||
    (typeof window !== 'undefined' && window.chessAPI?.platform === 'linux');

  return {
    botLevel: isLinux ? 'stockfish' : '1100',
    blunderGuardEnabled: true,
    soundEnabled: true,
    vocabularyStyle: 'debutant',
    playerColor: 'white',
    boardOrientation: 'white',
  };
}

export function loadUserSettings(platform?: string): UserSettings {
  const defaults = getDefaultSettings(platform);
  if (typeof window === 'undefined' || !window.localStorage) {
    return defaults;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);

    const validLevels: BotLevel[] = ['1100', '1300', '1500', 'stockfish'];
    const validColors: PlayerColor[] = ['white', 'black', 'random'];
    const validOrientations: ('white' | 'black')[] = ['white', 'black'];
    const validStyles: VocabularyStyle[] = ['debutant', 'club'];

    return {
      botLevel: validLevels.includes(parsed.botLevel) ? parsed.botLevel : defaults.botLevel,
      blunderGuardEnabled: typeof parsed.blunderGuardEnabled === 'boolean' ? parsed.blunderGuardEnabled : defaults.blunderGuardEnabled,
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : defaults.soundEnabled,
      vocabularyStyle: validStyles.includes(parsed.vocabularyStyle) ? parsed.vocabularyStyle : defaults.vocabularyStyle,
      playerColor: validColors.includes(parsed.playerColor) ? parsed.playerColor : defaults.playerColor,
      boardOrientation: validOrientations.includes(parsed.boardOrientation) ? parsed.boardOrientation : defaults.boardOrientation,
      selectedOllamaModel: typeof parsed.selectedOllamaModel === 'string' ? parsed.selectedOllamaModel : undefined,
    };
  } catch (err) {
    console.warn('[Storage] Failed to read user settings from localStorage:', err);
    return defaults;
  }
}

export function saveUserSettings(patch: Partial<UserSettings>): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const current = loadUserSettings();
    const updated: UserSettings = {
      ...current,
      ...patch,
    };
    window.localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[Storage] Failed to save user settings:', err);
  }
}

export function loadSavedGameSession(): SavedGameSession | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_GAME_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.fen !== 'string' || !Array.isArray(parsed.history)) {
      return null;
    }

    return {
      startingFen: parsed.startingFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      fen: parsed.fen,
      history: parsed.history,
      currentMoveIndex: typeof parsed.currentMoveIndex === 'number' ? parsed.currentMoveIndex : parsed.history.length - 1,
      playerColor: parsed.playerColor || 'white',
      actualPlayerColor: parsed.actualPlayerColor || 'white',
      boardOrientation: parsed.boardOrientation || 'white',
      evalResult: parsed.evalResult,
      gameOverDismissed: Boolean(parsed.gameOverDismissed),
    };
  } catch (err) {
    console.warn('[Storage] Failed to load saved game session:', err);
    return null;
  }
}

export function saveGameSession(session: SavedGameSession): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    window.localStorage.setItem(STORAGE_GAME_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('[Storage] Failed to save game session:', err);
  }
}

export function clearSavedGameSession(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    window.localStorage.removeItem(STORAGE_GAME_SESSION_KEY);
  } catch (err) {
    console.warn('[Storage] Failed to clear game session:', err);
  }
}
