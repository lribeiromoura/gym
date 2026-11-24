'use client';

import React, { useMemo, useState } from 'react';
import {
  Award,
  BookmarkPlus,
  Calendar,
  Check,
  Clock,
  Dumbbell,
  Edit3,
  MoreHorizontal,
  Play,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { MUSCLE_LABELS, WorkoutSession } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculate1RM,
  convertVolumeFromKg,
  formatDuration,
  formatSetSummary,
  formatWeightWithUnit,
  getWeightUnitLabel,
} from '@/lib/calculations';
import {
  buildShareUrl,
  encodeRoutineShareToken,
  shareOrCopyLink,
} from '@/lib/share';
import { WorkoutAIReportModal } from '@/components/workout/WorkoutAIReportModal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SocialFeedView() {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const exercises = useWorkoutStore((s) => s.exercises);
  const settings = useWorkoutStore((s) => s.settings);
  const startEmptyWorkout = useWorkoutStore((s) => s.startEmptyWorkout);
  const startWorkoutFromExercises = useWorkoutStore(
    (s) => s.startWorkoutFromExercises
  );
  const startEditWorkoutSession = useWorkoutStore(
    (s) => s.startEditWorkoutSession
  );
  const deleteWorkoutSession = useWorkoutStore((s) => s.deleteWorkoutSession);
  const saveWorkoutSessionAsRoutine = useWorkoutStore(
    (s) => s.saveWorkoutSessionAsRoutine
  );

  const [expandedSessionIds, setExpandedSessionIds] = useState<
    Record<string, boolean>
  >({});
  const [sharedSessionId, setSharedSessionId] = useState<string | null>(null);
  const [aiReportSession, setAiReportSession] = useState<WorkoutSession | null>(
    null
  );
  const [pendingDeleteSession, setPendingDeleteSession] =
    useState<WorkoutSession | null>(null);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );
  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(weightUnit);

  const toggleExpand = (id: string) => {
    setExpandedSessionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Meus Treinos
          </h1>
          <p className="text-sm text-muted-foreground">
            Histórico das suas sessões concluídas ({workoutHistory.length})
          </p>
        </div>
      </div>

      {/* Estado Vazio ou Lista de Treinos do Usuário */}
      {workoutHistory.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center space-y-4">
            <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Nenhum treino registrado ainda
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Assim que você finalizar seu primeiro treino, ele aparecerá aqui
                com todas as séries, volume, tempo e recordes pessoais.
              </p>
            </div>
            <Button
              variant="default"
              onClick={() => startEmptyWorkout('Treino Livre')}
              className="rounded-full px-5 text-xs"
            >
              <Play className="w-4 h-4 fill-current" /> Iniciar Primeiro Treino
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {workoutHistory.map((w) => {
            const isExpanded = !!expandedSessionIds[w.id];
            const musclesTrained = Array.from(
              new Set(
                w.exercises
                  .map((e) => exerciseMap.get(e.exerciseId)?.primaryMuscle)
                  .filter(Boolean)
              )
            );

            return (
              <Card key={w.id}>
                <CardContent className="p-5 space-y-4">
                  {/* Topo do Card: Data/Hora + Ações compactas com área de toque >= 44x44px */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>
                        {new Date(w.startTime).toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        variant="outline"
                        onClick={() => setAiReportSession(w)}
                        title="Gerar Relatório de Treino para Avaliação por IA"
                        aria-label="Relatório para IA"
                        className="h-11 px-3 bg-primary/15 hover:bg-primary/25 border-primary/30 text-xs text-blue-600 dark:text-blue-400"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Relatório IA</span>
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={async () => {
                          const token = encodeRoutineShareToken(
                            w,
                            exercises,
                            settings.name
                          );
                          const url = buildShareUrl(token);
                          const result = await shareOrCopyLink({
                            title: `Treino: ${w.title}`,
                            text: `Confira e importe meu treino "${w.title}" no IronPulse:`,
                            url,
                          });
                          setSharedSessionId(w.id);
                          setTimeout(() => setSharedSessionId(null), 2500);
                          toast.success(
                            result === 'shared'
                              ? 'Treino compartilhado!'
                              : 'Link do treino copiado!'
                          );
                        }}
                        title="Compartilhar Link deste Treino"
                        aria-label="Compartilhar treino"
                        className="h-11 px-3 text-xs"
                      >
                        {sharedSessionId === w.id ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">
                              Compartilhar
                            </span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => {
                          saveWorkoutSessionAsRoutine(w.id);
                          toast.success('Treino salvo como rotina!');
                        }}
                        title="Salvar este treino como rotina reutilizável"
                        aria-label="Virar Rotina"
                        className="h-11 px-3 text-xs"
                      >
                        <BookmarkPlus className="w-4 h-4" />
                        <span className="hidden sm:inline">Virar Rotina</span>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            title="Mais ações do treino"
                            aria-label="Mais ações do treino"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => startEditWorkoutSession(w.id)}
                          >
                            <Edit3 />
                            <span>Editar treino</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              saveWorkoutSessionAsRoutine(w.id);
                              toast.success('Treino salvo como rotina!');
                            }}
                          >
                            <BookmarkPlus />
                            <span>Virar Rotina</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setPendingDeleteSession(w)}
                          >
                            <Trash2 />
                            <span>Excluir treino</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Título e Descrição */}
                  <div className="space-y-1">
                    <h2 className="text-lg font-extrabold text-foreground">
                      {w.title}
                    </h2>
                    {w.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {w.description}
                      </p>
                    )}
                  </div>

                  {/* Métricas da Sessão */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 bg-secondary/60 border border-border rounded-xl p-3">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-600 dark:text-blue-400" />{' '}
                        Tempo
                      </span>
                      <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums">
                        {formatDuration(w.durationSeconds)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Dumbbell className="w-3 h-3 text-blue-600 dark:text-blue-400" />{' '}
                        Volume
                      </span>
                      <p className="text-sm font-extrabold text-foreground mt-0.5 tabular-nums">
                        {convertVolumeFromKg(
                          w.totalVolumeKg,
                          weightUnit
                        ).toLocaleString('pt-BR')}{' '}
                        {unitLabel}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Séries
                      </span>
                      <p className="text-sm font-extrabold text-foreground mt-0.5 tabular-nums">
                        {w.totalSets} séries
                      </p>
                    </div>
                    <div className="col-span-3 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-500" /> Recordes
                      </span>
                      <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                        {w.prCount} PRs
                      </p>
                    </div>
                  </div>

                  {/* Tags Musculares */}
                  {musclesTrained.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {musclesTrained.map((m) =>
                        m ? (
                          <Badge
                            key={m}
                            variant="info"
                            className="rounded-md text-[11px] font-semibold"
                          >
                            {MUSCLE_LABELS[m]}
                          </Badge>
                        ) : null
                      )}
                    </div>
                  )}

                  {/* Lista de Exercícios e Séries */}
                  <div className="space-y-2 border-t border-border pt-3">
                    {w.exercises.map((ex) => {
                      const meta = exerciseMap.get(ex.exerciseId);
                      const isTimeOrDistance =
                        meta?.measurementType === 'duration' ||
                        meta?.measurementType === 'distance_duration';
                      const bestSet = ex.sets.reduce((best, cur) => {
                        if (!best) return cur;
                        if (meta?.measurementType === 'duration') {
                          return (cur.durationSeconds ?? 0) >
                            (best.durationSeconds ?? 0)
                            ? cur
                            : best;
                        }
                        if (meta?.measurementType === 'distance_duration') {
                          return (cur.distanceKm ?? 0) > (best.distanceKm ?? 0)
                            ? cur
                            : best;
                        }
                        const cur1RM = calculate1RM(cur.weightKg, cur.reps);
                        const best1RM = calculate1RM(best.weightKg, best.reps);
                        if (cur1RM === best1RM) {
                          return (cur.reps ?? 0) > (best.reps ?? 0)
                            ? cur
                            : best;
                        }
                        return cur1RM > best1RM ? cur : best;
                      }, ex.sets[0]);
                      const hasPR = ex.sets.some(
                        (s) => s.prs && s.prs.length > 0
                      );

                      return (
                        <div
                          key={ex.id}
                          className="bg-secondary/60 border border-border rounded-xl p-3 space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs">
                            <div className="flex items-center gap-2 font-bold text-foreground min-w-0">
                              <span className="text-blue-600 dark:text-blue-400 shrink-0 tabular-nums">
                                {ex.sets.length} séries
                              </span>
                              <span className="text-muted-foreground shrink-0">•</span>
                              <span className="truncate">
                                {meta?.title || 'Exercício'}
                              </span>
                              {hasPR && (
                                <Badge
                                  variant="warning"
                                  className="px-2 py-0.5 text-[10px] font-extrabold shrink-0"
                                >
                                  <Award className="w-3 h-3" /> PR
                                </Badge>
                              )}
                            </div>
                            {bestSet && (
                              <span className="text-muted-foreground font-semibold shrink-0 tabular-nums">
                                Melhor:{' '}
                                {formatSetSummary(
                                  bestSet,
                                  meta?.measurementType,
                                  weightUnit
                                )}
                              </span>
                            )}
                          </div>

                          {isExpanded && (
                            <div className="space-y-1 pt-2 border-t border-border">
                              {ex.sets.map((s, sIdx) => {
                                const est1rm = calculate1RM(s.weightKg, s.reps);
                                return (
                                  <div
                                    key={s.id}
                                    className="flex items-center justify-between text-[11px] text-foreground px-2.5 py-1.5 rounded-lg bg-card border border-border"
                                  >
                                    <span>
                                      Série{' '}
                                      {s.type === 'warmup'
                                        ? 'W'
                                        : s.type === 'dropset'
                                        ? 'D'
                                        : s.type === 'failure'
                                        ? 'F'
                                        : sIdx + 1}
                                      :{' '}
                                      <strong className="tabular-nums">
                                        {formatSetSummary(
                                          s,
                                          meta?.measurementType,
                                          weightUnit
                                        )}
                                      </strong>
                                    </span>
                                    {!isTimeOrDistance && est1rm > 0 && (
                                      <span className="text-muted-foreground tabular-nums">
                                        1RM:{' '}
                                        {formatWeightWithUnit(
                                          est1rm,
                                          weightUnit
                                        )}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <Button
                        variant="link"
                        onClick={() => toggleExpand(w.id)}
                        className="px-1.5 text-xs text-blue-600 dark:text-blue-400"
                      >
                        {isExpanded ? (
                          <>
                            <span className="sm:hidden">Ocultar séries</span>
                            <span className="hidden sm:inline">
                              Ocultar detalhes das séries
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="sm:hidden">Ver séries</span>
                            <span className="hidden sm:inline">
                              Ver todas as séries detalhadas
                            </span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() =>
                          startWorkoutFromExercises(w.title, w.exercises)
                        }
                        className="h-11 px-3 shrink-0 bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-400"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Repetir
                        Treino
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmação acessível para exclusão de treino */}
      <ConfirmDialog
        open={Boolean(pendingDeleteSession)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteSession(null);
        }}
        title="Excluir treino do histórico?"
        description={
          pendingDeleteSession
            ? `Tem certeza que deseja excluir "${pendingDeleteSession.title}"? Essa ação não pode ser desfeita.`
            : undefined
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={() => {
          if (pendingDeleteSession) {
            deleteWorkoutSession(pendingDeleteSession.id);
            toast.success('Treino excluído do histórico.');
            setPendingDeleteSession(null);
          }
        }}
      />

      {/* Modal de Relatório de Treino para Avaliação por IA */}
      <WorkoutAIReportModal
        session={aiReportSession}
        onClose={() => setAiReportSession(null)}
      />
    </div>
  );
}
