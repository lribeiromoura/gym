'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  RotateCcw,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import {
  copyReportText,
  DEFAULT_NUTRITION_AI_REPORT_PROMPT,
  generateNutritionAIReport,
  shareOrCopyReportText,
} from '@/lib/ai-report';

interface NutritionAIReportModalProps {
  isOpen: boolean;
  date: string;
  onClose: () => void;
}

export function NutritionAIReportModal({
  isOpen,
  date,
  onClose,
}: NutritionAIReportModalProps) {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const measurements = useWorkoutStore((s) => s.measurements);
  const settings = useWorkoutStore((s) => s.settings);

  const foodLogs = useNutritionStore((s) => s.foodLogs);
  const waterByDate = useNutritionStore((s) => s.waterByDate);
  const profile = useNutritionStore((s) => s.profile);
  const goals = useNutritionStore((s) => s.goals);
  const savedPrompt = useNutritionStore((s) => s.nutritionAIReportPrompt);
  const setNutritionAIReportPrompt = useNutritionStore(
    (s) => s.setNutritionAIReportPrompt
  );

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<'shared' | 'copied' | null>(
    null
  );

  const activePrompt = savedPrompt ?? DEFAULT_NUTRITION_AI_REPORT_PROMPT;
  const isPromptModified =
    activePrompt.trim() !== DEFAULT_NUTRITION_AI_REPORT_PROMPT.trim();

  const reportMarkdown = useMemo(() => {
    if (!isOpen) return '';
    return generateNutritionAIReport({
      date,
      foodLogs,
      waterByDate,
      profile,
      goals,
      measurements,
      workoutHistory,
      settings,
      customPrompt: activePrompt,
    });
  }, [
    isOpen,
    date,
    foodLogs,
    waterByDate,
    profile,
    goals,
    measurements,
    workoutHistory,
    settings,
    activePrompt,
  ]);

  if (!isOpen) return null;

  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );

  const handleCopy = async () => {
    const ok = await copyReportText(reportMarkdown);
    if (ok) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    }
  };

  const handleShare = async () => {
    const result = await shareOrCopyReportText({
      title: `Relatório Nutricional — ${formattedDate}`,
      text: reportMarkdown,
    });
    if (result === 'shared' || result === 'copied') {
      setShareFeedback(result);
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-2 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutrition-ai-report-title"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="nutrition-ai-report-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
              >
                Relatório Nutricional para IA
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Diário alimentar + metas TDEE • {formattedDate}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar relatório nutricional para IA"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="nutrition-ai-prompt-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Prompt para a IA (salvo automaticamente)
              </label>
              {isPromptModified && (
                <button
                  type="button"
                  onClick={() =>
                    setNutritionAIReportPrompt(
                      DEFAULT_NUTRITION_AI_REPORT_PROMPT
                    )
                  }
                  className="min-h-[36px] px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#3B82F6] flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
                </button>
              )}
            </div>
            <textarea
              id="nutrition-ai-prompt-input"
              rows={4}
              value={activePrompt}
              onChange={(e) => setNutritionAIReportPrompt(e.target.value)}
              placeholder="Instruções para a IA avaliar sua dieta e macros..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder-slate-400 leading-relaxed focus:outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Prévia do Relatório (Markdown)
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums">
                {reportMarkdown.length.toLocaleString('pt-BR')} caracteres
              </span>
            </div>
            <pre
              data-testid="nutrition-ai-report-preview"
              className="w-full max-h-72 overflow-y-auto p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-mono leading-relaxed select-all"
            >
              {reportMarkdown}
            </pre>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleCopy}
            className="h-12 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
          >
            {copyFeedback ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Relatório Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Relatório</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="h-12 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#3B82F6] text-sm font-bold flex items-center justify-center gap-2 transition"
          >
            {shareFeedback ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                <span className="text-emerald-700">
                  {shareFeedback === 'shared'
                    ? 'Compartilhado!'
                    : 'Copiado para enviar!'}
                </span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Compartilhar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
