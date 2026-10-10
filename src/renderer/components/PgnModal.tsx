import React, { useState } from 'react';
import { X, Copy, Download, Upload, Check } from 'lucide-react';

interface PgnModalProps {
  isOpen: boolean;
  onClose: () => void;
  pgn: string;
  onLoadPgnOrFen: (text: string) => boolean;
  onExportFile: () => void;
}

export const PgnModal: React.FC<PgnModalProps> = ({
  isOpen,
  onClose,
  pgn,
  onLoadPgnOrFen,
  onExportFile,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pgn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    setErrorMsg(null);
    if (!importText.trim()) {
      setErrorMsg('Veuillez coller un PGN ou une chaîne FEN valide.');
      return;
    }
    const success = onLoadPgnOrFen(importText.trim());
    if (success) {
      onClose();
    } else {
      setErrorMsg('Format invalide. Vérifiez la syntaxe PGN ou FEN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('export')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'export'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Exporter la partie
            </button>
            <button
              onClick={() => setTab('import')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === 'import'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Importer PGN / FEN
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Export */}
        {tab === 'export' ? (
          <div className="flex flex-col gap-3">
            <p className="text-zinc-400 text-xs">
              Voici la transcription standard PGN de votre partie en cours :
            </p>
            <textarea
              readOnly
              value={pgn || '[Event "Partie d\'entraînement"]\n[Site "Mon Coach Échecs"]\n\n*'}
              rows={8}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-300 focus:outline-none select-all resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier dans le presse-papier'}
              </button>
              <button
                onClick={onExportFile}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                Enregistrer fichier .pgn
              </button>
            </div>
          </div>
        ) : (
          /* Tab Import */
          <div className="flex flex-col gap-3">
            <p className="text-zinc-400 text-xs">
              Collez ici une partie au format PGN ou une position de départ FEN :
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Ex: 1. e4 e5 2. Nf3 Nc6..."
              rows={8}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
            />
            {errorMsg && (
              <p className="text-red-400 text-xs font-medium">{errorMsg}</p>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={handleImport}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-medium shadow-md transition-all"
              >
                <Upload className="w-4 h-4" />
                Charger la position
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
