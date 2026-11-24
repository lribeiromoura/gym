'use client';

import React, { useMemo, useState } from 'react';
import { Check, Copy, RotateCcw, Share2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { WorkoutSession } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { useNutritionStore } from '@/store/useNutritionStore';
import {
  copyReportText,
  DEFAULT_AI_REPORT_PROMPT,
  generateWorkoutAIReport,
  shareOrCopyReportText,
} from '@/lib/ai-report';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Textarea } from '@/components/ui/textarea';

interface WorkoutAIReportModalProps {
  session: WorkoutSession | null;
  onClose: () => void;
}

export function WorkoutAIReportModal({
  session,
  onClose,
}: WorkoutAIReportModalProps) {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const exercises = useWorkoutStore((s) => s.exercises);
  const measurements = useWorkoutStore((s) => s.measurements);
  const settings = useWorkoutStore((s) => s.settings);
  const updateSettings = useWorkoutStore((s) => s.updateSettings);

  const foodLogs = useNutritionStore((s) => s.foodLogs);
  const waterByDate = useNutritionStore((s) => s.waterByDate);
  const nutritionGoals = useNutritionStore((s) => s.goals);
  const nutritionProfile = useNutritionStore((s) => s.profile);

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<
    'shared' | 'copied' | null
  >(null);

  const activePrompt = settings.aiReportPrompt ?? DEFAULT_AI_REPORT_PROMPT;
  const isPromptModified =
    activePrompt.trim() !== DEFAULT_AI_REPORT_PROMPT.trim();

  const reportMarkdown = useMemo(() => {
    if (!session) return '';
    return generateWorkoutAIReport({
      session,
      workoutHistory,
      exercises,
      measurements,
      settings,
      customPrompt: activePrompt,
      nutrition: {
        foodLogs,
        waterByDate,
        goals: nutritionGoals,
        profile: nutritionProfile,
      },
    });
  }, [
    session,
    workoutHistory,
    exercises,
    measurements,
    settings,
    activePrompt,
    foodLogs,
    waterByDate,
    nutritionGoals,
    nutritionProfile,
  ]);

  if (!session) return null;

  const formattedSessionDate = new Date(session.startTime).toLocaleDateString(
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
      toast.success('Relatório copiado para a área de transferência!');
      setTimeout(() => setCopyFeedback(false), 2500);
    } else {
      toast.error('Não foi possível copiar o relatório.');
    }
  };

  const handleShare = async () => {
    const result = await shareOrCopyReportText({
      title: `Relatório de Treino — ${session.title}`,
      text: reportMarkdown,
    });
    if (result === 'shared' || result === 'copied') {
      setShareFeedback(result);
      toast.success(
        result === 'shared'
          ? 'Relatório compartilhado!'
          : 'Relatório copiado para enviar!'
      );
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <ResponsiveDialog
      open={Boolean(session)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-2xl">
        {/* Cabeçalho */}
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <ResponsiveDialogTitle className="text-base sm:text-lg truncate">
                Relatório para Avaliação IA
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="truncate">
                {session.title} • {formattedSessionDate}
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        {/* Conteúdo Rolável: Prompt Editável + Prévia Markdown */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Bloco 1: Prompt Editável */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ai-report-prompt-input">
                Prompt para a IA (salvo automaticamente)
              </Label>
              {isPromptModified && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    updateSettings({ aiReportPrompt: DEFAULT_AI_REPORT_PROMPT })
                  }
                  className="min-h-11 h-11 text-blue-600 dark:text-blue-400"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrão
                </Button>
              )}
            </div>
            <Textarea
              id="ai-report-prompt-input"
              rows={4}
              value={activePrompt}
              onChange={(e) =>
                updateSettings({ aiReportPrompt: e.target.value })
              }
              placeholder="Instruções de como você quer que a IA avalie o seu treino..."
              className="leading-relaxed"
            />
          </div>

          {/* Bloco 2: Prévia em Markdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Prévia do Relatório (Markdown)</Label>
              <Badge variant="secondary" className="text-[11px] tabular-nums">
                {reportMarkdown.length.toLocaleString('pt-BR')} caracteres
              </Badge>
            </div>
            <pre
              data-testid="ai-report-preview"
              className="w-full max-h-72 overflow-y-auto p-3.5 rounded-xl bg-secondary/60 border border-border text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed select-all"
            >
              {reportMarkdown}
            </pre>
          </div>
        </div>

        {/* Rodapé com Ações: Copiar + Compartilhar Nativo */}
        <ResponsiveDialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <Button
            variant="default"
            size="lg"
            onClick={handleCopy}
            className="w-full text-sm"
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
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={handleShare}
            className={
              shareFeedback
                ? 'w-full text-sm bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'w-full text-sm bg-primary/15 hover:bg-primary/25 border-primary/30 text-blue-600 dark:text-blue-400'
            }
          >
            {shareFeedback ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>
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
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
