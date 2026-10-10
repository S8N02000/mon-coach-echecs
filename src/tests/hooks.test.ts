import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudio } from '../renderer/hooks/useAudio';
import { useChessGame } from '../renderer/hooks/useChessGame';

describe('Renderer Hooks', () => {
  describe('useAudio', () => {
    beforeEach(() => {
      class MockAudioContext {
        currentTime = 0;
        state = 'suspended';
        resume = vi.fn().mockResolvedValue(undefined);
        destination = {};
        createOscillator() {
          return {
            type: '',
            frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn(),
          };
        }
        createGain() {
          return {
            gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
            connect: vi.fn(),
          };
        }
      }
      (window as any).AudioContext = MockAudioContext;
    });

    it('executes audio callbacks and triggers Web Audio synthesis', () => {
      const { result } = renderHook(() => useAudio(true));
      expect(() => {
        result.current.playMove();
        result.current.playCapture();
        result.current.playCheck();
        result.current.playBlunder();
        result.current.playCoachChime();
        result.current.playVictory();
        result.current.playDefeat();
      }).not.toThrow();
    });

    it('does nothing when disabled', () => {
      const { result } = renderHook(() => useAudio(false));
      expect(() => {
        result.current.playMove();
        result.current.playCapture();
        result.current.playCheck();
        result.current.playBlunder();
        result.current.playCoachChime();
        result.current.playVictory();
        result.current.playDefeat();
      }).not.toThrow();
    });
  });

  describe('useChessGame', () => {
    beforeEach(() => {
      // Mock window.chessAPI
      (window as any).chessAPI = {
        evaluatePosition: vi.fn().mockResolvedValue({
          score: '+0.10',
          numericScore: 0.1,
          bestMove: 'e7e5',
          refutationLineUci: 'e7e5 d2d4',
          depth: 10,
        }),
        getBotMove: vi.fn().mockResolvedValue('e7e5'),
        askCoach: vi.fn().mockResolvedValue('Bon coup ! Vous contrôlez le centre.'),
        setBotLevel: vi.fn().mockResolvedValue({ success: true }),
      };
    });

    it('initializes with starting standard position and settings', () => {
      const { result } = renderHook(() => useChessGame());
      expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(result.current.playerColor).toBe('white');
      expect(result.current.isPlayerTurn).toBe(true);
      expect(result.current.botLevel).toBe('1100');
      expect(result.current.history).toHaveLength(0);
    });

    it('handles human move and triggers bot response', async () => {
      const { result } = renderHook(() => useChessGame());

      await act(async () => {
        result.current.handleHumanMove('e2' as any, 'e4' as any);
      });

      expect(result.current.history.length).toBeGreaterThanOrEqual(1);
      expect(result.current.history[0].san).toBe('e4');
    });

    it('flips board orientation', () => {
      const { result } = renderHook(() => useChessGame());
      expect(result.current.boardOrientation).toBe('white');

      act(() => {
        result.current.flipBoard();
      });
      expect(result.current.boardOrientation).toBe('black');
    });

    it('allows undoing moves', async () => {
      const { result } = renderHook(() => useChessGame());

      await act(async () => {
        result.current.handleHumanMove('e2' as any, 'e4' as any);
      });

      act(() => {
        result.current.handleUndo();
      });

      expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('starts new game and switches color', async () => {
      const { result } = renderHook(() => useChessGame());

      await act(async () => {
        result.current.startNewGame('black');
      });

      expect(result.current.boardOrientation).toBe('black');
    });

    it('manages blunder alert confirmations and undos', () => {
      const { result } = renderHook(() => useChessGame());

      act(() => {
        result.current.handleBlunderUndo();
      });
      expect(result.current.blunderState.isOpen).toBe(false);

      act(() => {
        result.current.handleBlunderConfirm();
      });
      expect(result.current.blunderState.isOpen).toBe(false);
    });

    it('asks coach and sets coach message', async () => {
      const { result } = renderHook(() => useChessGame());

      await act(async () => {
        await result.current.askCoach();
      });

      expect(result.current.coachMessage).toBe('Bon coup ! Vous contrôlez le centre.');
    });

    it('handles structured CoachResponse with tactical steps and generates visual shapes', async () => {
      (window as any).chessAPI.askCoach = vi.fn().mockResolvedValue({
        message: 'Ce coup perd du matériel face à la riposte adverse.',
        steps: [
          {
            step: 1,
            uci: 'g6h5',
            from: 'g6',
            to: 'h5',
            piece: 'p',
            color: 'black',
            san: 'gxh5',
            description: 'Pion noir prend la Dame en h5',
            isPupilMove: false,
          },
          {
            step: 2,
            uci: 'f1c4',
            from: 'f1',
            to: 'c4',
            piece: 'b',
            color: 'white',
            san: 'Bc4',
            description: 'Fou blanc se déplace en c4',
            isPupilMove: true,
          },
        ],
      });

      const { result } = renderHook(() => useChessGame());

      await act(async () => {
        await result.current.askCoach();
      });

      expect(result.current.coachMessage).toContain('perd du matériel');
      expect(result.current.tacticalSteps).toHaveLength(2);
      expect(result.current.selectedStepIndex).toBeNull();

      // Shapes should display step 0 (red) and step 1 (green)
      const shapes = result.current.shapes;
      expect(shapes.some((s) => s.orig === 'g6' && s.dest === 'h5' && s.brush === 'red')).toBe(true);
      expect(shapes.some((s) => s.orig === 'f1' && s.dest === 'c4' && s.brush === 'green')).toBe(true);

      // Select specific step
      act(() => {
        result.current.setSelectedStepIndex(0);
      });
      expect(result.current.selectedStepIndex).toBe(0);
      expect(result.current.shapes).toHaveLength(1);
      expect(result.current.shapes[0]).toMatchObject({ orig: 'g6', dest: 'h5', brush: 'red' });

      // Deselect step
      act(() => {
        result.current.setSelectedStepIndex(null);
      });
      expect(result.current.selectedStepIndex).toBeNull();
    });

    it('navigates history with jumpToMove', async () => {
      const { result } = renderHook(() => useChessGame());

      await act(async () => {
        result.current.handleHumanMove('e2' as any, 'e4' as any);
      });

      act(() => {
        result.current.jumpToMove(-1);
      });
      expect(result.current.currentMoveIndex).toBe(-1);

      act(() => {
        result.current.jumpToMove(0);
      });
      expect(result.current.currentMoveIndex).toBe(0);
    });

    it('loads positions via PGN and FEN', () => {
      const { result } = renderHook(() => useChessGame());

      // Valid FEN
      act(() => {
        const ok = result.current.loadPgnOrFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
        expect(ok).toBe(true);
      });

      // Valid PGN
      act(() => {
        const ok = result.current.loadPgnOrFen('1. d4 d5 2. c4');
        expect(ok).toBe(true);
      });

      // Invalid input
      act(() => {
        const ok = result.current.loadPgnOrFen('invalid chess nonsense string');
        expect(ok).toBe(false);
      });
    });

    it('updates bot level, vocabulary style, sound and blunder guard', async () => {
      const { result } = renderHook(() => useChessGame());

      await act(async () => {
        await result.current.handleSetBotLevel('1300');
      });
      expect(result.current.botLevel).toBe('1300');

      act(() => {
        result.current.setVocabularyStyle('club');
        result.current.setSoundEnabled(false);
        result.current.setBlunderGuardEnabled(false);
      });

      expect(result.current.vocabularyStyle).toBe('club');
      expect(result.current.soundEnabled).toBe(false);
      expect(result.current.blunderGuardEnabled).toBe(false);
    });

    it('enables castling via King to Rook, Rook to King, and standard King 2 squares', async () => {
      const { result } = renderHook(() => useChessGame());

      // Set up position where White can castle kingside and queenside
      // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5
      act(() => {
        result.current.loadPgnOrFen('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
      });

      // Verify dests contains both g1 (2 squares) and h1 (Rook) for King e1
      const e1Dests = result.current.dests.get('e1' as any) || [];
      expect(e1Dests).toContain('g1');
      expect(e1Dests).toContain('h1');

      // Verify dests for Rook h1 contains e1 (Rook to King)
      const h1Dests = result.current.dests.get('h1' as any) || [];
      expect(h1Dests).toContain('e1');

      // Test 1: Castling by moving King directly onto Rook (e1 -> h1)
      await act(async () => {
        await result.current.handleHumanMove('e1' as any, 'h1' as any);
      });

      expect(result.current.history[0]?.san).toBe('O-O');
      expect(result.current.fen).toContain('RNBQ1RK1');

      // Reset and test queenside castling
      act(() => {
        result.current.loadPgnOrFen('r3kbnr/pppqpppp/2n5/3p1b2/3P1B2/2N5/PPPQPPPP/R3KBNR w KQkq - 6 5');
      });

      const e1QueensideDests = result.current.dests.get('e1' as any) || [];
      expect(e1QueensideDests).toContain('c1');
      expect(e1QueensideDests).toContain('a1');

      // Test 2: Queenside castling by moving King onto Rook (e1 -> a1)
      await act(async () => {
        await result.current.handleHumanMove('e1' as any, 'a1' as any);
      });

      expect(result.current.history[0]?.san).toBe('O-O-O');
      expect(result.current.fen).toContain('2KR1BNR');
    });

    it('allows moving Rook to original King square (e1) when King has moved without rollback', async () => {
      const { result } = renderHook(() => useChessGame());

      // Position where White has already castled (King on g1, Rook on f1, e1 is empty and reachable)
      act(() => {
        result.current.loadPgnOrFen('r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 1 6');
      });

      const f1Dests = result.current.dests.get('f1' as any) || [];
      expect(f1Dests).toContain('e1');

      await act(async () => {
        await result.current.handleHumanMove('f1' as any, 'e1' as any);
      });

      expect(result.current.history[0]?.san).toBe('Re1');
      expect(result.current.fen).toContain('RNBQR1K1');
    });

    it('allows moving Rook from a1 to empty e1 on open 1st rank without misinterpreting as castling', async () => {
      const { result } = renderHook(() => useChessGame());

      // White King on g1, Rook on a1, b1..e1 empty: R4RK1
      act(() => {
        result.current.loadPgnOrFen('r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/3P1N2/PPP2PPP/R4RK1 w kq - 1 6');
      });

      const a1Dests = result.current.dests.get('a1' as any) || [];
      expect(a1Dests).toContain('e1');

      await act(async () => {
        await result.current.handleHumanMove('a1' as any, 'e1' as any);
      });

      expect(result.current.history[0]?.san).toBe('Rae1');
    });

    it('generates standard-compliant PGN with complete headers and move pairs', async () => {
      const { result } = renderHook(() => useChessGame());

      // Initial PGN with 0 moves
      expect(result.current.pgn).toContain('[Event "Partie d\'entraînement"]');
      expect(result.current.pgn).toContain('[Site "Mon Coach Échecs"]');
      expect(result.current.pgn).toContain('[Round "1"]');
      expect(result.current.pgn).toContain('[White "Joueur"]');
      expect(result.current.pgn).toContain('[Black "Maia (1100)"]');
      expect(result.current.pgn).toContain('[Result "*"]');
      expect(result.current.pgn).toContain('[Termination "En cours"]');

      // Make a move
      await act(async () => {
        await result.current.handleHumanMove('e2' as any, 'e4' as any);
      });

      expect(result.current.pgn).toContain('1. e4');
    });

    it('preserves complete PGN moves even when navigating back in history with jumpToMove', async () => {
      const { result } = renderHook(() => useChessGame());

      await act(async () => {
        await result.current.handleHumanMove('e2' as any, 'e4' as any);
      });

      // Jump back to starting position (-1)
      act(() => {
        result.current.jumpToMove(-1);
      });

      // Board is at starting position, but exported PGN must still contain the full played game!
      expect(result.current.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(result.current.pgn).toContain('1. e4');
      expect(result.current.history.length).toBeGreaterThanOrEqual(1);
    });

    it('includes SetUp and FEN headers when playing from custom position', () => {
      const { result } = renderHook(() => useChessGame());
      const customFen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/3P1N2/PPP2PPP/RNBQ1RK1 w kq - 1 6';

      act(() => {
        result.current.loadPgnOrFen(customFen);
      });

      expect(result.current.pgn).toContain('[SetUp "1"]');
      expect(result.current.pgn).toContain(`[FEN "${customFen}"]`);
    });

    it('correctly handles branching history when playing a move after jumping back', async () => {
      const { result } = renderHook(() => useChessGame());

      // Move 1
      await act(async () => {
        await result.current.handleHumanMove('e2' as any, 'e4' as any);
      });

      // Jump back to beginning
      act(() => {
        result.current.jumpToMove(-1);
      });

      // Play alternative move 1
      await act(async () => {
        await result.current.handleHumanMove('d2' as any, 'd4' as any);
      });

      expect(result.current.history[0]?.san).toBe('d4');
      expect(result.current.pgn).toContain('1. d4');
      expect(result.current.pgn).not.toContain('1. e4');
    });

    it('exports PGN with checkmate result and termination', () => {
      const { result } = renderHook(() => useChessGame());
      // Scholar's mate final position
      act(() => {
        result.current.loadPgnOrFen('r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4');
      });

      expect(result.current.isGameOver).toBe(true);
      expect(result.current.pgn).toContain('[Result "1-0"]');
      expect(result.current.pgn).toContain('[Termination "Les Blancs gagnent par échec et mat"]');
    });

    it('exports PGN with stalemate result and termination', () => {
      const { result } = renderHook(() => useChessGame());
      // Classic stalemate position (Black King on a8, White King on c7, White Queen on b6)
      act(() => {
        result.current.loadPgnOrFen('k7/2K5/1Q6/8/8/8/8/8 b - - 0 1');
      });

      expect(result.current.isGameOver).toBe(true);
      expect(result.current.pgn).toContain('[Result "1/2-1/2"]');
      expect(result.current.pgn).toContain('[Termination "Partie nulle (pat)"]');
    });

    it('formats move numbering with ellipsis when Black moves first from custom FEN', () => {
      const { result } = renderHook(() => useChessGame());
      // FEN with black to move at move 12
      const fenBlackMove = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/3P1N2/PPP2PPP/RNBQ1RK1 b kq - 1 12';
      act(() => {
        result.current.loadPgnOrFen(fenBlackMove);
      });

      expect(result.current.pgn).toContain('[SetUp "1"]');
      expect(result.current.pgn).toContain(`[FEN "${fenBlackMove}"]`);
    });

    it('computes rich gameOverState on checkmate with victory, score, and modal dismissal', () => {
      const { result } = renderHook(() => useChessGame());
      // Scholar's mate: White checkmates Black. Player is White -> victory!
      act(() => {
        result.current.loadPgnOrFen('r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4');
      });

      expect(result.current.isGameOver).toBe(true);
      expect(result.current.gameOverState.isGameOver).toBe(true);
      expect(result.current.gameOverState.reason).toBe('checkmate');
      expect(result.current.gameOverState.winner).toBe('white');
      expect(result.current.gameOverState.userResult).toBe('win');
      expect(result.current.gameOverState.scoreDisplay).toBe('1-0');
      expect(result.current.gameOverState.title).toBe('Victoire par échec et mat !');
      expect(result.current.gameOverState.subtitle).toContain('maté le Roi adverse');
      expect(result.current.gameOverState.isOpen).toBe(true);

      // Dismiss game over modal
      act(() => {
        result.current.dismissGameOver();
      });
      expect(result.current.gameOverState.isOpen).toBe(false);

      // Reopen game over modal
      act(() => {
        result.current.showGameOver();
      });
      expect(result.current.gameOverState.isOpen).toBe(true);
    });

    it('computes gameOverState with loss when player is checkmated', () => {
      const { result } = renderHook(() => useChessGame());
      // Start game as Black
      act(() => {
        result.current.startNewGame('black');
      });

      // Scholar's mate: White checkmates Black. Player is Black -> loss!
      act(() => {
        result.current.loadPgnOrFen('r1bqkb1r/pppp1Qpp/2n5/4p3/2B1n3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4');
      });

      expect(result.current.gameOverState.isGameOver).toBe(true);
      expect(result.current.gameOverState.userResult).toBe('loss');
      expect(result.current.gameOverState.title).toBe('Échec et mat !');
      expect(result.current.gameOverState.subtitle).toContain("L'ordinateur remporte la partie");
    });

    it('computes gameOverState on stalemate', () => {
      const { result } = renderHook(() => useChessGame());
      act(() => {
        result.current.loadPgnOrFen('k7/2K5/1Q6/8/8/8/8/8 b - - 0 1');
      });

      expect(result.current.gameOverState.isGameOver).toBe(true);
      expect(result.current.gameOverState.reason).toBe('stalemate');
      expect(result.current.gameOverState.userResult).toBe('draw');
      expect(result.current.gameOverState.scoreDisplay).toBe('1/2-1/2');
      expect(result.current.gameOverState.title).toBe('Partie nulle par pat');
    });

    it('does not trigger blunder alert when player delivers checkmate with blunder guard enabled', async () => {
      const { result } = renderHook(() => useChessGame());

      // Position right before Qxf7# (White to move)
      act(() => {
        result.current.loadPgnOrFen('r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 4');
      });

      expect(result.current.blunderGuardEnabled).toBe(true);

      // White plays Qxf7#
      await act(async () => {
        await result.current.handleHumanMove('f3' as any, 'f7' as any);
      });

      // Must NOT open blunder alert
      expect(result.current.blunderState.isOpen).toBe(false);
      // Move must not be undone
      expect(result.current.history[0]?.san).toBe('Qxf7#');
      expect(result.current.gameOverState.isGameOver).toBe(true);
      expect(result.current.gameOverState.reason).toBe('checkmate');
      expect(result.current.gameOverState.userResult).toBe('win');
      expect(result.current.gameOverState.title).toBe('Victoire par échec et mat !');
      expect(result.current.evalResult.score).toBe('+M0');
      expect(result.current.evalResult.numericScore).toBe(10);
    });
  });
});
