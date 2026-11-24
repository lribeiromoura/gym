'use client';

import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Dumbbell,
  History,
  Info,
  Trash2,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { EQUIPMENT_LABELS, Exercise, MUSCLE_LABELS } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculate1RM,
  convertWeightFromKg,
  formatSetSummary,
  formatWeightWithUnit,
  getExerciseRecords,
  getRepMaxTable,
  getWeightUnitLabel,
} from '@/lib/calculations';
import { BodyHeatmapSVG } from '@/components/analytics/BodyHeatmapSVG';
import { fetchExerciseDBDetail, searchExerciseDB } from '@/lib/exercisedb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';

export interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  onClose: () => void;
}

type MetricKey = 'heaviest' | '1rm' | 'volume';

const METRIC_META: Record<MetricKey, { label: string; color: string }> = {
  '1rm': { label: '1RM Estimado', color: 'var(--chart-1)' },
  heaviest: { label: 'Maior Peso', color: 'var(--chart-1)' },
  volume: { label: 'Volume Sessão', color: 'var(--chart-2)' },
};

export function ExerciseDetailModal({
  exercise,
  onClose,
}: ExerciseDetailModalProps) {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const routines = useWorkoutStore((s) => s.routines);
  const settings = useWorkoutStore((s) => s.settings);
  const importExercisesBatch = useWorkoutStore((s) => s.importExercisesBatch);
  const deleteExercise = useWorkoutStore((s) => s.deleteExercise);

  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(weightUnit);

  const [activeTab, setActiveTab] = useState<'summary' | 'history' | 'howto'>(
    'summary'
  );
  const [metric, setMetric] = useState<MetricKey>('1rm');
  const [resolvedGifUrl, setResolvedGifUrl] = useState<string | undefined>(
    undefined
  );
  const [gifFailed, setGifFailed] = useState(false);
  const [resolvedInstructions, setResolvedInstructions] = useState<string[]>(
    []
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const rawGradientId = useId();
  const gradientId = `exercise-evolution-${rawGradientId.replace(/:/g, '')}`;

  useEffect(() => {
    setGifFailed(false);
    setShowDeleteConfirm(false);
    if (!exercise) {
      setResolvedGifUrl(undefined);
      setResolvedInstructions([]);
      return;
    }
    setActiveTab('summary');
    setResolvedGifUrl(exercise.gifUrl);
    setResolvedInstructions(exercise.instructions || []);

    let cancelled = false;
    (async () => {
      if (exercise.externalId) {
        const detail = await fetchExerciseDBDetail(exercise.externalId);
        if (!cancelled && detail) {
          if (detail.gifUrl) setResolvedGifUrl(detail.gifUrl);
          if (detail.instructions.length > 0) {
            setResolvedInstructions(detail.instructions);
          }
          importExercisesBatch([detail]);
          return;
        }
      }
      if (!exercise.gifUrl) {
        const query = exercise.englishTitle || exercise.title;
        const results = await searchExerciseDB(query);
        if (!cancelled && results.length > 0 && results[0].gifUrl) {
          setResolvedGifUrl(results[0].gifUrl);
          importExercisesBatch([
            {
              ...exercise,
              gifUrl: results[0].gifUrl,
              englishTitle: exercise.englishTitle || results[0].englishTitle,
            },
          ]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [exercise, importExercisesBatch]);

  const records = useMemo(() => {
    if (!exercise) return null;
    return getExerciseRecords(exercise.id, workoutHistory);
  }, [exercise, workoutHistory]);

  const exerciseSessions = useMemo(() => {
    if (!exercise) return [];
    return workoutHistory
      .map((session) => {
        const found = session.exercises.find(
          (e) => e.exerciseId === exercise.id
        );
        if (!found) return null;
        const completedSets = found.sets.filter((s) => s.completed);
        if (completedSets.length === 0) return null;

        let maxWeight = 0;
        let max1RM = 0;
        let sessionVolume = 0;

        for (const s of completedSets) {
          if (s.type === 'warmup') continue;
          const w = s.weightKg ?? 0;
          const r = s.reps ?? 0;
          if (w > maxWeight) maxWeight = w;
          const e1rm = calculate1RM(w, r);
          if (e1rm > max1RM) max1RM = e1rm;
          sessionVolume += w * r;
        }

        return {
          sessionId: session.id,
          workoutTitle: session.title,
          date: session.startTime,
          notes: found.notes,
          sets: completedSets,
          maxWeight,
          max1RM,
          sessionVolume,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .reverse();
  }, [exercise, workoutHistory]);

  const usageCounts = useMemo(() => {
    if (!exercise) return { routines: 0, history: 0 };
    return {
      routines: routines.filter((r) =>
        r.exercises.some((ex) => ex.exerciseId === exercise.id)
      ).length,
      history: workoutHistory.filter((w) =>
        w.exercises.some((ex) => ex.exerciseId === exercise.id)
      ).length,
    };
  }, [exercise, routines, workoutHistory]);

  if (!exercise || !records) return null;

  const activeMetricMeta = METRIC_META[metric];

  const chartConfig: ChartConfig = {
    value: {
      label: activeMetricMeta.label,
      color: activeMetricMeta.color,
    },
  };

  const chartPoints = exerciseSessions.map((s) => {
    const rawKg =
      metric === 'heaviest'
        ? s.maxWeight
        : metric === '1rm'
        ? s.max1RM
        : s.sessionVolume;
    const displayVal = convertWeightFromKg(rawKg, weightUnit) ?? 0;
    const dateObj = new Date(s.date);
    return {
      dateLabel: dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      fullDateLabel: dateObj.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      value: displayVal,
      rawKg,
    };
  });

  const repMaxRows = getRepMaxTable(records.best1RM?.value || 100);

  const handleConfirmDelete = () => {
    const title = exercise.title;
    deleteExercise(exercise.id);
    setShowDeleteConfirm(false);
    toast.success(`Exercício "${title}" excluído da biblioteca.`);
    onClose();
  };

  return (
    <>
      <ResponsiveDialog
        open={Boolean(exercise)}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-2xl">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="text-lg">
              {exercise.title}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Primário:{' '}
              <span className="text-blue-600 dark:text-blue-400 font-semibold">
                {MUSCLE_LABELS[exercise.primaryMuscle]}
              </span>{' '}
              • Equipamento:{' '}
              <span className="text-foreground font-medium">
                {EQUIPMENT_LABELS[exercise.equipment]}
              </span>
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as 'summary' | 'history' | 'howto')
            }
            className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
          >
            <div className="shrink-0 border-b border-border bg-secondary/40 px-4 py-2.5">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="summary" className="min-h-11 px-1.5 sm:px-3 text-xs sm:text-sm">
                  <TrendingUp className="size-3.5 sm:size-4 shrink-0" />
                  <span className="sm:hidden">Resumo</span>
                  <span className="hidden sm:inline truncate">Resumo &amp; PRs</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="min-h-11 px-1.5 sm:px-3 text-xs sm:text-sm">
                  <History className="size-3.5 sm:size-4 shrink-0" />
                  <span className="truncate">
                    Histórico ({exerciseSessions.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger value="howto" className="min-h-11 px-1.5 sm:px-3 text-xs sm:text-sm">
                  <BookOpen className="size-3.5 sm:size-4 shrink-0" />
                  <span className="sm:hidden">Execução</span>
                  <span className="hidden sm:inline truncate">Como Fazer &amp; 1RM</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <TabsContent value="summary" className="mt-0 space-y-5">
                {resolvedGifUrl && !gifFailed && (
                  <Card className="bg-secondary/50 p-3 flex flex-col items-center justify-center shadow-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedGifUrl}
                      alt={exercise.title}
                      loading="lazy"
                      onError={() => setGifFailed(true)}
                      className="size-44 object-contain rounded-xl bg-muted"
                    />
                    <span className="text-[11px] text-muted-foreground mt-1.5">
                      Demonstração da Execução (ExerciseDB)
                    </span>
                  </Card>
                )}

                <Card className="bg-secondary/50 p-4 flex flex-col sm:flex-row items-center gap-4 shadow-none">
                  <div className="flex-1 space-y-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Anatomia Recrutada
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="info" className="rounded-lg px-2.5 py-1">
                        Primário: {MUSCLE_LABELS[exercise.primaryMuscle]}
                      </Badge>
                      {exercise.secondaryMuscles.map((sec) => (
                        <Badge
                          key={sec}
                          variant="secondary"
                          className="rounded-lg px-2.5 py-1 font-medium"
                        >
                          Secundário: {MUSCLE_LABELS[sec]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="w-44 shrink-0">
                    <BodyHeatmapSVG
                      highlightPrimary={exercise.primaryMuscle}
                      highlightSecondary={exercise.secondaryMuscles}
                      compact
                    />
                  </div>
                </Card>

                <Card className="bg-secondary/50 p-4 space-y-4 shadow-none">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      Evolução do Exercício
                    </h3>
                    <div className="grid grid-cols-3 sm:flex items-center gap-1 rounded-xl border border-border bg-card p-1">
                      {(
                        [
                          { id: '1rm', label: '1RM Estimado' },
                          { id: 'heaviest', label: 'Maior Peso' },
                          { id: 'volume', label: 'Volume Sessão' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setMetric(opt.id)}
                          aria-pressed={metric === opt.id}
                          className={cn(
                            'min-h-11 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                            metric === opt.id
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {chartPoints.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      Ainda não há sessões registradas para este exercício.
                    </p>
                  ) : (
                    <div className="pt-1">
                      <ChartContainer
                        config={chartConfig}
                        className="aspect-auto h-48 w-full"
                      >
                        <AreaChart
                          data={chartPoints}
                          margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id={gradientId}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="var(--color-value)"
                                stopOpacity={0.35}
                              />
                              <stop
                                offset="95%"
                                stopColor="var(--color-value)"
                                stopOpacity={0.02}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            vertical={false}
                            strokeDasharray="4 4"
                            className="stroke-border"
                          />
                          <XAxis
                            dataKey="dateLabel"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            fontSize={11}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={6}
                            width={52}
                            fontSize={11}
                            domain={['auto', 'auto']}
                            tickFormatter={(val: number) =>
                              `${val}${unitLabel}`
                            }
                          />
                          <ChartTooltip
                            cursor={{
                              stroke: 'var(--border)',
                              strokeDasharray: '4 4',
                            }}
                            content={
                              <ChartTooltipContent
                                indicator="dot"
                                labelFormatter={(_label, payload) => {
                                  const fullDate =
                                    payload?.[0]?.payload?.fullDateLabel;
                                  return typeof fullDate === 'string'
                                    ? fullDate
                                    : String(_label ?? '');
                                }}
                                formatter={(value, _name, item) => {
                                  const rawKg =
                                    typeof item?.payload?.rawKg === 'number'
                                      ? item.payload.rawKg
                                      : null;
                                  const formatted =
                                    rawKg !== null
                                      ? formatWeightWithUnit(
                                          rawKg,
                                          weightUnit,
                                          true
                                        )
                                      : `${Number(value).toLocaleString('pt-BR')} ${unitLabel}`;
                                  return (
                                    <div className="flex flex-1 items-center justify-between gap-3">
                                      <span className="text-muted-foreground">
                                        {activeMetricMeta.label}
                                      </span>
                                      <span className="font-bold tabular-nums text-foreground">
                                        {formatted}
                                      </span>
                                    </div>
                                  );
                                }}
                              />
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="var(--color-value)"
                            strokeWidth={2.5}
                            fill={`url(#${gradientId})`}
                            dot={{
                              r: 4,
                              fill: 'var(--color-value)',
                              stroke: 'var(--card)',
                              strokeWidth: 2,
                            }}
                            activeDot={{
                              r: 6,
                              fill: 'var(--color-value)',
                              stroke: 'var(--card)',
                              strokeWidth: 2,
                            }}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </div>
                  )}
                </Card>

                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Trophy className="size-4 text-amber-500" />
                    Recordes Pessoais (PRs)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="bg-secondary/50 p-3 shadow-none">
                      <span className="text-[11px] text-muted-foreground">
                        1RM Estimado
                      </span>
                      <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                        {records.best1RM
                          ? formatWeightWithUnit(
                              records.best1RM.value,
                              weightUnit,
                              true
                            )
                          : '—'}
                      </p>
                    </Card>
                    <Card className="bg-secondary/50 p-3 shadow-none">
                      <span className="text-[11px] text-muted-foreground">
                        Maior Peso
                      </span>
                      <p className="text-lg font-extrabold text-foreground mt-1 tabular-nums">
                        {records.heaviestWeight
                          ? formatWeightWithUnit(
                              records.heaviestWeight.value,
                              weightUnit,
                              true
                            )
                          : '—'}
                      </p>
                    </Card>
                    <Card className="bg-secondary/50 p-3 shadow-none">
                      <span className="text-[11px] text-muted-foreground">
                        Melhor Série (Vol)
                      </span>
                      <p className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
                        {records.bestSetVolume
                          ? formatWeightWithUnit(
                              records.bestSetVolume.value,
                              weightUnit,
                              true
                            )
                          : '—'}
                      </p>
                    </Card>
                    <Card className="bg-secondary/50 p-3 shadow-none">
                      <span className="text-[11px] text-muted-foreground">
                        Volume Máx Sessão
                      </span>
                      <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                        {records.bestSessionVolume
                          ? formatWeightWithUnit(
                              records.bestSessionVolume.value,
                              weightUnit,
                              true
                            )
                          : '—'}
                      </p>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="history" className="mt-0 space-y-4">
                {exerciseSessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Nenhum histórico encontrado para este exercício.
                  </div>
                ) : (
                  [...exerciseSessions].reverse().map((sess) => (
                    <Card
                      key={sess.sessionId}
                      className="bg-secondary/40 p-4 space-y-3 shadow-none"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border pb-2.5">
                        <div className="min-w-0">
                          <h4 className="font-bold text-foreground text-sm truncate">
                            {sess.workoutTitle}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="size-3.5 shrink-0" />
                            {new Date(sess.date).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        <div className="text-right text-xs shrink-0">
                          <span className="text-muted-foreground">
                            1RM da Sessão:{' '}
                          </span>
                          <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                            {sess.max1RM > 0
                              ? formatWeightWithUnit(
                                  sess.max1RM,
                                  weightUnit,
                                  true
                                )
                              : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {sess.sets.map((s, idx) => {
                          const est1rm = calculate1RM(s.weightKg, s.reps);
                          return (
                            <div
                              key={s.id}
                              className="flex items-center justify-between gap-2 text-xs py-2 px-3 rounded-xl bg-card border border-border"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="size-6 rounded-md flex items-center justify-center font-bold text-[11px] bg-secondary text-secondary-foreground shrink-0">
                                  {s.type === 'warmup'
                                    ? 'W'
                                    : s.type === 'dropset'
                                    ? 'D'
                                    : s.type === 'failure'
                                    ? 'F'
                                    : idx + 1}
                                </span>
                                <span className="text-foreground font-semibold truncate">
                                  {formatSetSummary(
                                    s,
                                    exercise.measurementType,
                                    weightUnit
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {s.prs && s.prs.length > 0 && (
                                  <Badge
                                    variant="warning"
                                    className="text-[10px] px-2 py-0.5"
                                  >
                                    <Award className="size-3" /> PR
                                  </Badge>
                                )}
                                {exercise.measurementType !== 'duration' &&
                                  exercise.measurementType !==
                                    'distance_duration' &&
                                  est1rm > 0 && (
                                    <span className="text-muted-foreground tabular-nums">
                                      1RM:{' '}
                                      {formatWeightWithUnit(est1rm, weightUnit)}
                                    </span>
                                  )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="howto" className="mt-0 space-y-5">
                {resolvedGifUrl && !gifFailed && (
                  <Card className="bg-secondary/50 p-4 flex flex-col items-center justify-center shadow-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolvedGifUrl}
                      alt={exercise.title}
                      loading="lazy"
                      onError={() => setGifFailed(true)}
                      className="size-52 object-contain rounded-xl bg-muted"
                    />
                  </Card>
                )}

                <Card className="bg-secondary/50 p-4 space-y-3 shadow-none">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Dumbbell className="size-4 text-primary" />
                    Instruções Passo a Passo
                  </h3>
                  {resolvedInstructions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma instrução cadastrada para este exercício.
                    </p>
                  ) : (
                    <ol className="space-y-2.5 text-xs sm:text-sm text-foreground/90 list-decimal list-inside">
                      {resolvedInstructions.map((step, i) => (
                        <li key={i} className="leading-relaxed">
                          {step}
                        </li>
                      ))}
                    </ol>
                  )}
                  {exercise.tips && (
                    <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/25 text-xs text-foreground flex items-start gap-2">
                      <Info className="size-4 text-primary shrink-0 mt-0.5" />
                      <span>{exercise.tips}</span>
                    </div>
                  )}
                </Card>

                <Card className="bg-secondary/50 p-4 space-y-3 shadow-none">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      Tabela de Equivalência 1RM
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      Baseada no 1RM de{' '}
                      <strong className="text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatWeightWithUnit(
                          records.best1RM?.value || 100,
                          weightUnit,
                          true
                        )}
                      </strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {repMaxRows.map((row) => (
                      <div
                        key={row.reps}
                        className="bg-card border border-border rounded-xl p-2.5 flex items-center justify-between gap-2"
                      >
                        <span className="text-muted-foreground font-medium">
                          {row.reps} {row.reps === 1 ? 'rep' : 'reps'} (
                          {row.pct}%)
                        </span>
                        <span className="font-bold text-foreground tabular-nums">
                          {formatWeightWithUnit(row.weight, weightUnit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>
            </div>
          </Tabs>

          {/* Rodapé com ação protegida de Excluir Exercício */}
          <ResponsiveDialogFooter className="flex-row items-center justify-between sm:justify-between">
            <Button
              variant="destructive-outline"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="size-4" />
              Excluir Exercício
            </Button>

            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={`Excluir "${exercise.title}"?`}
        description={
          <>
            <span>
              Tem certeza que deseja excluir este exercício da biblioteca?
            </span>
            {(usageCounts.routines > 0 || usageCounts.history > 0) && (
              <span className="block mt-2 font-semibold text-amber-700 dark:text-amber-400">
                Atenção: este exercício está vinculado a {usageCounts.routines}{' '}
                rotina(s) e {usageCounts.history} treino(s) no histórico.
              </span>
            )}
          </>
        }
        confirmLabel="Excluir Exercício"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
