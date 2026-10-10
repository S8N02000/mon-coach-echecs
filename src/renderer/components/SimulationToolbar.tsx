import React from 'react';
import {
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { ProgressiveCoachMove } from '../types/chess';

interface SimulationToolbarProps {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  currentMove?: ProgressiveCoachMove;
  playerColor: 'white' | 'black';
  onExit: () => void;
  onStep: (action: 'first' | 'prev' | 'next' | 'last') => void;
}

export const SimulationToolbar: React.FC<SimulationToolbarProps> = ({
  active,
  stepIndex,
  totalSteps,
  currentMove,
  playerColor,
  onExit,
  onStep,
}) => {
  if (!active) return null;

  const isPlayerMove =
    currentMove && currentMove.color === (playerColor === 'white' ? 'w' : 'b');

  return (
    <div className="w-full max-w-[min(650px,calc(100vh-210px))] bg-zinc-900/95 border border-indigo-500/40 rounded-xl p-2 shadow-xl backdrop-blur-md flex flex-wrap items-center justify-between gap-2 z-20 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Intitulé du mode simulation */}
      <div className="flex items-center gap-2">
        <div className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-200">
          <Eye className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Mode simulation —</span>
          <span>Visualisation du futur</span>
        </div>
        <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-700/50">
          {stepIndex < 0 ? 'Départ' : `${stepIndex + 1}/${totalSteps}`}
        </span>
      </div>

      {/* Barre de navigation coup par coup */}
      <div className="flex items-center gap-1.5">
        <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => onStep('first')}
            disabled={stepIndex <= -1}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Position de départ (|<)"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStep('prev')}
            disabled={stepIndex <= -1}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Coup précédent (<)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStep('next')}
            disabled={stepIndex >= totalSteps - 1}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Coup suivant (>)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onStep('last')}
            disabled={stepIndex >= totalSteps - 1}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Dernier coup (>|)"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Détail du coup actif avec largeur fixe garantie pour ne jamais décaler les flèches */}
        <div className="w-16 h-7 flex items-center justify-center shrink-0">
          {currentMove && stepIndex >= 0 ? (
            <div className="w-full flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-800/90 border border-zinc-700/60 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isPlayerMove ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]' : 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]'
                }`}
              />
              <span className="text-zinc-100 font-bold truncate">{currentMove.san}</span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center px-2 py-0.5 rounded-lg bg-zinc-950/40 border border-zinc-800/50 text-[11px] text-zinc-500 font-mono">
              --
            </div>
          )}
        </div>

        {/* Bouton Quitter la simulation */}
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 text-xs font-medium transition-all shadow-sm active:scale-95"
          title="Quitter la simulation (Touche Échap)"
        >
          <X className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Quitter</span>
          <kbd className="hidden md:inline-block px-1 text-[9px] bg-rose-950/60 rounded border border-rose-800/50 text-rose-400 font-mono">
            Échap
          </kbd>
        </button>
      </div>
    </div>
  );
};
