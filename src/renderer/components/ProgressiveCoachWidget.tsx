import React, { useRef, useEffect } from 'react';
import {
  ShieldAlert,
  Swords,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Crown,
  Eye,
  Loader2,
  Sparkles,
  Zap,
  X,
  Compass,
} from 'lucide-react';
import { TargetPieceInfo } from '../types/chess';

interface ProgressiveCoachWidgetProps {
  enabled: boolean;
  currentLevel: 0 | 1 | 2 | 3;
  status: 'ATTACK' | 'DEFENSE';
  issueType: 'MATE' | 'MATERIAL' | 'POSITION';
  issueDelta: number;
  issueLabelFr: string;
  targetPiece: TargetPieceInfo | null;
  targetDescriptionFr: string;
  hasSimulationMoves: boolean;
  isLoading: boolean;
  simulationActive: boolean;
  onToggleEnabled: () => void;
  onAdvanceLevel: () => void;
  onSetLevel: (level: 0 | 1 | 2 | 3) => void;
  onStartSimulation: () => void;
}

export const ProgressiveCoachWidget: React.FC<ProgressiveCoachWidgetProps> = ({
  enabled,
  currentLevel,
  status,
  issueType,
  issueLabelFr,
  targetDescriptionFr,
  hasSimulationMoves,
  isLoading,
  simulationActive,
  onToggleEnabled,
  onAdvanceLevel,
  onSetLevel,
  onStartSimulation,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAttack = status === 'ATTACK';
  const isDropdownOpen = enabled && currentLevel >= 2;

  // Fermeture automatique au clic en dehors du widget
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (currentLevel >= 2) {
          onSetLevel(1);
        }
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen, currentLevel, onSetLevel]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center select-none z-50">
      {/* Barre de déclenchement dans le Header */}
      <div className="flex items-center gap-2">
        {/* Switch compact Coach Mode */}
        <div
          onClick={onToggleEnabled}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs cursor-pointer hover:border-zinc-700 transition-colors shadow-sm"
          title={enabled ? 'Désactiver le Coach Décisionnel' : 'Activer le Coach Décisionnel'}
        >
          <Compass className={`w-3.5 h-3.5 ${enabled ? 'text-indigo-400' : 'text-zinc-500'}`} />
          <span className="text-[11px] font-medium text-zinc-300 hidden sm:inline">Coach Mode</span>
          <button
            type="button"
            className={`w-7 h-3.5 rounded-full transition-colors relative pointer-events-none ${
              enabled ? 'bg-indigo-600' : 'bg-zinc-700'
            }`}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform ${
                enabled ? 'transform translate-x-3.5' : ''
              }`}
            />
          </button>
        </div>

        {/* Palier 1 : Badge discret cliquable [ ATTAQUE ] ou [ DÉFENSE ] */}
        {enabled && (
          <button
            type="button"
            onClick={() => {
              if (currentLevel === 1) {
                onAdvanceLevel();
              } else {
                onSetLevel(1);
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold transition-all shadow-md border active:scale-95 ${
              isAttack
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 shadow-emerald-500/10'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25 shadow-rose-500/10'
            }`}
            title="Palier 1 : Cliquez pour dérouler l'analyse stratégique progressive"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isAttack ? (
              <Swords className="w-3.5 h-3.5" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5" />
            )}
            <span>{isAttack ? 'ATTAQUE' : 'DÉFENSE'}</span>
            <span className="text-[10px] opacity-75">
              {isDropdownOpen ? (
                <ChevronUp className="w-3 h-3 inline" />
              ) : (
                <ChevronDown className="w-3 h-3 inline" />
              )}
            </span>
          </button>
        )}
      </div>

      {/* Volet flottant déroulant : Paliers 2 & 3 (fond opaque solide pour contraste parfait) */}
      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-80 sm:w-88 max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-700 rounded-2xl p-3.5 shadow-2xl ring-1 ring-black/80 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
          {/* En-tête du volet */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-zinc-100 tracking-tight">
                Coach Décisionnel Progressif
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full font-mono">
                Palier {currentLevel} / 4
              </span>
              <button
                type="button"
                onClick={() => onSetLevel(1)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                title="Fermer le volet"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rappel Palier 1 : Orientation */}
          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
            <span className="text-[11px] text-zinc-400">Orientation globale :</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                isAttack ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isAttack ? <Swords className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
              {isAttack ? 'Plan offensif (Initiative)' : 'Plan défensif (Danger)'}
            </span>
          </div>

          {/* Palier 2 : Nature de l'enjeu */}
          <div
            onClick={() => {
              if (currentLevel === 2) onAdvanceLevel();
            }}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
              currentLevel === 2
                ? 'bg-zinc-800/90 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30 cursor-pointer hover:border-indigo-400'
                : 'bg-zinc-950/40 border-zinc-800/60'
            }`}
            title={currentLevel === 2 ? 'Cliquez pour dévoiler la cible au Palier 3' : undefined}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs ${
                  issueType === 'MATE'
                    ? 'bg-amber-500/20 text-amber-300'
                    : issueType === 'MATERIAL'
                    ? isAttack
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                    : 'bg-indigo-500/20 text-indigo-300'
                }`}
              >
                {issueType === 'MATE' ? (
                  <Crown className="w-4 h-4" />
                ) : issueType === 'MATERIAL' ? (
                  <Zap className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                  Enjeu tactique (Palier 2)
                </span>
                <span className="text-xs font-bold text-zinc-100 truncate">{issueLabelFr}</span>
              </div>
            </div>

            {currentLevel === 2 && (
              <span className="shrink-0 text-[10px] text-indigo-400 underline font-semibold ml-2">
                Voir cible &rarr;
              </span>
            )}
          </div>

          {/* Palier 3 : Précision de la cible & Bouton de simulation */}
          {currentLevel >= 3 && (
            <div className="flex flex-col gap-2 p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <Crosshair className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                    Cible identifiée (Palier 3)
                  </span>
                  <span className="text-xs font-bold text-amber-300 truncate">
                    {targetDescriptionFr}
                  </span>
                </div>
              </div>

              {/* Bouton de déclenchement Palier 4 (Simulation Ghost Board) */}
              <button
                type="button"
                onClick={() => {
                  onStartSimulation();
                  onSetLevel(1); // Replie le volet pour dégager la vue sur l'échiquier
                }}
                disabled={!hasSimulationMoves || simulationActive}
                className="mt-1 w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-95"
                title="Lancer la simulation pas-à-pas sur l'échiquier (Ghost Board)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualiser la variante</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
