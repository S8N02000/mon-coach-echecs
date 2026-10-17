import React from 'react';

interface EvalBarProps {
  score: string | number;
  numericScore: number;
  orientation?: 'white' | 'black';
}

export const EvalBar: React.FC<EvalBarProps> = ({
  score,
  numericScore,
  orientation = 'white',
}) => {
  // Formatage propre du score pour un affichage lisible
  const displayScore =
    typeof score === 'number'
      ? score > 0
        ? `+${score.toFixed(2)}`
        : score === 0
        ? '0.00'
        : score.toFixed(2)
      : String(score);

  // Calcul du pourcentage de hauteur blanche (0 à 100%)
  let whitePercent = 50;

  if (typeof score === 'string' && score.startsWith('+M')) {
    whitePercent = 100;
  } else if (typeof score === 'string' && score.startsWith('-M')) {
    whitePercent = 0;
  } else {
    // Échelle sigmoïde douce pour un rendu réaliste
    const clamped = Math.max(-10, Math.min(10, numericScore));
    whitePercent = 50 + (clamped / 10) * 45;
  }

  // Si l'échiquier est inversé (joueur Noir), la barre est inversée
  const displayWhiteAtBottom = orientation === 'white';
  const bottomHeight = displayWhiteAtBottom ? whitePercent : 100 - whitePercent;

  const isAdvantage = numericScore > 0.3;
  const isDisadvantage = numericScore < -0.3;

  return (
    <div className="flex flex-col items-center h-full max-h-[min(650px,calc(100vh-210px))] gap-1.5 select-none shrink-0">
      {/* Badge de score horizontal hautement visible */}
      <div
        className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold border shadow-md flex items-center justify-center min-w-[52px] text-center transition-all ${
          displayScore.startsWith('+') || (!displayScore.startsWith('-') && numericScore > 0)
            ? 'bg-zinc-100 text-zinc-950 border-white shadow-zinc-900/40 ring-1 ring-white/50'
            : displayScore.startsWith('-') || numericScore < 0
            ? 'bg-zinc-900 text-zinc-100 border-zinc-700 shadow-black'
            : 'bg-zinc-800 text-zinc-300 border-zinc-700'
        }`}
        title={`Évaluation Stockfish : ${displayScore}`}
      >
        <span>{displayScore}</span>
      </div>

      {/* Barre d'évaluation verticale fluide et moderne */}
      <div className="relative w-7 flex-1 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700/80 shadow-xl flex flex-col justify-end">
        {/* Ligne médiane de repère d'équilibre (50%) */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-zinc-500/40 z-20 pointer-events-none" />

        {/* Partie supérieure (Noirs par défaut) */}
        <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-start pt-1.5" />

        {/* Partie inférieure (Blancs par défaut) */}
        <div
          className="w-full bg-zinc-100 transition-all duration-500 ease-out flex flex-col items-center justify-end pb-1.5 relative z-10"
          style={{ height: `${bottomHeight}%` }}
        />
      </div>
    </div>
  );
};
