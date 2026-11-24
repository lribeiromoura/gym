'use client';

import React, { useMemo, useState } from 'react';
import { Activity, Flame } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from 'recharts';
import { MUSCLE_LABELS, MuscleGroup } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculateMuscleDistribution,
  convertVolumeFromKg,
  getWeightUnitLabel,
} from '@/lib/calculations';
import { BodyHeatmapSVG } from '@/components/analytics/BodyHeatmapSVG';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type PeriodOption = 7 | 30 | 90 | 'all';
type SessionMetric = 'volume' | 'duration' | 'sets';

const PERIOD_OPTIONS: { label: string; value: PeriodOption }[] = [
  { label: '7 Dias', value: 7 },
  { label: '30 Dias', value: 30 },
  { label: '90 Dias', value: 90 },
  { label: 'Tudo', value: 'all' },
];

const radarChartConfig = {
  score: {
    label: 'Séries efetivas',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export function AnalyticsTab() {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const exercises = useWorkoutStore((s) => s.exercises);
  const settings = useWorkoutStore((s) => s.settings);

  const [periodDays, setPeriodDays] = useState<PeriodOption>('all');
  const [chartType, setChartType] = useState<SessionMetric>('volume');

  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(weightUnit);

  const filteredWorkouts = useMemo(() => {
    if (periodDays === 'all') return workoutHistory;
    const cutoff = Date.now() - periodDays * 24 * 3600 * 1000;
    return workoutHistory.filter(
      (w) => new Date(w.startTime).getTime() >= cutoff
    );
  }, [workoutHistory, periodDays]);

  const muscleDistribution = useMemo(
    () => calculateMuscleDistribution(filteredWorkouts, exercises),
    [filteredWorkouts, exercises]
  );

  const { radarData, radarMaxVal } = useMemo(() => {
    const d = muscleDistribution;
    const raw = [
      { axis: 'Peito', score: Number(d.chest.score.toFixed(1)) },
      {
        axis: 'Costas',
        score: Number(
          (d.lats.score + d.upper_back.score + d.lower_back.score).toFixed(1)
        ),
      },
      {
        axis: 'Ombros',
        score: Number((d.shoulders.score + d.traps.score).toFixed(1)),
      },
      {
        axis: 'Braços',
        score: Number(
          (d.biceps.score + d.triceps.score + d.forearms.score).toFixed(1)
        ),
      },
      {
        axis: 'Pernas',
        score: Number(
          (
            d.quads.score +
            d.hamstrings.score +
            d.glutes.score +
            d.calves.score
          ).toFixed(1)
        ),
      },
      {
        axis: 'Core',
        score: Number((d.abs.score + d.lower_back.score * 0.5).toFixed(1)),
      },
    ];
    const maxVal = Math.max(...raw.map((r) => r.score), 6);
    return { radarData: raw, radarMaxVal: Math.ceil(maxVal) };
  }, [muscleDistribution]);

  const topMuscles = useMemo(
    () =>
      (Object.keys(muscleDistribution) as MuscleGroup[])
        .filter((m) => muscleDistribution[m].score > 0)
        .sort(
          (a, b) => muscleDistribution[b].score - muscleDistribution[a].score
        )
        .slice(0, 6),
    [muscleDistribution]
  );

  const sessionMetricMeta = useMemo(() => {
    if (chartType === 'volume') {
      return { label: `Volume (${unitLabel})`, unit: unitLabel };
    }
    if (chartType === 'duration') {
      return { label: 'Duração (min)', unit: 'min' };
    }
    return { label: 'Séries', unit: 'séries' };
  }, [chartType, unitLabel]);

  const sessionChartConfig = useMemo(
    () =>
      ({
        value: {
          label: sessionMetricMeta.label,
          color: 'var(--chart-1)',
        },
      }) satisfies ChartConfig,
    [sessionMetricMeta.label]
  );

  const { sessionChartData, dynamicMax } = useMemo(() => {
    const displayedSessions = [...filteredWorkouts].slice(0, 8).reverse();
    const data = displayedSessions.map((w) => {
      const value =
        chartType === 'volume'
          ? convertVolumeFromKg(w.totalVolumeKg, weightUnit)
          : chartType === 'duration'
            ? Math.round(w.durationSeconds / 60)
            : w.totalSets;
      const dt = new Date(w.startTime);
      return {
        id: w.id,
        title: w.title,
        value,
        dateLabel: dt.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        fullDateLabel: dt.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      };
    });
    const maxInSeries = Math.max(...data.map((d) => d.value), 1);
    return {
      sessionChartData: data,
      dynamicMax: Math.ceil(maxInSeries * 1.15),
    };
  }, [filteredWorkouts, chartType, weightUnit]);

  return (
    <div className="space-y-6">
      {/* Barra de Meta Semanal & Filtro de Período */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="size-4 text-amber-500 shrink-0" />
          <span>
            Meta Semanal:{' '}
            <strong className="text-foreground">
              {settings.weeklyWorkoutGoal} treinos/semana
            </strong>
          </span>
        </div>

        <div
          role="group"
          aria-label="Filtrar período de análise"
          className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/70 p-1"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={String(opt.value)}
              variant={periodDays === opt.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPeriodDays(opt.value)}
              className="min-h-[44px] px-3.5 text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Heatmap Anatômico & Radar de Equilíbrio Muscular */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Mapa Muscular (Heatmap Anatômico)</CardTitle>
            <CardDescription>
              Toque em qualquer músculo no corpo para inspecionar séries e
              volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BodyHeatmapSVG muscleScores={muscleDistribution} />
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle>Equilíbrio Muscular (Radar &amp; Séries)</CardTitle>
            <CardDescription>
              Proporção de séries efetivas entre grupamentos musculares
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col justify-between space-y-5">
            <ChartContainer
              config={radarChartConfig}
              className="aspect-auto h-64 w-full"
            >
              <RadarChart
                data={radarData}
                cx="50%"
                cy="50%"
                outerRadius="72%"
              >
                <PolarGrid className="stroke-border" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{
                    fontSize: 11,
                    fontWeight: 700,
                    fill: 'var(--muted-foreground)',
                  }}
                />
                <PolarRadiusAxis
                  domain={[0, radarMaxVal]}
                  tick={false}
                  axisLine={false}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value) => (
                        <div className="flex flex-1 items-center justify-between gap-3">
                          <span className="text-muted-foreground">
                            Séries efetivas
                          </span>
                          <span className="font-bold tabular-nums text-foreground">
                            {typeof value === 'number'
                              ? `${value.toLocaleString('pt-BR', {
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })} pts`
                              : String(value ?? '0')}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Radar
                  name="Séries efetivas"
                  dataKey="score"
                  stroke="var(--color-score)"
                  fill="var(--color-score)"
                  fillOpacity={0.25}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ChartContainer>

            <div className="space-y-2.5">
              {topMuscles.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  Nenhum volume muscular registrado neste período.
                </p>
              ) : (
                topMuscles.map((m) => {
                  const item = muscleDistribution[m];
                  return (
                    <div key={m} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">
                          {MUSCLE_LABELS[m]}
                        </span>
                        <span className="text-muted-foreground tabular-nums text-right">
                          {item.primarySets} diretas + {item.secondarySets} sin.
                          (
                          <strong className="text-blue-600 dark:text-blue-400">
                            {convertVolumeFromKg(
                              item.volumeKg,
                              weightUnit
                            ).toLocaleString('pt-BR')}{' '}
                            {unitLabel}
                          </strong>
                          )
                        </span>
                      </div>
                      <Progress
                        value={Math.min(100, item.score * 6)}
                        className="h-2"
                      />
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolução por Sessão de Treino */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                Evolução por Sessão de Treino
              </CardTitle>
              <CardDescription className="mt-0.5">
                Comparativo das últimas sessões registradas
              </CardDescription>
            </div>

            <div
              role="group"
              aria-label="Selecionar métrica do gráfico de sessões"
              className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-border bg-secondary/70 p-1"
            >
              <Button
                variant={chartType === 'volume' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('volume')}
                className="min-h-[44px] px-3 text-xs"
              >
                Volume ({unitLabel})
              </Button>
              <Button
                variant={chartType === 'duration' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('duration')}
                className="min-h-[44px] px-3 text-xs"
              >
                Duração (min)
              </Button>
              <Button
                variant={chartType === 'sets' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('sets')}
                className="min-h-[44px] px-3 text-xs"
              >
                Séries
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {sessionChartData.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Complete um treino para visualizar o gráfico de evolução.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/40 p-2 sm:p-3">
              <ChartContainer
                config={sessionChartConfig}
                className="aspect-auto h-64 w-full"
              >
                <BarChart
                  data={sessionChartData}
                  margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
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
                    width={48}
                    fontSize={11}
                    domain={[0, dynamicMax]}
                    tickFormatter={(val: number) =>
                      chartType === 'volume' && val >= 1000
                        ? `${(val / 1000).toFixed(1).replace('.', ',')}k`
                        : `${val}`
                    }
                  />
                  <ChartTooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.45 }}
                    content={
                      <ChartTooltipContent
                        indicator="dot"
                        labelFormatter={(_label, payload) => {
                          const entry = payload?.[0]?.payload;
                          const title =
                            typeof entry?.title === 'string'
                              ? entry.title
                              : '';
                          const fullDate =
                            typeof entry?.fullDateLabel === 'string'
                              ? entry.fullDateLabel
                              : String(_label ?? '');
                          return title ? `${title} • ${fullDate}` : fullDate;
                        }}
                        formatter={(value) => (
                          <div className="flex flex-1 items-center justify-between gap-3">
                            <span className="text-muted-foreground">
                              {sessionMetricMeta.label}
                            </span>
                            <span className="font-bold tabular-nums text-foreground">
                              {typeof value === 'number'
                                ? `${value.toLocaleString('pt-BR')} ${sessionMetricMeta.unit}`
                                : `${String(value ?? '0')} ${sessionMetricMeta.unit}`}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar
                    dataKey="value"
                    fill="var(--color-value)"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={44}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
