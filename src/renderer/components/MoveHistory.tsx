import React, { useEffect, useRef } from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, RotateCcw } from 'lucide-react';
import { MoveHistoryItem } from '../types/chess';

interface MoveHistoryProps {
  history: MoveHistoryItem[];
  currentMoveIndex: number; // -1 pour la position initiale
  onJumpToMove: (index: number) => void;
  onUndo: () => void;
  canUndo: boolean;
  onRestart?: () => void;
  isGameOver?: boolean;
  resultDisplay?: string;
  resultReason?: string;
}

interface MoveEntryProps {
  item: MoveHistoryItem;
  index: number;
  isCurrent: boolean;
  onSelect: (index: number) => void;
  moveNumber: number;
  colorName: string;
}

const MoveEntryButton: React.FC<MoveEntryProps> = ({
  item,
  index,
  isCurrent,
  onSelect,
  moveNumber,
  colorName,
}) => {
  const isBlunder = item.quality === 'blunder' || (item.delta !== undefined && item.delta <= -2.0);
  const isMistake = !isBlunder && (item.quality === 'mistake' || (item.delta !== undefined && item.delta <= -0.8));
  const isInaccuracy = !isBlunder && !isMistake && (item.quality === 'inaccuracy' || (item.delta !== undefined && item.delta <= -0.4));
  const isGood = !isBlunder && !isMistake && !isInaccuracy && (item.quality === 'good' || (item.delta !== undefined && item.delta >= 0.6));

  const deltaStr =
    item.delta !== undefined
      ? item.delta > 0
        ? `+${item.delta.toFixed(1)}`
        : item.delta.toFixed(1)
      : undefined;

  let tooltip = `Coup ${moveNumber} (${colorName}) : ${item.san}`;
  if (item.scoreDisplay) {
    tooltip += ` • Score : ${item.scoreDisplay}`;
  }
  if (deltaStr) {
    tooltip += ` (${deltaStr} pts)`;
  }
  if (isBlunder) tooltip += ' ⚠️ Gaffe majeure !';
  else if (isMistake) tooltip += ' ⚠️ Erreur tactique';
  else if (isInaccuracy) tooltip += ' ⚠️ Imprécision';
  else if (isGood) tooltip += ' ✨ Excellent coup';

  return (
    <button
      onClick={() => onSelect(index)}
      title={tooltip}
      className={`group flex items-center justify-between py-1 px-1.5 rounded-lg transition-all text-xs font-mono w-full ${
        isCurrent
          ? 'bg-indigo-600 text-white font-bold shadow-md ring-1 ring-indigo-400/50'
          : 'text-zinc-200 hover:text-white hover:bg-zinc-800/80'
      }`}
    >
      <span className="font-semibold tracking-tight">{item.san}</span>

      {/* Badge score & indicateur d'évaluation */}
      {item.scoreDisplay && (
        <span className="flex items-center gap-1 shrink-0 text-[10px]">
          {isBlunder ? (
            <span
              className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-bold ${
                isCurrent
                  ? 'bg-rose-950/80 text-rose-200 border border-rose-400/50'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              <span>{item.scoreDisplay}</span>
              <span className="text-[9px] font-black text-rose-400">🔴</span>
            </span>
          ) : isMistake ? (
            <span
              className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded font-medium ${
                isCurrent
                  ? 'bg-amber-950/80 text-amber-200 border border-amber-400/50'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              <span>{item.scoreDisplay}</span>
              <span className="text-[9px] font-bold text-amber-400">?</span>
            </span>
          ) : isInaccuracy ? (
            <span
              className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded ${
                isCurrent
                  ? 'bg-yellow-950/80 text-yellow-200 border border-yellow-400/40'
                  : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30'
              }`}
            >
              <span>{item.scoreDisplay}</span>
              <span className="text-[9px] text-yellow-400">?!</span>
            </span>
          ) : (
            <span
              className={`font-mono transition-colors ${
                isCurrent
                  ? 'text-indigo-200'
                  : isGood
                  ? 'text-emerald-400 font-medium'
                  : 'text-zinc-400 group-hover:text-zinc-300'
              }`}
            >
              ({item.scoreDisplay})
            </span>
          )}
        </span>
      )}
    </button>
  );
};

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
  const movePairs: {
    num: number;
    white?: { item: MoveHistoryItem; index: number };
    black?: { item: MoveHistoryItem; index: number };
  }[] = [];

  for (let i = 0; i < history.length; i += 2) {
    movePairs.push({
      num: Math.floor(i / 2) + 1,
      white: history[i] ? { item: history[i], index: i } : undefined,
      black: history[i + 1] ? { item: history[i + 1], index: i + 1 } : undefined,
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
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-zinc-100 text-sm">Historique des Coups</h3>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">
          {history.length} demi-coups
        </span>
      </div>

      {/* Liste déroulante des coups avec scores et variations */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto max-h-[200px] pr-1 space-y-1 text-xs">
        {movePairs.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 italic">
            La partie n'a pas encore commencé.
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.num}
              className="grid grid-cols-12 gap-1 py-0.5 px-1.5 rounded-lg hover:bg-zinc-800/40 transition-colors items-center"
            >
              <span className="col-span-2 text-zinc-500 font-mono text-[11px] font-medium">
                {pair.num}.
              </span>

              <div className="col-span-5 min-w-0">
                {pair.white && (
                  <MoveEntryButton
                    item={pair.white.item}
                    index={pair.white.index}
                    isCurrent={currentMoveIndex === pair.white.index}
                    onSelect={onJumpToMove}
                    moveNumber={pair.num}
                    colorName="Blancs"
                  />
                )}
              </div>

              <div className="col-span-5 min-w-0">
                {pair.black ? (
                  <MoveEntryButton
                    item={pair.black.item}
                    index={pair.black.index}
                    isCurrent={currentMoveIndex === pair.black.index}
                    onSelect={onJumpToMove}
                    moveNumber={pair.num}
                    colorName="Noirs"
                  />
                ) : (
                  <span className="block" />
                )}
              </div>
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
