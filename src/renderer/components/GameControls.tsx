import React from 'react';
import {
  RotateCw,
  RotateCcw,
  PlusCircle,
  FileText,
  Settings,
  Volume2,
  VolumeX,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { BotLevel, PlayerColor } from '../types/chess';

interface GameControlsProps {
  botLevel: BotLevel;
  onSetBotLevel: (level: BotLevel) => void;
  playerColor: PlayerColor;
  onSetPlayerColor: (color: PlayerColor) => void;
  onNewGame: () => void;
  onFlipBoard: () => void;
  blunderGuardEnabled: boolean;
  onToggleBlunderGuard: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenPgnModal: () => void;
  onOpenSettingsModal: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  botLevel,
  onSetBotLevel,
  playerColor,
  onSetPlayerColor,
  onNewGame,
  onFlipBoard,
  blunderGuardEnabled,
  onToggleBlunderGuard,
  soundEnabled,
  onToggleSound,
  onOpenPgnModal,
  onOpenSettingsModal,
}) => {
  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3.5">
      {/* Sélecteur de niveau du Bot */}
      <div>
        <label className="text-zinc-400 text-xs font-medium block mb-1.5">
          Adversaire Virtuel
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { id: '1100', label: 'Maia 1100', sub: 'Débutant' },
            { id: '1300', label: 'Maia 1300', sub: 'Amateur' },
            { id: '1500', label: 'Maia 1500', sub: 'Intermédiaire' },
            { id: 'stockfish', label: 'Stockfish', sub: 'Maître' },
          ].map((lvl) => (
            <button
              key={lvl.id}
              onClick={() => onSetBotLevel(lvl.id as BotLevel)}
              className={`py-2 px-2.5 rounded-xl border text-left transition-all ${
                botLevel === lvl.id
                  ? 'bg-indigo-600/20 border-indigo-500/80 text-indigo-200 shadow-md ring-1 ring-indigo-500/50'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="text-xs font-semibold">{lvl.label}</div>
              <div className="text-[10px] text-zinc-400">{lvl.sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Choix de la couleur */}
      <div>
        <label className="text-zinc-400 text-xs font-medium block mb-1.5">
          Votre Couleur
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'white', label: 'Blancs ⚪' },
            { id: 'black', label: 'Noirs ⚫' },
            { id: 'random', label: 'Aléatoire 🎲' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => onSetPlayerColor(c.id as PlayerColor)}
              className={`py-1.5 px-2 rounded-xl border text-center text-xs font-medium transition-all ${
                playerColor === c.id
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options en temps réel : Garde-fou Anti-Gaffe et Son */}
      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
        <button
          onClick={onToggleBlunderGuard}
          className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
            blunderGuardEnabled
              ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
          }`}
          title="Détecte les erreurs > 2 pions avant de donner la main au bot"
        >
          <div className="flex items-center gap-1.5">
            {blunderGuardEnabled ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-zinc-500" />
            )}
            <span className="font-medium">Anti-Gaffe</span>
          </div>
          <span className="text-[10px] font-bold">
            {blunderGuardEnabled ? 'ACTIF' : 'OFF'}
          </span>
        </button>

        <button
          onClick={onToggleSound}
          className={`flex items-center justify-between p-2 rounded-xl border text-xs transition-all ${
            soundEnabled
              ? 'bg-zinc-800/60 border-zinc-700 text-zinc-200'
              : 'bg-zinc-950/60 border-zinc-800 text-zinc-500'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-zinc-300" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
            <span className="font-medium">Sons</span>
          </div>
          <span className="text-[10px] font-bold">
            {soundEnabled ? 'OUI' : 'NON'}
          </span>
        </button>
      </div>

      {/* Barre de boutons d'action rapide */}
      <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-zinc-800/80">
        <button
          onClick={onNewGame}
          className="flex flex-col items-center justify-center p-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-xl text-emerald-300 transition-all active:scale-95"
          title="Refaire la partie à 0 (recommencer depuis le début)"
        >
          <RotateCcw className="w-4 h-4 mb-0.5 text-emerald-400" />
          <span className="text-[10px] font-semibold">Refaire à 0</span>
        </button>

        <button
          onClick={onFlipBoard}
          className="flex flex-col items-center justify-center p-2 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl text-zinc-300 transition-all active:scale-95"
          title="Inverser le sens de l'échiquier"
        >
          <RotateCw className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] font-semibold">Inverser</span>
        </button>

        <button
          onClick={onOpenPgnModal}
          className="flex flex-col items-center justify-center p-2 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl text-zinc-300 transition-all active:scale-95"
          title="Exporter ou importer une partie PGN / position FEN"
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] font-semibold">PGN/FEN</span>
        </button>

        <button
          onClick={onOpenSettingsModal}
          className="flex flex-col items-center justify-center p-2 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/60 rounded-xl text-zinc-300 transition-all active:scale-95"
          title="Paramètres de l'application et état des IA"
        >
          <Settings className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] font-semibold">Réglages</span>
        </button>
      </div>
    </div>
  );
};
