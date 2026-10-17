import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { EvalBar } from '../renderer/components/EvalBar';
import { Chessboard } from '../renderer/components/Chessboard';
import { BlunderAlert } from '../renderer/components/BlunderAlert';
import { GameOverAlert } from '../renderer/components/GameOverAlert';
import { CoachPanel } from '../renderer/components/CoachPanel';
import { GameControls } from '../renderer/components/GameControls';
import { MoveHistory } from '../renderer/components/MoveHistory';
import { SettingsModal } from '../renderer/components/SettingsModal';
import { PgnModal } from '../renderer/components/PgnModal';
import { ErrorBoundary } from '../renderer/components/ErrorBoundary';

describe('Renderer Components', () => {
  describe('Chessboard', () => {
    it('renders and attaches chessground container', () => {
      const { container } = render(
        <Chessboard
          fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
          orientation="white"
          turnColor="white"
          dests={new Map()}
          isInteractive={true}
          onMove={vi.fn()}
        />
      );
      expect(container.firstChild).toBeDefined();
      window.dispatchEvent(new Event('resize'));
    });
  });

  describe('EvalBar', () => {
    it('renders white advantage correctly', () => {
      const { container } = render(<EvalBar score="+1.50" numericScore={1.5} orientation="white" />);
      expect(container.textContent).toContain('+1.50');
    });

    it('renders mate score and black orientation', () => {
      const { container } = render(<EvalBar score="-M2" numericScore={-100} orientation="black" />);
      expect(container.textContent).toContain('-M2');
    });

    it('renders forced mate for white', () => {
      const { container } = render(<EvalBar score="+M1" numericScore={100} orientation="white" />);
      expect(container.textContent).toContain('+M1');
    });
  });

  describe('BlunderAlert', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <BlunderAlert
          isOpen={false}
          deltaScore="-2.5"
          onUndo={vi.fn()}
          onConfirm={vi.fn()}
          onAskCoach={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders and responds to button clicks when open', () => {
      const onUndo = vi.fn();
      const onConfirm = vi.fn();
      const onAskCoach = vi.fn();

      render(
        <BlunderAlert
          isOpen={true}
          deltaScore="-3.2"
          onUndo={onUndo}
          onConfirm={onConfirm}
          onAskCoach={onAskCoach}
        />
      );

      expect(screen.getByText(/Attention : ce coup expose une pièce/i)).toBeDefined();
      expect(screen.getByText(/-3.2/i)).toBeDefined();

      fireEvent.click(screen.getByText(/Reprendre mon coup/i));
      expect(onUndo).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Jouer quand même/i));
      expect(onConfirm).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Pourquoi ce coup est mauvais/i));
      expect(onAskCoach).toHaveBeenCalledTimes(1);
    });
  });

  describe('CoachPanel', () => {
    it('renders thinking state', () => {
      render(
        <CoachPanel
          coachMessage="Dernier message"
          isThinking={true}
          vocabularyStyle="debutant"
          onToggleStyle={vi.fn()}
          onAskCoach={vi.fn()}
          canAsk={true}
        />
      );
      expect(screen.getByText(/Le coach formule son explication bienveillante/i)).toBeDefined();
    });

    it('displays message and allows toggling vocabulary', () => {
      const onToggle = vi.fn();
      const onAsk = vi.fn();

      render(
        <CoachPanel
          coachMessage="Attention à la fourchette en c7 !"
          isThinking={false}
          vocabularyStyle="club"
          onToggleStyle={onToggle}
          onAskCoach={onAsk}
          canAsk={true}
        />
      );

      expect(screen.getByText(/Attention à la fourchette/i)).toBeDefined();
      fireEvent.click(screen.getByText('Débutant'));
      expect(onToggle).toHaveBeenCalledWith('debutant');

      fireEvent.click(screen.getByText(/Demander l'analyse du Coach/i));
      expect(onAsk).toHaveBeenCalledTimes(1);
    });

    it('renders tactical steps chips and allows clicking to select a step', () => {
      const onSelectStep = vi.fn();
      const mockSteps = [
        {
          step: 1,
          uci: 'g6h5',
          from: 'g6',
          to: 'h5',
          piece: 'p',
          color: 'black' as const,
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
          color: 'white' as const,
          san: 'Bc4',
          description: 'Fou blanc se déplace en c4',
          isPupilMove: true,
        },
      ];

      const { rerender } = render(
        <CoachPanel
          coachMessage="Ce coup perd la dame !"
          isThinking={false}
          vocabularyStyle="debutant"
          onToggleStyle={vi.fn()}
          onAskCoach={vi.fn()}
          canAsk={true}
          tacticalSteps={mockSteps}
          selectedStepIndex={null}
          onSelectStepIndex={onSelectStep}
        />
      );

      expect(screen.getByText(/Suite tactique \(2 coups calculés\)/i)).toBeDefined();
      expect(screen.getByText('gxh5')).toBeDefined();
      expect(screen.getByText('Bc4')).toBeDefined();

      fireEvent.click(screen.getByText('gxh5'));
      expect(onSelectStep).toHaveBeenCalledWith(0);

      // Rerender with step 0 selected
      rerender(
        <CoachPanel
          coachMessage="Ce coup perd la dame !"
          isThinking={false}
          vocabularyStyle="debutant"
          onToggleStyle={vi.fn()}
          onAskCoach={vi.fn()}
          canAsk={true}
          tacticalSteps={mockSteps}
          selectedStepIndex={0}
          onSelectStepIndex={onSelectStep}
        />
      );

      expect(screen.getByText(/Pion noir prend la Dame en h5/i)).toBeDefined();
      expect(screen.getByText(/Tout afficher/i)).toBeDefined();

      fireEvent.click(screen.getByText(/Tout afficher/i));
      expect(onSelectStep).toHaveBeenCalledWith(null);
    });
  });

  describe('GameControls', () => {
    it('renders and triggers action buttons', () => {
      const onSetBotLevel = vi.fn();
      const onSetPlayerColor = vi.fn();
      const onNewGame = vi.fn();
      const onFlipBoard = vi.fn();
      const onToggleBlunderGuard = vi.fn();
      const onToggleSound = vi.fn();
      const onOpenPgnModal = vi.fn();
      const onOpenSettingsModal = vi.fn();

      render(
        <GameControls
          botLevel="1100"
          onSetBotLevel={onSetBotLevel}
          playerColor="white"
          onSetPlayerColor={onSetPlayerColor}
          onNewGame={onNewGame}
          onFlipBoard={onFlipBoard}
          blunderGuardEnabled={true}
          onToggleBlunderGuard={onToggleBlunderGuard}
          soundEnabled={true}
          onToggleSound={onToggleSound}
          onOpenPgnModal={onOpenPgnModal}
          onOpenSettingsModal={onOpenSettingsModal}
        />
      );

      fireEvent.click(screen.getByText('Refaire à 0'));
      expect(onNewGame).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Inverser'));
      expect(onFlipBoard).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Sons'));
      expect(onToggleSound).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Anti-Gaffe'));
      expect(onToggleBlunderGuard).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('PGN/FEN'));
      expect(onOpenPgnModal).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Réglages'));
      expect(onOpenSettingsModal).toHaveBeenCalledTimes(1);
    });
  });

  describe('MoveHistory', () => {
    it('renders move list and undo button and restart button', () => {
      const onUndo = vi.fn();
      const onJumpToMove = vi.fn();
      const onRestart = vi.fn();

      render(
        <MoveHistory
          history={[
            { san: 'e4', fen: 'fen1' },
            { san: 'e5', fen: 'fen2' },
            { san: 'Nf3', fen: 'fen3' },
            { san: 'Nc6', fen: 'fen4' },
          ]}
          currentMoveIndex={3}
          onJumpToMove={onJumpToMove}
          onUndo={onUndo}
          canUndo={true}
          onRestart={onRestart}
        />
      );

      expect(screen.getByText('e4')).toBeDefined();
      expect(screen.getByText('e5')).toBeDefined();
      expect(screen.getByText('Nf3')).toBeDefined();
      expect(screen.getByText('Nc6')).toBeDefined();

      fireEvent.click(screen.getByText(/À zéro/i));
      expect(onRestart).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Reprendre/i));
      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('renders move evaluations with score display and blunder badges', () => {
      const onJumpToMove = vi.fn();

      render(
        <MoveHistory
          history={[
            { san: 'e4', fen: 'fen1', scoreDisplay: '+0.2', quality: 'normal' },
            { san: 'e5', fen: 'fen2', scoreDisplay: '+0.1', delta: -0.1, quality: 'normal' },
            { san: 'Qh5', fen: 'fen3', scoreDisplay: '-2.4', delta: -2.5, quality: 'blunder' },
            { san: 'Nc6', fen: 'fen4', scoreDisplay: '-1.2', delta: -0.9, quality: 'mistake' },
            { san: 'Bc4', fen: 'fen5', scoreDisplay: '-1.7', delta: -0.5, quality: 'inaccuracy' },
            { san: 'g6', fen: 'fen6', scoreDisplay: '+1.5', delta: +0.8, quality: 'good' },
          ]}
          currentMoveIndex={2}
          onJumpToMove={onJumpToMove}
          onUndo={vi.fn()}
          canUndo={true}
        />
      );

      // Vérifie les coups
      expect(screen.getByText('e4')).toBeDefined();
      expect(screen.getByText('Qh5')).toBeDefined();

      // Vérifie l'indicateur de gaffe 🔴
      expect(screen.getByText('🔴')).toBeDefined();
      // Vérifie l'indicateur d'erreur ?
      expect(screen.getByText('?')).toBeDefined();
      // Vérifie l'indicateur d'imprécision ?!
      expect(screen.getByText('?!')).toBeDefined();

      // Clic sur un coup passé
      fireEvent.click(screen.getByText('Qh5'));
      expect(onJumpToMove).toHaveBeenCalledWith(2);
    });
  });

  describe('PgnModal', () => {
    it('renders and allows copying and loading PGN', () => {
      const onClose = vi.fn();
      const onLoadPgnOrFen = vi.fn().mockReturnValue(true);
      const onExportFile = vi.fn();

      render(
        <PgnModal
          isOpen={true}
          onClose={onClose}
          pgn="1. e4 e5 2. Nf3 Nc6"
          onLoadPgnOrFen={onLoadPgnOrFen}
          onExportFile={onExportFile}
        />
      );

      expect(screen.getByText(/Exporter la partie/i)).toBeDefined();
      fireEvent.click(screen.getByText(/Enregistrer fichier \.pgn/i));
      expect(onExportFile).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText(/Importer PGN \/ FEN/i));
      const textarea = screen.getByPlaceholderText(/Ex: 1\. e4 e5/i);
      fireEvent.change(textarea, { target: { value: '1. e4 e5' } });
      fireEvent.click(screen.getByText(/Charger la position/i));
      expect(onLoadPgnOrFen).toHaveBeenCalledWith('1. e4 e5');
    });
  });

  describe('SettingsModal', () => {
    it('renders system status and handles model selection', () => {
      const onRefresh = vi.fn();
      const onSelect = vi.fn();
      const onClose = vi.fn();

      const mockStatus = {
        gpu: {
          name: 'NVIDIA GeForce RTX 4070 Ti',
          totalVramGb: 12.0,
          freeVramGb: 11.2,
          hasDedicatedGpu: true,
        },
        ollama: {
          online: true,
          models: ['deepseek-r1:8b', 'deepseek-r1:7b'],
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
          recommendedCatalog: [
            {
              name: 'deepseek-r1:8b',
              displayName: 'DeepSeek-R1 8B',
              sizeFormatted: '5.2 Go',
              parameterSize: '8.2B',
              isInstalled: true,
              isRecommended: true,
              minVramGb: 5.5,
              fitsVram: true,
              badge: 'Idéal',
            },
          ],
          selectedModel: 'deepseek-r1:8b',
        },
        engines: {
          stockfish: true,
          lc0: false,
          maiaWeights: {
            '1100': true,
            '1300': true,
            '1500': true,
          },
        },
      };

      render(
        <SettingsModal
          isOpen={true}
          onClose={onClose}
          status={mockStatus}
          onRefreshStatus={onRefresh}
          onSelectModel={onSelect}
        />
      );

      expect(screen.getByText(/12 Go VRAM/i)).toBeDefined();
      expect(screen.getByText(/NVIDIA GeForce RTX 4070 Ti/i)).toBeDefined();
      expect(screen.getByText(/Opérationnel/i)).toBeDefined();

      fireEvent.click(screen.getByText(/Actualiser/i));
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('ErrorBoundary', () => {
    it('catches and displays fallback on error', () => {
      const ThrowingComponent = () => {
        throw new Error('Test crash');
      };

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText(/Un incident d'affichage est survenu/i)).toBeDefined();
      expect(screen.getByText(/Test crash/i)).toBeDefined();
    });
  });

  describe('GameOverAlert', () => {
    const mockGameOverState = {
      isGameOver: true,
      reason: 'checkmate' as const,
      winner: 'white' as const,
      userResult: 'win' as const,
      title: 'Victoire par échec et mat !',
      subtitle: 'Félicitations ! Vous avez maté le Roi adverse.',
      scoreDisplay: '1-0',
      isOpen: true,
    };

    it('does not render anything when isGameOver is false', () => {
      const { container } = render(
        <GameOverAlert
          gameOverState={{ ...mockGameOverState, isGameOver: false }}
          botDisplayName="Maia Chess (1100)"
          onRestart={vi.fn()}
          onExportPgn={vi.fn()}
          onDismiss={vi.fn()}
          onReopen={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders victory banner, modal, score, and triggers actions', () => {
      const onRestart = vi.fn();
      const onExportPgn = vi.fn();
      const onDismiss = vi.fn();
      const onReopen = vi.fn();

      render(
        <GameOverAlert
          gameOverState={mockGameOverState}
          botDisplayName="Maia Chess (1100)"
          onRestart={onRestart}
          onExportPgn={onExportPgn}
          onDismiss={onDismiss}
          onReopen={onReopen}
        />
      );

      // Check text content
      expect(screen.getAllByText(/Victoire par échec et mat !/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/1-0/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/maté le Roi adverse/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Victoire du Joueur/i)).toBeDefined();

      // Click Refaire à 0
      fireEvent.click(screen.getAllByText(/Refaire à 0/i)[0]);
      expect(onRestart).toHaveBeenCalled();

      // Click Exporter PGN
      fireEvent.click(screen.getByText(/Exporter PGN/i));
      expect(onExportPgn).toHaveBeenCalled();

      // Click Voir l'échiquier (dismiss)
      fireEvent.click(screen.getByText(/Voir l'échiquier/i));
      expect(onDismiss).toHaveBeenCalled();
    });

    it('renders defeat status and Bilan button when modal is dismissed', () => {
      const onReopen = vi.fn();
      render(
        <GameOverAlert
          gameOverState={{
            ...mockGameOverState,
            userResult: 'loss',
            winner: 'black',
            scoreDisplay: '0-1',
            title: 'Échec et mat !',
            subtitle: "Votre Roi est échec et mat. L'ordinateur remporte la partie.",
            isOpen: false,
          }}
          botDisplayName="Stockfish (Maître)"
          onRestart={vi.fn()}
          onExportPgn={vi.fn()}
          onDismiss={vi.fn()}
          onReopen={onReopen}
        />
      );

      expect(screen.getByText(/Échec et mat !/i)).toBeDefined();
      expect(screen.getByText(/0-1/i)).toBeDefined();
      expect(screen.getByText(/Bilan/i)).toBeDefined();

      fireEvent.click(screen.getByText(/Bilan/i));
      expect(onReopen).toHaveBeenCalledTimes(1);
    });

    it('renders draw status correctly in GameOverAlert', () => {
      render(
        <GameOverAlert
          gameOverState={{
            ...mockGameOverState,
            userResult: 'draw',
            winner: 'draw',
            scoreDisplay: '1/2-1/2',
            title: 'Partie nulle par pat',
            subtitle: 'Le Roi n’est pas en échec mais aucun coup légal n’est possible.',
            isOpen: true,
          }}
          botDisplayName="Maia Chess (1100)"
          onRestart={vi.fn()}
          onExportPgn={vi.fn()}
          onDismiss={vi.fn()}
          onReopen={vi.fn()}
        />
      );

      expect(screen.getAllByText(/Partie nulle par pat/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/1\/2-1\/2/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Component edge cases and states', () => {
    it('SettingsModal returns null when closed', () => {
      const { container } = render(
        <SettingsModal
          isOpen={false}
          onClose={vi.fn()}
          status={null}
          onRefreshStatus={vi.fn()}
          onSelectModel={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('SettingsModal handles offline Ollama and allows model selection', () => {
      const onSelect = vi.fn();
      render(
        <SettingsModal
          isOpen={true}
          onClose={vi.fn()}
          status={{
            gpu: { name: 'Intel Iris Xe', totalVramGb: 0, freeVramGb: 0, hasDedicatedGpu: false },
            ollama: {
              online: false,
              models: ['deepseek-r1:8b'],
              installedModelDetails: [
                {
                  name: 'deepseek-r1:8b',
                  displayName: 'DEEPSEEK-R1:8B',
                  sizeFormatted: '5.2 Go',
                  parameterSize: '8B',
                  isInstalled: true,
                  isRecommended: true,
                  minVramGb: 5.0,
                  fitsVram: true,
                  badge: 'Idéal',
                },
              ],
              recommendedCatalog: [
                {
                  name: 'deepseek-r1:1.5b',
                  displayName: 'DeepSeek-R1 1.5B',
                  sizeFormatted: '1.1 Go',
                  parameterSize: '1.5B',
                  isInstalled: false,
                  isRecommended: true,
                  minVramGb: 2.0,
                  fitsVram: true,
                  badge: 'Ultra-Léger',
                },
              ],
              selectedModel: 'other-model',
            },
            engines: { stockfish: true, lc0: false, maiaWeights: { '1100': false, '1300': false, '1500': false } },
          }}
          onRefreshStatus={vi.fn()}
          onSelectModel={onSelect}
        />
      );

      expect(screen.getByText(/Serveur non détecté/i)).toBeDefined();
      expect(screen.getByText(/DeepSeek-R1 1.5B/i)).toBeDefined();

      // Click on installed model card
      fireEvent.click(screen.getByText(/deepseek-r1:8b/i));
      expect(onSelect).toHaveBeenCalledWith('deepseek-r1:8b');
    });

    it('PgnModal returns null when closed', () => {
      const { container } = render(
        <PgnModal
          isOpen={false}
          onClose={vi.fn()}
          pgn=""
          onLoadPgnOrFen={vi.fn()}
          onExportFile={vi.fn()}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it('PgnModal copies PGN to clipboard and shows validation error on invalid input', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const onLoad = vi.fn().mockReturnValue(false);

      render(
        <PgnModal
          isOpen={true}
          onClose={vi.fn()}
          pgn="1. e4 e5"
          onLoadPgnOrFen={onLoad}
          onExportFile={vi.fn()}
        />
      );

      // Copy PGN
      fireEvent.click(screen.getByText(/Copier dans le presse-papier/i));
      expect(writeTextMock).toHaveBeenCalledWith('1. e4 e5');

      // Import tab -> invalid string
      fireEvent.click(screen.getByText(/Importer PGN \/ FEN/i));
      const textarea = screen.getByPlaceholderText(/Ex: 1\. e4 e5/i);
      fireEvent.change(textarea, { target: { value: 'invalid pgn gibberish' } });
      fireEvent.click(screen.getByText(/Charger la position/i));

      expect(onLoad).toHaveBeenCalledWith('invalid pgn gibberish');
      expect(screen.getByText(/Format invalide/i)).toBeDefined();
    });

    it('GameControls handles selecting different bot levels and colors', () => {
      const onSetBotLevel = vi.fn();
      const onSetPlayerColor = vi.fn();

      render(
        <GameControls
          botLevel="1100"
          onSetBotLevel={onSetBotLevel}
          playerColor="white"
          onSetPlayerColor={onSetPlayerColor}
          onNewGame={vi.fn()}
          onFlipBoard={vi.fn()}
          blunderGuardEnabled={false}
          onToggleBlunderGuard={vi.fn()}
          soundEnabled={false}
          onToggleSound={vi.fn()}
          onOpenPgnModal={vi.fn()}
          onOpenSettingsModal={vi.fn()}
        />
      );

      // Change bot level by clicking bot button
      const botButtons = screen.getAllByRole('button');
      const maia1500 = botButtons.find((b) => b.textContent?.includes('1500'));
      if (maia1500) {
        fireEvent.click(maia1500);
        expect(onSetBotLevel).toHaveBeenCalledWith('1500');
      }

      const maia2100 = botButtons.find((b) => b.textContent?.includes('2100'));
      if (maia2100) {
        fireEvent.click(maia2100);
        expect(onSetBotLevel).toHaveBeenCalledWith('2100');
      }

      const sfBtn = botButtons.find((b) => b.textContent?.includes('Stockfish Grand Maître'));
      if (sfBtn) {
        fireEvent.click(sfBtn);
        expect(onSetBotLevel).toHaveBeenCalledWith('stockfish');
      }

      // Change player color
      fireEvent.click(screen.getByText(/Noirs ⚫/i));
      expect(onSetPlayerColor).toHaveBeenCalledWith('black');
    });

    it('Chessboard renders with custom shapes and last move highlight', () => {
      const { container } = render(
        <Chessboard
          fen="rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1"
          orientation="white"
          turnColor="black"
          dests={new Map()}
          isInteractive={false}
          shapes={[
            { orig: 'e2' as any, dest: 'e4' as any, brush: 'green' },
            { orig: 'g8' as any, dest: 'f6' as any, brush: 'red' },
          ]}
          lastMove={['e2' as any, 'e4' as any]}
          onMove={vi.fn()}
        />
      );
      expect(container.firstChild).toBeDefined();
    });
  });
});
