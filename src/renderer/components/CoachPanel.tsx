import React from 'react';
import { Bot, Sparkles, MessageSquare, Loader2, BookOpen, GraduationCap, Layers, ArrowRight } from 'lucide-react';
import { TacticalStep, VocabularyStyle } from '../types/chess';

interface CoachPanelProps {
  coachMessage: string | null;
  isThinking: boolean;
  vocabularyStyle: VocabularyStyle;
  onToggleStyle: (style: VocabularyStyle) => void;
  onAskCoach: () => void;
  canAsk: boolean;
  tacticalSteps?: TacticalStep[];
  selectedStepIndex?: number | null;
  onSelectStepIndex?: (index: number | null) => void;
}

export const CoachPanel: React.FC<CoachPanelProps> = ({
  coachMessage,
  isThinking,
  vocabularyStyle,
  onToggleStyle,
  onAskCoach,
  canAsk,
  tacticalSteps,
  selectedStepIndex = null,
  onSelectStepIndex,
}) => {
  return (
    <div className="w-full bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
      {/* En-tête Coach */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg">
              <Bot className="w-5 h-5" />
            </div>
            {isThinking && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-zinc-100 text-sm">Coach IA DeepSeek-R1</h3>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-zinc-400 text-[11px]">
              {isThinking ? 'Analyse du coup en cours...' : 'Explications pédagogiques locales'}
            </p>
          </div>
        </div>

        {/* Sélecteur de style de vocabulaire */}
        <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => onToggleStyle('debutant')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
              vocabularyStyle === 'debutant'
                ? 'bg-zinc-800 text-indigo-300 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Explications simples sans jargon"
          >
            <BookOpen className="w-3 h-3" />
            Débutant
          </button>
          <button
            onClick={() => onToggleStyle('club')}
            className={`flex items-center gap-1 px-2 py-1 rounded-md transition-all ${
              vocabularyStyle === 'club'
                ? 'bg-zinc-800 text-violet-300 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="Termes tactiques (fourchette, clouage, tempo...)"
          >
            <GraduationCap className="w-3 h-3" />
            Club
          </button>
        </div>
      </div>

      {/* Bulle de dialogue du coach */}
      <div className="min-h-[96px] bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/60 flex flex-col justify-center">
        {isThinking ? (
          <div className="flex flex-col items-center justify-center py-4 gap-2 text-zinc-400 text-xs">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <span>Le coach formule son explication bienveillante...</span>
          </div>
        ) : coachMessage ? (
          <div className="flex items-start gap-2.5">
            <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-zinc-200 text-xs leading-relaxed whitespace-pre-line">
              {coachMessage}
            </p>
          </div>
        ) : (
          <div className="text-center py-3 text-zinc-500 text-xs italic">
            Jouez votre coup ou cliquez sur « Pourquoi ce coup est mauvais ? » pour obtenir l'avis du coach.
          </div>
        )}
      </div>

      {/* Suite tactique visuelle & interactive */}
      {tacticalSteps && tacticalSteps.length > 0 && (
        <div className="bg-zinc-950/80 rounded-xl p-2.5 border border-zinc-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400">
            <div className="flex items-center gap-1.5 text-zinc-300">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Suite tactique ({tacticalSteps.length} coups calculés) :</span>
            </div>
            {selectedStepIndex !== null && onSelectStepIndex && (
              <button
                onClick={() => onSelectStepIndex(null)}
                className="text-indigo-400 hover:text-indigo-300 text-[10px] underline"
              >
                Tout afficher
              </button>
            )}
          </div>

          {/* Rangée de chips d'étapes tactiques */}
          <div className="flex flex-wrap gap-1.5">
            {tacticalSteps.map((step, idx) => {
              const isSelected = selectedStepIndex === idx;
              const isWhite = step.color === 'white';
              return (
                <button
                  key={idx}
                  onClick={() => onSelectStepIndex && onSelectStepIndex(isSelected ? null : idx)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono transition-all border ${
                    isSelected
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200 shadow-sm ring-1 ring-indigo-500/50'
                      : step.isPupilMove
                      ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/40'
                      : 'bg-rose-950/30 border-rose-800/50 text-rose-300 hover:bg-rose-900/40'
                  }`}
                  title={step.description}
                >
                  <span className="text-[10px] font-sans opacity-70">#{step.step}</span>
                  <span
                    className={`w-2 h-2 rounded-full inline-block ${
                      isWhite ? 'bg-zinc-100' : 'bg-zinc-800 border border-zinc-600'
                    }`}
                  />
                  <span className="font-semibold">{step.san}</span>
                </button>
              );
            })}
          </div>

          {/* Explication textuelle de l'étape sélectionnée */}
          {selectedStepIndex !== null && tacticalSteps[selectedStepIndex] && (
            <div className="text-[11px] text-zinc-300 bg-zinc-900/70 p-2 rounded-lg border border-zinc-800 flex items-center gap-1.5">
              <ArrowRight className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>
                <strong className="text-zinc-100">Coup {tacticalSteps[selectedStepIndex].step} :</strong>{' '}
                {tacticalSteps[selectedStepIndex].description}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action principale */}
      <button
        onClick={onAskCoach}
        disabled={!canAsk || isThinking}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:pointer-events-none text-white rounded-xl text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Demander l'analyse du Coach sur ce coup
      </button>
    </div>
  );
};
