import React from 'react';
import { Trophy, Crown, Scale, RotateCcw, FileDown, Eye, CheckCircle2, AlertOctagon } from 'lucide-react';
import { GameOverState } from '../types/chess';

interface GameOverAlertProps {
  gameOverState: GameOverState;
  botDisplayName: string;
  onRestart: () => void;
  onExportPgn: () => void;
  onDismiss: () => void;
  onReopen: () => void;
}

export const GameOverAlert: React.FC<GameOverAlertProps> = ({
  gameOverState,
  botDisplayName,
  onRestart,
  onExportPgn,
  onDismiss,
  onReopen,
}) => {
  if (!gameOverState.isGameOver) return null;

  const isWin = gameOverState.userResult === 'win';
  const isLoss = gameOverState.userResult === 'loss';
  const isDraw = gameOverState.userResult === 'draw';

  return (
    <>
      {/* 1. Bandeau contextuel permanent au-dessus de l'échiquier */}
      <div
        className={`w-full rounded-xl p-3.5 shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
          isWin
            ? 'bg-gradient-to-r from-emerald-950/90 via-emerald-900/80 to-zinc-900 border-emerald-500/50 text-emerald-100'
            : isLoss
            ? 'bg-gradient-to-r from-rose-950/90 via-rose-900/80 to-zinc-900 border-rose-500/50 text-rose-100'
            : 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border-zinc-700 text-zinc-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`p-2 rounded-lg shrink-0 ${
                isWin
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : isLoss
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                  : 'bg-zinc-700/50 border border-zinc-600 text-zinc-300'
              }`}
            >
              {isWin ? (
                <Trophy className="w-5 h-5 text-amber-400" />
              ) : isLoss ? (
                <AlertOctagon className="w-5 h-5 text-rose-400" />
              ) : (
                <Scale className="w-5 h-5 text-zinc-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm tracking-tight">
                  {gameOverState.title}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-black/40 border border-white/10">
                  {gameOverState.scoreDisplay}
                </span>
              </div>
              <p className="text-xs opacity-90 truncate mt-0.5">
                {gameOverState.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {!gameOverState.isOpen && (
              <button
                onClick={onReopen}
                className="px-2.5 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 border border-white/10 text-xs font-medium transition-all"
                title="Afficher les détails de fin de partie"
              >
                Bilan
              </button>
            )}
            <button
              onClick={onExportPgn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition-all active:scale-95 shadow-sm"
              title="Enregistrer le PGN complet de la partie"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>PGN</span>
            </button>
            <button
              onClick={onRestart}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition-all active:scale-95 shadow-md ${
                isWin
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : isLoss
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Refaire à 0</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Modal Centré Flottant à l'issue de la partie */}
      {gameOverState.isOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-center flex flex-col items-center">
            {/* Icône principale avec halo lumineux */}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 border shadow-inner ${
                isWin
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-amber-400 shadow-amber-500/10'
                  : isLoss
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-rose-500/10'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
            >
              {isWin ? (
                <Trophy className="w-9 h-9 text-amber-400" />
              ) : isLoss ? (
                <Crown className="w-9 h-9 text-rose-400" />
              ) : (
                <Scale className="w-9 h-9 text-zinc-300" />
              )}
            </div>

            {/* Score Pill */}
            <div className="mb-2 px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-300">
              Score final : {gameOverState.scoreDisplay}
            </div>

            {/* Titre */}
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
              {gameOverState.title}
            </h2>

            {/* Sous-titre explicatif */}
            <p className="text-sm text-zinc-400 mt-2 max-w-xs leading-relaxed">
              {gameOverState.subtitle}
            </p>

            {/* Vainqueur déclaré */}
            <div className="mt-4 px-4 py-2 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs flex items-center gap-2">
              <span className="text-zinc-500">Résultat :</span>
              {gameOverState.winner === 'draw' ? (
                <span className="font-semibold text-zinc-300">Partie nulle</span>
              ) : isWin ? (
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Victoire du Joueur
                </span>
              ) : (
                <span className="font-semibold text-rose-400 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" /> Victoire de {botDisplayName}
                </span>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="mt-6 flex flex-col w-full gap-2.5">
              <button
                onClick={onRestart}
                className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                  isWin
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                    : isLoss
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950/40'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-950/40'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Nouvelle partie (Refaire à 0)</span>
              </button>

              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={onExportPgn}
                  className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-200 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <FileDown className="w-4 h-4 text-indigo-400" />
                  <span>Exporter PGN</span>
                </button>

                <button
                  onClick={onDismiss}
                  className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-zinc-300 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-4 h-4 text-zinc-400" />
                  <span>Voir l'échiquier</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
