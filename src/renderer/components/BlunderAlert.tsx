import React from 'react';
import { AlertTriangle, RotateCcw, Play, HelpCircle } from 'lucide-react';

interface BlunderAlertProps {
  isOpen: boolean;
  deltaScore: string;
  onUndo: () => void;
  onConfirm: () => void;
  onAskCoach: () => void;
}

export const BlunderAlert: React.FC<BlunderAlertProps> = ({
  isOpen,
  deltaScore,
  onUndo,
  onConfirm,
  onAskCoach,
}) => {
  if (!isOpen) return null;

  return (
    <div className="w-full bg-gradient-to-r from-red-950/90 via-red-900/80 to-zinc-900 border border-red-600/60 rounded-xl p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-600/20 border border-red-500/40 rounded-lg text-red-400 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-red-200 text-sm">
                Attention : ce coup expose une pièce sans défense !
              </h3>
              <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded text-red-300 text-xs font-mono font-bold">
                {deltaScore}
              </span>
            </div>
            <p className="text-zinc-400 text-xs mt-0.5">
              Stockfish a détecté une réfutation tactique immédiate. Que souhaitez-vous faire ?
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <button
          onClick={onUndo}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shadow-md transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reprendre mon coup
        </button>

        <button
          onClick={onConfirm}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700 transition-all active:scale-95"
        >
          <Play className="w-3.5 h-3.5" />
          Jouer quand même
        </button>

        <button
          onClick={onAskCoach}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-medium transition-all ml-auto active:scale-95"
        >
          <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
          Pourquoi ce coup est mauvais ?
        </button>
      </div>
    </div>
  );
};
