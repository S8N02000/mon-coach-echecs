import React, { useState, useEffect } from 'react';
import { Chessboard } from './components/Chessboard';
import { EvalBar } from './components/EvalBar';
import { BlunderAlert } from './components/BlunderAlert';
import { GameOverAlert } from './components/GameOverAlert';
import { CoachPanel } from './components/CoachPanel';
import { MoveHistory } from './components/MoveHistory';
import { GameControls } from './components/GameControls';
import { PgnModal } from './components/PgnModal';
import { SettingsModal } from './components/SettingsModal';
import { ProgressiveCoachWidget } from './components/ProgressiveCoachWidget';
import { SimulationToolbar } from './components/SimulationToolbar';
import { useChessGame } from './hooks/useChessGame';
import { useProgressiveCoach } from './hooks/useProgressiveCoach';
import { SystemStatus } from './types/chess';
import { Bot, User, Sparkles, CheckCircle2, AlertCircle, Zap, RotateCcw, Trophy, Crown } from 'lucide-react';
import appLogo from './assets/logo.png';
import { loadUserSettings, saveUserSettings } from './utils/storage';

export const App: React.FC = () => {
  const game = useChessGame();
  const progressiveCoach = useProgressiveCoach({
    fen: game.fen,
    playerColor: game.actualPlayerColor,
    isPlayerTurn: game.isPlayerTurn,
    isGameOver: game.gameOverState.isGameOver,
  });
  const [isPgnModalOpen, setIsPgnModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const refreshStatus = async () => {
    if (window.chessAPI?.getSystemStatus) {
      try {
        const s = await window.chessAPI.getSystemStatus();
        setSystemStatus(s);
      } catch (err) {
        console.warn('Error fetching system status:', err);
      }
    }
  };

  useEffect(() => {
    refreshStatus();
    // Restaurer le modèle Ollama sauvegardé au démarrage
    const saved = loadUserSettings();
    if (saved.selectedOllamaModel && window.chessAPI?.setOllamaModel) {
      window.chessAPI.setOllamaModel(saved.selectedOllamaModel).catch(() => {});
    }

    // Rafraîchissement périodique toutes les 3.5s pour détecter Ollama en direct
    const interval = setInterval(() => {
      refreshStatus();
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleExportFile = async () => {
    if (window.chessAPI?.exportPgnFile) {
      await window.chessAPI.exportPgnFile(game.pgn);
    }
  };

  const handleSelectModel = async (model: string) => {
    if (window.chessAPI?.setOllamaModel) {
      await window.chessAPI.setOllamaModel(model);
      saveUserSettings({ selectedOllamaModel: model });
      refreshStatus();
    }
  };

  const isOllamaOnline = Boolean(systemStatus?.ollama?.online);
  const activeModel = systemStatus?.ollama?.selectedModel || 'deepseek-r1';
  const gpuName = systemStatus?.gpu?.name;
  const totalVramGb = systemStatus?.gpu?.totalVramGb;
  const isLinux = typeof window !== 'undefined' && window.chessAPI?.platform === 'linux';
  const botDisplayName =
    game.botLevel === 'stockfish'
      ? 'Stockfish (Maître)'
      : isLinux
      ? `Stockfish (${game.botLevel})`
      : `Maia Chess (${game.botLevel})`;

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden">
      {/* Barre supérieure moderne */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-zinc-900 border border-zinc-800">
            <img src={appLogo} alt="Mon Coach Échecs" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm text-zinc-100 tracking-tight">
                Mon Coach Échecs
              </h1>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-2.5 h-2.5" /> IA Locale
              </span>
            </div>
          </div>
        </div>

        {/* Badges de statut matériel & IA */}
        <div className="flex items-center gap-3">
          {/* Module Coach Décisionnel Progressif (Angle supérieur droit) */}
          <ProgressiveCoachWidget
            enabled={progressiveCoach.enabled}
            currentLevel={progressiveCoach.currentLevel}
            status={progressiveCoach.status}
            issueType={progressiveCoach.issueType}
            issueDelta={progressiveCoach.issueDelta}
            issueLabelFr={progressiveCoach.issueLabelFr}
            targetPiece={progressiveCoach.targetPiece}
            targetDescriptionFr={progressiveCoach.targetDescriptionFr}
            hasSimulationMoves={progressiveCoach.simulationMoves.length > 0}
            isLoading={progressiveCoach.isLoading}
            simulationActive={progressiveCoach.simulationActive}
            onToggleEnabled={progressiveCoach.toggleEnabled}
            onAdvanceLevel={progressiveCoach.advanceLevel}
            onSetLevel={progressiveCoach.setCurrentLevel}
            onStartSimulation={progressiveCoach.startSimulation}
          />

          <div className="w-px h-5 bg-zinc-800 hidden sm:block" />

          {totalVramGb && totalVramGb > 0 ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{gpuName ? gpuName.replace('NVIDIA GeForce ', '') : 'GPU'}</span>
              <span className="text-indigo-400 font-bold">({totalVramGb} Go)</span>
            </div>
          ) : null}

          <div
            onClick={() => {
              refreshStatus();
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs cursor-pointer hover:border-zinc-700 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-400">Ollama :</span>
              {isOllamaOnline ? (
                <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> {activeModel}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                  <AlertCircle className="w-3 h-3" /> Hors ligne
                </span>
              )}
            </div>
            <div className="w-px h-3 bg-zinc-800 mx-1" />
            <div className="flex items-center gap-1 text-[11px] text-zinc-400">
              <span>Stockfish</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            </div>
          </div>
        </div>
      </header>

      {/* Corps principal : Échiquier & Panneau latéral */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden p-3 lg:p-4 gap-4 max-w-7xl mx-auto w-full items-center lg:items-stretch justify-center">
        {/* Colonne gauche : Échiquier et Barre d'évaluation */}
        <div className="flex flex-col flex-1 items-center justify-center gap-2 lg:gap-3 max-w-[720px] w-full min-w-0">
          {/* Badge Adversaire (Haut) */}
          <div className="w-full flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 border border-zinc-700">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-200">
                    {botDisplayName}
                  </span>
                  {game.gameOverState.isGameOver && game.gameOverState.userResult === 'loss' && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-400" /> Vainqueur
                    </span>
                  )}
                  {game.gameOverState.isGameOver && game.gameOverState.userResult === 'win' && (
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-medium border border-zinc-700">
                      Maté
                    </span>
                  )}
                </div>
                {game.isBotThinking && (
                  <span className="text-[10px] text-indigo-400 animate-pulse font-medium">
                    calcule son coup...
                  </span>
                )}
              </div>
            </div>
            <span className="text-zinc-500 font-mono text-[11px]">
              {game.boardOrientation === 'white' ? 'Noirs' : 'Blancs'}
            </span>
          </div>

          {/* Bandeau d'alerte gaffe (si active) */}
          <BlunderAlert
            isOpen={game.blunderState.isOpen}
            deltaScore={game.blunderState.deltaScore}
            onUndo={game.handleBlunderUndo}
            onConfirm={game.handleBlunderConfirm}
            onAskCoach={game.askCoach}
          />

          {/* Bandeau d'alerte / Modal de fin de partie & Échec et mat */}
          <GameOverAlert
            gameOverState={game.gameOverState}
            botDisplayName={botDisplayName}
            onRestart={() => game.startNewGame()}
            onExportPgn={handleExportFile}
            onDismiss={game.dismissGameOver}
            onReopen={game.showGameOver}
          />

          {/* Bandeau & Contrôles du Ghost Board (Simulation Palier 4) */}
          <SimulationToolbar
            active={progressiveCoach.simulationActive}
            stepIndex={progressiveCoach.simulationStepIndex}
            totalSteps={progressiveCoach.simulationMoves.length}
            currentMove={
              progressiveCoach.simulationStepIndex >= 0
                ? progressiveCoach.simulationMoves[progressiveCoach.simulationStepIndex]
                : undefined
            }
            playerColor={game.actualPlayerColor}
            onExit={progressiveCoach.exitSimulation}
            onStep={progressiveCoach.stepSimulation}
          />

          {/* Conteneur Échiquier + Eval Bar */}
          <div className="flex items-center justify-center gap-3 w-full h-[min(600px,calc(100vh-210px))] min-h-[340px]">
            <EvalBar
              score={game.evalResult.score}
              numericScore={game.evalResult.numericScore}
              orientation={game.boardOrientation}
            />
            <div
              className={`flex-1 h-full max-w-[min(600px,calc(100vh-210px))] flex items-center justify-center transition-all ${
                progressiveCoach.simulationActive
                  ? 'ring-2 ring-indigo-500/50 rounded-2xl shadow-indigo-500/10'
                  : ''
              }`}
            >
              <Chessboard
                fen={progressiveCoach.displayFen}
                orientation={game.boardOrientation}
                turnColor={game.turnColor}
                dests={progressiveCoach.simulationActive ? new Map() : game.dests}
                isInteractive={
                  !progressiveCoach.simulationActive &&
                  game.isPlayerTurn &&
                  !game.gameOverState.isGameOver
                }
                shapes={
                  progressiveCoach.simulationActive
                    ? progressiveCoach.simulationShapes
                    : game.shapes
                }
                lastMove={
                  progressiveCoach.simulationActive
                    ? undefined
                    : game.history.length > 0
                    ? [game.history[game.history.length - 1].from, game.history[game.history.length - 1].to]
                    : undefined
                }
                onMove={progressiveCoach.simulationActive ? () => {} : game.handleHumanMove}
              />
            </div>
          </div>

          {/* Badge Joueur (Bas) */}
          <div className="w-full flex items-center justify-between px-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 border border-zinc-700">
                <User className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="font-semibold text-zinc-200">Vous</span>
              {game.gameOverState.isGameOver ? (
                game.gameOverState.userResult === 'win' ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1 shadow-sm">
                    <Trophy className="w-3 h-3 text-amber-400" /> Victoire par mat
                  </span>
                ) : game.gameOverState.userResult === 'loss' ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                    Échec et mat
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px] font-bold border border-zinc-700">
                    Partie nulle
                  </span>
                )
              ) : game.isPlayerTurn ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  À votre tour
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => game.startNewGame()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-emerald-600/30 hover:text-emerald-200 hover:border-emerald-500/50 border border-zinc-700 text-zinc-300 text-xs font-semibold transition-all active:scale-95 shadow-sm"
                title="Refaire la partie à 0 (recommencer depuis le début)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Refaire à 0</span>
              </button>

              <span className="text-zinc-500 font-mono text-[11px]">
                {game.boardOrientation === 'white' ? 'Blancs' : 'Noirs'}
              </span>
            </div>
          </div>
        </div>

        {/* Colonne droite : Contrôles, Historique et Bulle Coach */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-1">
          {/* Bulle Coach IA en haut pour visibilité immédiate */}
          <CoachPanel
            coachMessage={game.coachMessage}
            isThinking={game.isCoachThinking}
            vocabularyStyle={game.vocabularyStyle}
            onToggleStyle={game.setVocabularyStyle}
            onAskCoach={game.askCoach}
            canAsk={game.history.length > 0 || game.blunderState.isOpen}
            tacticalSteps={game.tacticalSteps}
            selectedStepIndex={game.selectedStepIndex}
            onSelectStepIndex={game.setSelectedStepIndex}
          />

          {/* Contrôles du jeu et niveau du bot */}
          <GameControls
            botLevel={game.botLevel}
            onSetBotLevel={game.handleSetBotLevel}
            playerColor={game.playerColor}
            onSetPlayerColor={(c) => {
              game.setPlayerColor(c);
              game.startNewGame(c);
            }}
            onNewGame={() => game.startNewGame()}
            onFlipBoard={game.flipBoard}
            blunderGuardEnabled={game.blunderGuardEnabled}
            onToggleBlunderGuard={() => game.setBlunderGuardEnabled(!game.blunderGuardEnabled)}
            soundEnabled={game.soundEnabled}
            onToggleSound={() => game.setSoundEnabled(!game.soundEnabled)}
            onOpenPgnModal={() => setIsPgnModalOpen(true)}
            onOpenSettingsModal={() => {
              refreshStatus();
              setIsSettingsModalOpen(true);
            }}
          />

          {/* Tableau historique des coups */}
          <MoveHistory
            history={game.history}
            currentMoveIndex={game.currentMoveIndex}
            onJumpToMove={game.jumpToMove}
            onUndo={game.handleUndo}
            canUndo={game.history.length > 0}
            onRestart={() => game.startNewGame()}
            isGameOver={game.gameOverState.isGameOver}
            resultDisplay={game.gameOverState.scoreDisplay}
            resultReason={
              game.gameOverState.reason === 'checkmate'
                ? 'Mat'
                : game.gameOverState.reason === 'stalemate'
                ? 'Pat'
                : undefined
            }
          />
        </div>
      </main>

      {/* Modales */}
      <PgnModal
        isOpen={isPgnModalOpen}
        onClose={() => setIsPgnModalOpen(false)}
        pgn={game.pgn}
        onLoadPgnOrFen={game.loadPgnOrFen}
        onExportFile={handleExportFile}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        status={systemStatus}
        onRefreshStatus={refreshStatus}
        onSelectModel={handleSelectModel}
      />
    </div>
  );
};
