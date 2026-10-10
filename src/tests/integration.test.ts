import { describe, it, expect, vi } from 'vitest';
import path from 'path';

// Mock electron app
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: () => process.cwd(),
  },
}));

import { StockfishService } from '../main/uci/stockfish-service';
import { MaiaService } from '../main/uci/maia-service';
import { OllamaService } from '../main/ai/ollama-service';

describe('End-to-End Engines & AI Integration', () => {
  it('Stockfish evaluates FEN after 1. Nc3 and produces bestMove', async () => {
    const sf = new StockfishService();
    const ready = await sf.init();
    expect(ready).toBe(true);

    const fenAfterNc3 = 'rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 1 1';
    const result = await sf.evaluate(fenAfterNc3, 8);

    console.log('Stockfish eval result after 1. Nc3:', result);
    expect(result.bestMove).toBeTruthy();
    expect(result.bestMove.length).toBeGreaterThanOrEqual(4);
    await sf.stop();
  }, 10000);

  it('MaiaService generates bot move for Black and White', async () => {
    const sf = new StockfishService();
    await sf.init();
    const maia = new MaiaService(sf);

    // 1. Move for Black after 1. Nc3
    const fenAfterNc3 = 'rnbqkbnr/pppppppp/8/8/8/2N5/PPPPPPPP/R1BQKBNR b KQkq - 1 1';
    const moveForBlack = await maia.getMove(fenAfterNc3);
    console.log('Bot move for Black:', moveForBlack);
    expect(moveForBlack).toBeTruthy();
    expect(moveForBlack.length).toBeGreaterThanOrEqual(4);

    // 2. Move for White at start (when human plays Black)
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const moveForWhite = await maia.getMove(startFen);
    console.log('Bot move for White at start:', moveForWhite);
    expect(moveForWhite).toBeTruthy();
    expect(moveForWhite.length).toBeGreaterThanOrEqual(4);

    await maia.stop();
    await sf.stop();
  }, 15000);

  it('OllamaService connects to local Ollama and lists models', async () => {
    const ollama = new OllamaService();
    const isOnline = await ollama.isOnline();
    console.log('Is Ollama online?:', isOnline);
    expect(isOnline).toBe(true);

    const models = ollama.getAvailableModels();
    console.log('Available models:', models);
    expect(models.length).toBeGreaterThan(0);

    const selected = ollama.getSelectedModel();
    console.log('Selected model:', selected);
    expect(selected).toBeTruthy();
  }, 10000);

  it('OllamaService asks coach and receives a pedagogical response', async () => {
    const ollama = new OllamaService();
    await ollama.refreshModels();

    const response = await ollama.askCoach({
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
      coupJoue: 'f6',
      deltaScore: '-2.4 pions',
      refutationLisible: 'Cavalier blanc prend le pion en e5, puis la Dame attaque en h5 avec échec.',
      meilleurCoup: 'Cc6',
      styleVocabulaire: 'debutant',
    });

    console.log('Coach response from Ollama:', response);
    expect(response).toBeTruthy();
    expect(response.length).toBeGreaterThan(20);
    expect(response).not.toContain('<think>');
  }, 60000);
});
