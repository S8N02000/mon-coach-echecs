import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProgressiveCoach } from '../renderer/hooks/useProgressiveCoach';
import { ProgressiveCoachResult } from '../renderer/types/chess';

describe('useProgressiveCoach Hook Unit Tests', () => {
  const mockResult: ProgressiveCoachResult = {
    status: 'ATTACK',
    evalRefCp: 150,
    evalNullCp: 50,
    deltaCp: 100,
    issueType: 'MATERIAL',
    issueDelta: 3,
    issueLabelFr: 'Gain de matériel (+3 pts)',
    targetPiece: {
      type: 'n',
      square: 'f6',
      nameFr: 'Cavalier en f6',
    },
    targetDescriptionFr: 'Cavalier f6 ciblé',
    simulationMoves: [
      {
        uci: 'e2e4',
        san: 'e4',
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        from: 'e2',
        to: 'e4',
        color: 'w',
      },
      {
        uci: 'e7e5',
        san: 'e5',
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        from: 'e7',
        to: 'e5',
        color: 'b',
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    window.chessAPI = {
      ...window.chessAPI,
      getProgressiveCoachData: vi.fn().mockResolvedValue(mockResult),
    };
  });

  it('initializes with enabled=true and currentLevel=1 when localStorage is empty', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() =>
        useProgressiveCoach({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          playerColor: 'white',
          isPlayerTurn: true,
          isGameOver: false,
        })
      ).result;
    });

    expect(hookResult.current.enabled).toBe(true);
    expect(hookResult.current.currentLevel).toBe(1);
    expect(hookResult.current.simulationActive).toBe(false);
  });

  it('progresses from Palier 1 to Palier 2 and then Palier 3 on advanceLevel', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() =>
        useProgressiveCoach({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          playerColor: 'white',
          isPlayerTurn: true,
          isGameOver: false,
        })
      ).result;
    });

    expect(hookResult.current.currentLevel).toBe(1);

    act(() => {
      hookResult.current.advanceLevel();
    });
    expect(hookResult.current.currentLevel).toBe(2);

    act(() => {
      hookResult.current.advanceLevel();
    });
    expect(hookResult.current.currentLevel).toBe(3);
  });

  it('toggles enabled status and persists in localStorage', async () => {
    let hookResult: any;
    await act(async () => {
      hookResult = renderHook(() =>
        useProgressiveCoach({
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          playerColor: 'white',
          isPlayerTurn: true,
          isGameOver: false,
        })
      ).result;
    });

    await act(async () => {
      hookResult.current.toggleEnabled();
    });

    expect(hookResult.current.enabled).toBe(false);
    expect(hookResult.current.currentLevel).toBe(0);
    expect(localStorage.getItem('mon-coach-progressive-enabled')).toBe('false');

    await act(async () => {
      hookResult.current.toggleEnabled();
    });

    expect(hookResult.current.enabled).toBe(true);
    expect(hookResult.current.currentLevel).toBe(1);
    expect(localStorage.getItem('mon-coach-progressive-enabled')).toBe('true');
  });

  it('starts and navigates in simulation mode (Ghost Board - Palier 4)', async () => {
    const { result } = renderHook(() =>
      useProgressiveCoach({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        playerColor: 'white',
        isPlayerTurn: true,
        isGameOver: false,
      })
    );

    // Attendre l'analyse
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.current.simulationMoves.length).toBe(2);

    // Déclencher la simulation
    act(() => {
      result.current.startSimulation();
    });

    expect(result.current.simulationActive).toBe(true);
    expect(result.current.simulationStepIndex).toBe(0);
    expect(result.current.displayFen).toBe(mockResult.simulationMoves[0].fen);
    expect(result.current.simulationShapes.length).toBe(1);
    // Coup blanc = joueur blanc -> flèche bleue
    expect(result.current.simulationShapes[0].brush).toBe('blue');

    // Suivant
    act(() => {
      result.current.stepSimulation('next');
    });
    expect(result.current.simulationStepIndex).toBe(1);
    expect(result.current.displayFen).toBe(mockResult.simulationMoves[1].fen);
    // Coup noir = adversaire -> flèche rouge
    expect(result.current.simulationShapes[0].brush).toBe('red');

    // Sortie de simulation
    act(() => {
      result.current.exitSimulation();
    });
    expect(result.current.simulationActive).toBe(false);
    expect(result.current.displayFen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('exits simulation on Escape key event', async () => {
    const { result } = renderHook(() =>
      useProgressiveCoach({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        playerColor: 'white',
        isPlayerTurn: true,
        isGameOver: false,
      })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    act(() => {
      result.current.startSimulation();
    });
    expect(result.current.simulationActive).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.simulationActive).toBe(false);
  });
});
