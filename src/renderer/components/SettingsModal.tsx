import React from 'react';
import {
  X,
  Cpu,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
  HardDrive,
  Check,
} from 'lucide-react';
import { SystemStatus } from '../types/chess';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatus | null;
  onRefreshStatus: () => void;
  onSelectModel: (model: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  onSelectModel,
}) => {
  if (!isOpen) return null;

  const gpu = status?.gpu;
  const ollama = status?.ollama;
  const engines = status?.engines;
  const installedList = ollama?.installedModelDetails || [];
  const recommendedList = ollama?.recommendedCatalog || [];
  const selectedModel = ollama?.selectedModel || 'deepseek-r1:8b';

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">
                Configuration de l'IA & Moteurs d'Échecs
              </h3>
              <p className="text-zinc-400 text-[11px]">
                Gestion des modèles Ollama (GPU/VRAM) et des moteurs UCI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefreshStatus}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
              title="Rafraîchir les statuts"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Actualiser</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Détection GPU & VRAM */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Carte Graphique & VRAM Détectée</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono font-bold">
              {gpu?.totalVramGb ? `${gpu.totalVramGb} Go VRAM` : 'Calcul CPU'}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 pt-1">
            <span className="font-medium text-zinc-300">{gpu?.name || 'Détection automatique en cours...'}</span>
            {gpu?.freeVramGb ? (
              <span className="text-[11px] text-zinc-500">
                VRAM disponible estimée : {gpu.freeVramGb} Go
              </span>
            ) : null}
          </div>
        </div>

        {/* 2. Modèles Ollama Installés (Sélection en 1 Clic) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Server className="w-4 h-4 text-violet-400" />
              <span>Modèles IA Installés dans Ollama</span>
            </div>
            {ollama?.online ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ollama Connecté
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" /> Serveur non détecté
              </span>
            )}
          </div>

          {installedList.length === 0 ? (
            <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 text-center text-xs text-zinc-500">
              {ollama?.online
                ? 'Aucun modèle trouvé dans Ollama. Installez un modèle recommandé ci-dessous.'
                : 'Ollama est hors ligne. Lancez "ollama serve" dans un terminal puis cliquez sur Actualiser.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {installedList.map((m) => {
                const isSelected = selectedModel === m.name;
                return (
                  <div
                    key={m.name}
                    onClick={() => onSelectModel(m.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                          {m.name}
                          {isSelected && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-500 text-white font-semibold">
                              ACTIF
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          Taille : {m.sizeFormatted} • {m.parameterSize || 'Quantifié'}
                        </div>
                      </div>
                      <div className="p-1 rounded-full bg-zinc-800 text-zinc-400">
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-800/60">
                      <span className={m.fitsVram ? 'text-emerald-400' : 'text-amber-400'}>
                        {m.fitsVram ? '✓ Compatible VRAM' : '⚠ VRAM limite'}
                      </span>
                      <span className="text-zinc-500">{m.badge}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Catalogue Préconisé selon votre VRAM */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Modèles Recommandés selon votre matériel</span>
            </div>
            <span className="text-[10px] text-zinc-500">Optimisés pour le Coach d'échecs</span>
          </div>

          <div className="space-y-1.5">
            {recommendedList.map((rec) => {
              const alreadyInstalled = installedList.some((inst) => inst.name === rec.name);
              return (
                <div
                  key={rec.name}
                  className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-200">{rec.displayName}</span>
                      <span className="text-[10px] text-zinc-400">({rec.sizeFormatted} VRAM)</span>
                      {rec.isRecommended && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                          Recommandé
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{rec.badge}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {alreadyInstalled ? (
                      <button
                        onClick={() => onSelectModel(rec.name)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedModel === rec.name
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-zinc-800 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {selectedModel === rec.name ? 'Actif' : 'Activer'}
                      </button>
                    ) : (
                      <div className="text-[10px] font-mono bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-zinc-400 select-all">
                        ollama run {rec.name}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Moteurs d'Échecs UCI (Stockfish & Maia) */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Moteurs d'Échecs UCI (Calculs CPU 100% Natifs)</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 bg-zinc-900/60 rounded-lg border border-zinc-800">
              <span className="text-zinc-400">Stockfish 19 :</span>
              {engines?.stockfish ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Opérationnel
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Absent
                </span>
              )}
            </div>

            <div className="flex items-center justify-between p-2 bg-zinc-900/60 rounded-lg border border-zinc-800">
              <span className="text-zinc-400">Leela (Lc0) :</span>
              {engines?.lc0 ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Opérationnel
                </span>
              ) : (
                <span className="text-zinc-400 font-medium">
                  Simulation Elo (Stockfish)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-zinc-400">Réseaux Maia disponibles :</span>
            <div className="flex gap-1.5">
              {(['1100', '1300', '1500'] as const).map((w) => {
                const isLoaded = Boolean(engines?.maiaWeights?.[w]);
                return (
                  <span
                    key={w}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      isLoaded
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    Maia {w}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[11px] text-zinc-500 text-center">
          Mon Coach Échecs • Détection VRAM & Inférence 100% Locale
        </div>
      </div>
    </div>
  );
};
