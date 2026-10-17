import React, { useState, useEffect } from 'react';
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
  Brain,
  Download,
} from 'lucide-react';
import { MaiaModelId, SystemStatus } from '../types/chess';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SystemStatus | null;
  onRefreshStatus: () => void;
  onSelectModel: (model: string) => void;
  onSelectMaiaModel?: (model: MaiaModelId) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  onSelectModel,
  onSelectMaiaModel,
}) => {
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (window.chessAPI?.onMaiaDownloadProgress) {
      const unsub = window.chessAPI.onMaiaDownloadProgress((data) => {
        if (data.status === 'downloading') {
          setDownloadingModel(data.model);
          setDownloadProgress(data.progress);
        } else if (data.status === 'completed') {
          setDownloadingModel(null);
          setDownloadProgress(100);
          onRefreshStatus();
        } else if (data.status === 'error') {
          setDownloadingModel(null);
          setDownloadError(data.error || 'Erreur lors du téléchargement');
        }
      });
      return unsub;
    }
  }, [onRefreshStatus]);

  if (!isOpen) return null;

  const gpu = status?.gpu;
  const ollama = status?.ollama;
  const engines = status?.engines;
  const maia3Info = status?.maia3Info;
  const installedList = ollama?.installedModelDetails || [];
  const recommendedList = ollama?.recommendedCatalog || [];
  const selectedModel = ollama?.selectedModel || 'deepseek-r1:8b';
  const maiaProfiles = maia3Info?.profiles || [];

  const handleDownloadModel = async (modelId: MaiaModelId) => {
    setDownloadingModel(modelId);
    setDownloadProgress(0);
    setDownloadError(null);
    try {
      if (window.chessAPI?.downloadMaiaModel) {
        const res = await window.chessAPI.downloadMaiaModel(modelId);
        if (!res.success) {
          setDownloadError(res.error || 'Erreur de téléchargement');
          setDownloadingModel(null);
        } else {
          onRefreshStatus();
        }
      }
    } catch (err: any) {
      setDownloadError(err?.message || 'Erreur');
      setDownloadingModel(null);
    }
  };

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
                Gestion des modèles Ollama (GPU/VRAM) et des profils Maia 3 (IA Humaine)
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

        {/* 2. Profils de Réalisme Humain (Maia 3 Chessformer) */}
        {maiaProfiles.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Brain className="w-4 h-4 text-pink-400" />
                <span>Profil de Réalisme Humain (Maia 3)</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Simulation de psychologie humaine
              </span>
            </div>

            {downloadError && (
              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{downloadError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {maiaProfiles.map((p) => {
                const isDownloading = downloadingModel === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                      p.isActive
                        ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-zinc-100">{p.name}</span>
                        {p.isRecommended && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-semibold border border-emerald-500/30 shrink-0">
                            Optimal
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-indigo-400 font-mono mb-1.5">
                        {p.subName} • {p.sizeMb} Mo
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug mb-3">
                        {p.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/80">
                      {isDownloading ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-[10px] text-zinc-300 font-mono">
                            <span>Téléchargement...</span>
                            <span>{downloadProgress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-150"
                              style={{ width: `${downloadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : p.isActive ? (
                        <div className="flex items-center justify-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 text-xs font-semibold">
                          <Check className="w-3.5 h-3.5" /> Modèle Actif
                        </div>
                      ) : p.isDownloaded ? (
                        <button
                          onClick={() => onSelectMaiaModel && onSelectMaiaModel(p.id)}
                          className="w-full py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition-all"
                        >
                          Activer
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownloadModel(p.id)}
                          className="w-full py-1 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all flex items-center justify-center gap-1 shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" /> Télécharger ({p.sizeMb} Mo)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Modèles Ollama Installés (Sélection en 1 Clic) */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Server className="w-4 h-4 text-violet-400" />
              <span>Coach Conversationnel dans Ollama</span>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {installedList.map((m) => {
                const isSelected = selectedModel === m.name;
                return (
                  <div
                    key={m.name}
                    onClick={() => onSelectModel(m.name)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/80 text-white shadow-md ring-1 ring-indigo-500/40'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-zinc-100">{m.displayName}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                            Actif
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {m.parameterSize} • {m.sizeFormatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                        {m.badge}
                      </span>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-zinc-700" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Catalogue Recommandé Ollama */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Modèles Recommandés pour votre PC</span>
            </div>
            <span className="text-[11px] text-zinc-500">100% Gratuits & Locaux</span>
          </div>

          <div className="flex flex-col gap-2">
            {recommendedList.map((rec) => {
              const alreadyInstalled = installedList.some((m) => m.name === rec.name);
              return (
                <div
                  key={rec.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 transition-colors"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">
                        {rec.displayName}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                        {rec.parameterSize}
                      </span>
                      {rec.isRecommended && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
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

        {/* 5. Statut Moteurs d'Échecs UCI */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Moteurs d'Échecs UCI & Détection</span>
            </div>
            {engines?.activeEngineType && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono font-medium">
                Moteur actif : {engines.activeEngineType === 'maia3' ? 'Maia 3 (GPU)' : engines.activeEngineType === 'lc0' ? 'Lc0 (Maia 1)' : 'Stockfish 19'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex flex-col p-2 bg-zinc-900/60 rounded-lg border border-zinc-800 gap-1">
              <span className="text-zinc-400 text-[11px]">Maia 3 :</span>
              {engines?.maia3 ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> Opérationnel
                </span>
              ) : (
                <span className="text-zinc-500 font-medium flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-3 h-3" /> Non installé
                </span>
              )}
            </div>

            <div className="flex flex-col p-2 bg-zinc-900/60 rounded-lg border border-zinc-800 gap-1">
              <span className="text-zinc-400 text-[11px]">Leela Chess (Lc0) :</span>
              {engines?.lc0 ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> Opérationnel
                </span>
              ) : (
                <span className="text-zinc-500 font-medium text-[11px]">
                  Non détecté
                </span>
              )}
            </div>

            <div className="flex flex-col p-2 bg-zinc-900/60 rounded-lg border border-zinc-800 gap-1">
              <span className="text-zinc-400 text-[11px]">Stockfish 19 :</span>
              {engines?.stockfish ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                  <CheckCircle2 className="w-3 h-3" /> Opérationnel
                </span>
              ) : (
                <span className="text-amber-400 font-medium flex items-center gap-1 text-[11px]">
                  <AlertCircle className="w-3 h-3" /> Absent
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-[11px] text-zinc-500 text-center">
          Mon Coach Échecs • Détection Matérielle & Inférence 100% Locale
        </div>
      </div>
    </div>
  );
};
