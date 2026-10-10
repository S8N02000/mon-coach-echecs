import React, { useEffect, useRef } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, RotateCcw } from 'lucide-react';

interface MoveHistoryProps {
  history: { san: string; fen: string }[];
  currentMoveIndex: number; // -1 pour la position initiale
  onJumpToMove: (index: number) => void;
  onUndo: () => void;
  canUndo: boolean;
  onRestart?: () => void;
  isGameOver?: boolean;
  resultDisplay?: string;
  resultReason?: string;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  history,
  currentMoveIndex,
  onJumpToMove,
  onUndo,
  canUndo,
  onRestart,
  isGameOver,
  resultDisplay,
  resultReason,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Regroupement des coups par paire (Blancs / Noirs)
  const movePairs: { num: number; white?: { san: string; index: number }; black?: { san: string; index: number } }[] = [];
  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: { san: history[i].san, index: i },
      black: history[i + 1] ? { san: history[i + 1].san, index: i + 1 } : undefined,
    });
  }

  // Auto-scroll vers le dernier coup joué
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history.length]);

  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col flex-1 min-h-[220px]">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5 mb-2">
        <h3 className="font-semibold text-zinc-100 text-sm">Historique des Coups</h3>
        <span className="text-[11px] text-zinc-400 font-mono">
          {history.length} demi-coups
        </span>
      </div>

      {/* Liste déroulante des coups */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-[200px] pr-1 space-y-1 text-xs">
        {movePairs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 italic">
            La partie n'a pas encore commencé.
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.num}
              className="grid grid-cols-12 gap-1 py-1 px-2 rounded-lg hover:bg-zinc-800/50 transition-colors items-center"
            >
              <span className="col-span-2 text-zinc-500 font-mono text-[11px]">
                {pair.num}.
              </span>
              <button
                onClick={() => pair.white && onJumpToMove(pair.white.index)}
                className={`col-span-5 text-left py-0.5 px-1.5 rounded transition-all font-mono ${
                  currentMoveIndex === pair.white?.index
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-zinc-200 hover:text-white hover:bg-zinc-700/60'
                }`}
              >
                {pair.white?.san}
              </button>
              {pair.black ? (
                <button
                  onClick={() => onJumpToMove(pair.black!.index)}
                  className={`col-span-5 text-left py-0.5 px-1.5 rounded transition-all font-mono ${
                    currentMoveIndex === pair.black.index
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'text-zinc-200 hover:text-white hover:bg-zinc-700/60'
                  }`}
                >
                  {pair.black.san}
                </button>
              ) : (
                <span className="col-span-5" />
              )}
            </div>
          ))
        )}

        {isGameOver && resultDisplay && resultDisplay !== '*' && (
          <div className="mt-2 py-1.5 px-3 text-center font-bold text-xs bg-zinc-800/90 rounded-lg border border-zinc-700/70 text-zinc-100 flex items-center justify-center gap-2 font-mono">
            <span className="text-amber-400 font-extrabold">{resultDisplay}</span>
            {resultReason && <span className="text-zinc-400 text-[11px] font-sans font-normal">({resultReason})</span>}
          </div>
        )}
      </div>

      {/* Barre de navigation temporelle et Undo */}
      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onJumpToMove(-1)}
            disabled={currentMoveIndex === -1}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 rounded-lg transition-all"
            title="Position initiale"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onJumpToMove(Math.max(-1, currentMoveIndex - 1))}
            disabled={currentMoveIndex === -1}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 rounded-lg transition-all"
            title="Coup précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onJumpToMove(Math.min(history.length - 1, currentMoveIndex + 1))}
            disabled={currentMoveIndex >= history.length - 1}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 rounded-lg transition-all"
            title="Coup suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onJumpToMove(history.length - 1)}
            disabled={currentMoveIndex >= history.length - 1}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-zinc-300 rounded-lg transition-all"
            title="Dernier coup"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {onRestart && (
            <button
              onClick={onRestart}
              disabled={history.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-zinc-800/80 hover:bg-red-950/60 hover:text-red-300 hover:border-red-800/50 text-zinc-400 border border-zinc-700/80 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
              title="Refaire la partie à 0 (recommencer depuis le début)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
              <span>À zéro</span>
            </button>
          )}

          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-amber-600/30 hover:text-amber-200 text-zinc-300 border border-zinc-700 hover:border-amber-500/50 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
            title="Annuler le dernier coup joué"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reprendre
          </button>
        </div>
      </div>
    </div>
  );
};
