import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { App } from '../renderer/App';

describe('App Root Component', () => {
  beforeEach(() => {
    (window as any).chessAPI = {
      getSystemStatus: vi.fn().mockResolvedValue({
        gpu: {
          name: 'NVIDIA GeForce RTX 4070 Ti',
          totalVramGb: 12.0,
          freeVramGb: 11.0,
          hasDedicatedGpu: true,
        },
        ollama: {
          online: true,
          models: ['deepseek-r1:8b'],
          installedModelDetails: [
            {
              name: 'deepseek-r1:8b',
              displayName: 'DEEPSEEK-R1:8B',
              sizeFormatted: '5.2 Go',
              parameterSize: '8.2B',
              isInstalled: true,
              isRecommended: true,
              minVramGb: 5.5,
              fitsVram: true,
              badge: 'Recommandé',
            },
          ],
          recommendedCatalog: [],
          selectedModel: 'deepseek-r1:8b',
        },
        engines: {
          stockfish: true,
          lc0: false,
          maiaWeights: { '1100': true, '1300': true, '1500': true },
        },
      }),
      evaluatePosition: vi.fn().mockResolvedValue({
        score: '+0.20',
        numericScore: 0.2,
        bestMove: 'e7e5',
        refutationLineUci: 'e7e5',
        depth: 10,
      }),
      getBotMove: vi.fn().mockResolvedValue('e7e5'),
      setBotLevel: vi.fn().mockResolvedValue({ success: true }),
      setOllamaModel: vi.fn().mockResolvedValue({ success: true }),
      exportPgnFile: vi.fn().mockResolvedValue({ success: true }),
      askCoach: vi.fn().mockResolvedValue('Explication du coach pour ce coup.'),
    };
  });

  it('renders application header, board, and panels', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.getByText('Mon Coach Échecs')).toBeDefined();
    expect(screen.getByText(/IA Locale/i)).toBeDefined();

    // Check header status pill
    await waitFor(() => {
      const sf = screen.getAllByText(/Stockfish/i);
      expect(sf.length).toBeGreaterThan(0);
    });

    // Open settings modal from header click
    const headerPills = screen.getAllByText(/Stockfish/i);
    await act(async () => {
      fireEvent.click(headerPills[0]);
    });

    expect(screen.getByText(/Configuration de l'IA & Moteurs d'Échecs/i)).toBeDefined();

    // Close settings modal
    const closeBtn = screen.getByRole('button', { name: '' });
    if (closeBtn) {
      await act(async () => {
        fireEvent.click(closeBtn);
      });
    }

    // Test clicking Refaire à 0 button
    const restartBtns = screen.getAllByText('Refaire à 0');
    expect(restartBtns.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(restartBtns[0]);
    });
  });
});
