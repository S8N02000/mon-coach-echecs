import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDefaultSettings,
  loadUserSettings,
  saveUserSettings,
  loadSavedGameSession,
  saveGameSession,
  clearSavedGameSession,
  STORAGE_SETTINGS_KEY,
  STORAGE_GAME_SESSION_KEY,
  SavedGameSession,
} from '../renderer/utils/storage';

describe('Storage Utility (Preferences & Game Session)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('getDefaultSettings', () => {
    it('returns stockfish for linux platform', () => {
      const settings = getDefaultSettings('linux');
      expect(settings.botLevel).toBe('stockfish');
      expect(settings.blunderGuardEnabled).toBe(true);
      expect(settings.soundEnabled).toBe(true);
      expect(settings.vocabularyStyle).toBe('debutant');
      expect(settings.playerColor).toBe('white');
      expect(settings.boardOrientation).toBe('white');
    });

    it('returns 1100 for non-linux platform', () => {
      const settings = getDefaultSettings('darwin');
      expect(settings.botLevel).toBe('1100');
    });
  });

  describe('loadUserSettings & saveUserSettings', () => {
    it('returns default settings when localStorage is empty', () => {
      const settings = loadUserSettings();
      expect(settings.blunderGuardEnabled).toBe(true);
      expect(settings.soundEnabled).toBe(true);
      expect(settings.vocabularyStyle).toBe('debutant');
    });

    it('saves and reloads modified settings accurately', () => {
      saveUserSettings({
        botLevel: '1500',
        blunderGuardEnabled: false,
        soundEnabled: false,
        vocabularyStyle: 'club',
        playerColor: 'black',
        boardOrientation: 'black',
        selectedOllamaModel: 'mistral:latest',
      });

      const loaded = loadUserSettings();
      expect(loaded.botLevel).toBe('1500');
      expect(loaded.blunderGuardEnabled).toBe(false);
      expect(loaded.soundEnabled).toBe(false);
      expect(loaded.vocabularyStyle).toBe('club');
      expect(loaded.playerColor).toBe('black');
      expect(loaded.boardOrientation).toBe('black');
      expect(loaded.selectedOllamaModel).toBe('mistral:latest');
    });

    it('handles corrupted JSON in localStorage gracefully without throwing', () => {
      localStorage.setItem(STORAGE_SETTINGS_KEY, 'invalid-json{{{');
      const loaded = loadUserSettings();
      expect(loaded.blunderGuardEnabled).toBe(true);
      expect(loaded.soundEnabled).toBe(true);
    });

    it('sanitizes invalid enum values from corrupted storage', () => {
      localStorage.setItem(
        STORAGE_SETTINGS_KEY,
        JSON.stringify({
          botLevel: 'super-god-mode',
          vocabularyStyle: 'unknown-style',
          playerColor: 'purple',
          boardOrientation: 'upside-down',
        })
      );

      const loaded = loadUserSettings();
      expect(['1100', '1300', '1500', 'stockfish']).toContain(loaded.botLevel);
      expect(loaded.vocabularyStyle).toBe('debutant');
      expect(loaded.playerColor).toBe('white');
      expect(loaded.boardOrientation).toBe('white');
    });

    it('handles storage exceptions gracefully when setItem fails', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });

      expect(() => saveUserSettings({ soundEnabled: false })).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('SavedGameSession', () => {
    it('returns null when no game session is saved', () => {
      expect(loadSavedGameSession()).toBeNull();
    });

    it('saves and restores active game session properly', () => {
      const session: SavedGameSession = {
        startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        history: [
          { san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', from: 'e2', to: 'e4' },
          { san: 'e5', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', from: 'e7', to: 'e5' },
        ],
        currentMoveIndex: 1,
        playerColor: 'white',
        actualPlayerColor: 'white',
        boardOrientation: 'white',
        evalResult: {
          score: '+0.3',
          numericScore: 0.3,
          bestMove: 'g1f3',
          refutationLineUci: 'g1f3 b8c6',
          depth: 12,
        },
        gameOverDismissed: false,
      };

      saveGameSession(session);
      const loaded = loadSavedGameSession();

      expect(loaded).not.toBeNull();
      expect(loaded?.fen).toBe(session.fen);
      expect(loaded?.history).toHaveLength(2);
      expect(loaded?.history[0].san).toBe('e4');
      expect(loaded?.history[1].san).toBe('e5');
      expect(loaded?.currentMoveIndex).toBe(1);
      expect(loaded?.evalResult?.numericScore).toBe(0.3);
    });

    it('clears saved game session when clearSavedGameSession is called', () => {
      const session: SavedGameSession = {
        startingFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        history: [{ san: 'e4', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', from: 'e2', to: 'e4' }],
        currentMoveIndex: 0,
        playerColor: 'white',
        actualPlayerColor: 'white',
        boardOrientation: 'white',
      };

      saveGameSession(session);
      expect(loadSavedGameSession()).not.toBeNull();

      clearSavedGameSession();
      expect(loadSavedGameSession()).toBeNull();
      expect(localStorage.getItem(STORAGE_GAME_SESSION_KEY)).toBeNull();
    });

    it('returns null on invalid or corrupted session data', () => {
      localStorage.setItem(STORAGE_GAME_SESSION_KEY, 'corrupted JSON');
      expect(loadSavedGameSession()).toBeNull();

      localStorage.setItem(STORAGE_GAME_SESSION_KEY, JSON.stringify({ invalid: true }));
      expect(loadSavedGameSession()).toBeNull();
    });

    it('catches and logs exceptions during saveGameSession and clearSavedGameSession', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('DiskFull');
      });

      expect(() =>
        saveGameSession({
          startingFen: '',
          fen: 'fen',
          history: [],
          currentMoveIndex: 0,
          playerColor: 'white',
          actualPlayerColor: 'white',
          boardOrientation: 'white',
        })
      ).not.toThrow();

      vi.spyOn(Storage.prototype, 'removeItem').mockImplementationOnce(() => {
        throw new Error('SecurityError');
      });
      expect(() => clearSavedGameSession()).not.toThrow();
    });
  });
});
