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
  // Calcul du pourcentage de hauteur blanche (0 à 100%)
  // 0.00 -> 50%
  // +5 -> ~80%
  // +10 / Mat -> 100%
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

  return (
    <div className="relative w-6 h-full max-h-[min(650px,calc(100vh-210px))] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700/60 shadow-lg flex flex-col justify-end select-none">
      {/* Partie supérieure (Noirs) */}
      <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-start pt-2">
        {!displayWhiteAtBottom && (
          <span className="text-[10px] font-bold text-zinc-300 transform -rotate-90 origin-center whitespace-nowrap">
            {score}
          </span>
        )}
      </div>

      {/* Partie inférieure (Blancs) */}
      <div
        className="w-full bg-zinc-100 transition-all duration-500 ease-out flex flex-col items-center justify-end pb-2 relative z-10"
        style={{ height: `${bottomHeight}%` }}
      >
        {displayWhiteAtBottom && (
          <span className="text-[10px] font-bold text-zinc-900 transform -rotate-90 origin-center whitespace-nowrap">
            {score}
          </span>
        )}
      </div>
    </div>
  );
};
