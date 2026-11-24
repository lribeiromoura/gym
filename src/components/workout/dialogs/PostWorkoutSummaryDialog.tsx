'use client';

import React, { useMemo, useState } from 'react';
import { Award, Share2, Sparkles, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Exercise, WorkoutSession } from '@/types/workout';
import {
  calculateMuscleDistribution,
  convertVolumeFromKg,
  formatDuration,
  getWeightUnitLabel,
} from '@/lib/calculations';
import {
  buildShareUrl,
  encodeRoutineShareToken,
  shareOrCopyLink,
} from '@/lib/share';
import { BodyHeatmapSVG } from '@/components/analytics/BodyHeatmapSVG';
import { WorkoutAIReportModal } from '@/components/workout/WorkoutAIReportModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

export interface PostWorkoutSummaryDialogProps {
  session: WorkoutSession | null;
  workoutCount: number;
  exercises: Exercise[];
  weightUnit: 'kg' | 'lbs';
  authorName?: string;
  onClose: () => void;
}

export function PostWorkoutSummaryDialog({
  session,
  workoutCount,
  exercises,
  weightUnit,
  authorName,
  onClose,
}: PostWorkoutSummaryDialogProps) {
  const [showAIReport, setShowAIReport] = useState(false);

  const unitLabel = getWeightUnitLabel(weightUnit);

  const finishedMuscleDist = useMemo(
    () =>
      session ? calculateMuscleDistribution([session], exercises) : undefined,
    [session, exercises]
  );

  const handleShareWorkout = async () => {
    if (!session) return;
    try {
      const token = encodeRoutineShareToken(session, exercises, authorName);
      const url = buildShareUrl(token);
      const result = await shareOrCopyLink({
        title: `Treino IronPulse: ${session.title}`,
        text: `Confira meu treino "${session.title}" no IronPulse!`,
        url,
      });
      if (result === 'shared') {
        toast.success('Treino compartilhado com sucesso!');
      } else {
        toast.success('Link do treino copiado para a área de transferência!');
      }
    } catch {
      toast.error('Não foi possível compartilhar o treino.');
    }
  };

  return (
    <>
      <ResponsiveDialog
        open={Boolean(session) && !showAIReport}
        onOpenChange={(open) => {
          if (!open) {
            setShowAIReport(false);
            onClose();
          }
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-lg">
          {session && (
            <>
              <ResponsiveDialogHeader className="items-center text-center pr-5 border-b-0 pb-2">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-1">
                  <Trophy className="w-9 h-9" />
                </div>
                <Badge
                  variant="info"
                  className="px-3 py-1 text-xs uppercase tracking-wider"
                >
                  Treino #{workoutCount} Concluído!
                </Badge>
                <ResponsiveDialogTitle className="text-2xl mt-1">
                  {session.title}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Excelente trabalho! Seu treino ({session.totalSets} séries)
                  foi salvo no seu histórico.
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">
                <div className="grid grid-cols-3 gap-2.5">
                  <Card className="bg-secondary/50 p-3 text-center shadow-none">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Volume Total
                    </span>
                    <p className="text-base font-extrabold text-foreground mt-0.5 tabular-nums">
                      {convertVolumeFromKg(
                        session.totalVolumeKg,
                        weightUnit
                      ).toLocaleString('pt-BR')}{' '}
                      {unitLabel}
                    </p>
                  </Card>

                  <Card className="bg-secondary/50 p-3 text-center shadow-none">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Duração
                    </span>
                    <p className="text-base font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                      {formatDuration(session.durationSeconds)}
                    </p>
                  </Card>

                  <Card className="bg-secondary/50 p-3 text-center shadow-none">
                    <span className="text-[11px] font-medium text-muted-foreground block">
                      Recordes (PRs)
                    </span>
                    <p className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center justify-center gap-1 tabular-nums">
                      <Award className="w-4 h-4" /> {session.prCount}
                    </p>
                  </Card>
                </div>

                <Card className="bg-secondary/50 p-4 shadow-none">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center mb-2">
                    Músculos Trabalhados na Sessão
                  </h3>
                  <BodyHeatmapSVG muscleScores={finishedMuscleDist} compact />
                </Card>

                <div className="space-y-2.5 pb-1">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setShowAIReport(true)}
                    className="w-full rounded-2xl bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-500/25 hover:text-purple-800 dark:hover:text-purple-300 font-extrabold text-sm"
                  >
                    <Sparkles className="w-4 h-4" /> Gerar Relatório para IA
                  </Button>

                  <Button
                    variant="secondary"
                    size="default"
                    onClick={handleShareWorkout}
                    className="w-full rounded-2xl font-bold text-sm"
                  >
                    <Share2 className="w-4 h-4" /> Compartilhar Link do Treino
                  </Button>

                  <Button
                    variant="default"
                    size="lg"
                    onClick={() => {
                      setShowAIReport(false);
                      onClose();
                    }}
                    className="w-full rounded-2xl font-extrabold text-sm shadow-md"
                  >
                    Fechar Resumo
                  </Button>
                </div>
              </div>
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <WorkoutAIReportModal
        session={showAIReport ? session : null}
        onClose={() => setShowAIReport(false)}
      />
    </>
  );
}
