'use client';

import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';
import { WeeklyNutritionStats } from '@/lib/nutrition-calculations';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

interface CalorieRingChartProps {
  calories: number;
  effectiveTargetCalories: number;
  remainingCalories: number;
  adherencePct: number;
}

const calorieRingConfig = {
  consumed: {
    label: 'Consumido',
    color: 'var(--chart-1)',
  },
  remaining: {
    label: 'Restante',
    color: 'var(--muted)',
  },
} satisfies ChartConfig;

export function CalorieRingChart({
  calories,
  effectiveTargetCalories,
  remainingCalories,
  adherencePct,
}: CalorieRingChartProps) {
  const isOverCalories = remainingCalories < 0;

  const activeColor = isOverCalories
    ? 'var(--destructive)'
    : adherencePct >= 85 && adherencePct <= 105
      ? 'var(--chart-2)'
      : 'var(--chart-1)';

  const ringData = useMemo(() => {
    const safeConsumed = Math.max(0, calories);
    const safeRemaining = isOverCalories
      ? 0
      : Math.max(0, effectiveTargetCalories - safeConsumed);

    if (safeConsumed === 0 && safeRemaining === 0) {
      return [
        {
          key: 'remaining',
          name: 'Restante',
          value: 1,
          fill: 'var(--muted)',
        },
      ];
    }

    return [
      {
        key: 'consumed',
        name: 'Consumido',
        value: safeConsumed,
        fill: activeColor,
      },
      {
        key: 'remaining',
        name: 'Restante',
        value: safeRemaining,
        fill: 'var(--muted)',
      },
    ];
  }, [calories, effectiveTargetCalories, isOverCalories, activeColor]);

  const showPaddingAngle = calories > 0 && remainingCalories > 0;

  return (
    <div
      className="relative flex size-44 shrink-0 items-center justify-center"
      role="img"
      aria-label={`Calorias consumidas: ${calories} de ${effectiveTargetCalories} kcal`}
    >
      <ChartContainer
        config={calorieRingConfig}
        className="aspect-square size-44"
      >
        <PieChart>
          <Pie
            data={ringData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius="72%"
            outerRadius="92%"
            cornerRadius={8}
            paddingAngle={showPaddingAngle ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {ringData.map((entry) => (
              <Cell key={entry.key} fill={entry.fill} />
            ))}
          </Pie>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => (
                  <div className="flex flex-1 items-center justify-between gap-3">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-bold tabular-nums text-foreground">
                      {typeof value === 'number'
                        ? `${value.toLocaleString('pt-BR')} kcal`
                        : value}
                    </span>
                  </div>
                )}
              />
            }
          />
        </PieChart>
      </ChartContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span
          className={`text-2xl font-black tabular-nums leading-tight ${
            isOverCalories ? 'text-destructive' : 'text-foreground'
          }`}
        >
          {Math.abs(remainingCalories).toLocaleString('pt-BR')}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {isOverCalories ? 'Excedidas' : 'Restantes'}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
          {adherencePct}% da meta
        </span>
      </div>
    </div>
  );
}

interface WeeklyCaloriesChartProps {
  weeklyStats: WeeklyNutritionStats;
  targetCalories: number;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

const weeklyChartConfig = {
  calories: {
    label: 'Calorias',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

export function WeeklyCaloriesChart({
  weeklyStats,
  targetCalories,
  selectedDate,
  onSelectDate,
}: WeeklyCaloriesChartProps) {
  const chartData = useMemo(
    () =>
      weeklyStats.days.map((day) => {
        const isOver = day.calories > targetCalories * 1.1;
        const fill = !day.hasFoodLogs
          ? 'var(--muted)'
          : isOver
            ? 'var(--destructive)'
            : day.withinGoal
              ? 'var(--chart-2)'
              : 'var(--chart-1)';
        return {
          ...day,
          fill,
          dateFormatted: new Date(`${day.date}T12:00:00`).toLocaleDateString(
            'pt-BR',
            { day: '2-digit', month: '2-digit' }
          ),
        };
      }),
    [weeklyStats.days, targetCalories]
  );

  const maxWeeklyKcal = useMemo(
    () =>
      Math.max(
        Math.ceil(targetCalories * 1.2),
        ...weeklyStats.days.map((d) => Math.ceil(d.calories * 1.1)),
        1500
      ),
    [weeklyStats.days, targetCalories]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-blue-600 dark:text-blue-400" />
              Calorias dos Últimos 7 Dias
            </CardTitle>
            <CardDescription className="mt-0.5">
              Comparativo diário vs linha de meta (
              {targetCalories.toLocaleString('pt-BR')} kcal)
            </CardDescription>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {weeklyStats.daysWithinGoal}/{weeklyStats.loggedDaysCount} dias na
            meta
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl border border-border bg-secondary/40 p-2 sm:p-3">
          <ChartContainer
            config={weeklyChartConfig}
            className="aspect-auto h-52 w-full"
          >
            <BarChart
              data={chartData}
              margin={{ top: 18, right: 8, left: -12, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="dayLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                domain={[0, maxWeeklyKcal]}
                fontSize={11}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1).replace('.0', '')}k` : `${v}`
                }
              />
              <ReferenceLine
                y={targetCalories}
                stroke="var(--chart-1)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Meta ${targetCalories}`,
                  position: 'insideTopRight',
                  fill: 'var(--chart-1)',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) => {
                      const row = payload[0]?.payload as
                        | {
                            dayLabel?: string;
                            dateFormatted?: string;
                          }
                        | undefined;
                      if (!row) return null;
                      return `${row.dayLabel ?? ''} (${row.dateFormatted ?? ''})`;
                    }}
                    formatter={(value, _name, item) => {
                      const row = item.payload as
                        | {
                            proteinG?: number;
                            carbsG?: number;
                            fatG?: number;
                            hasFoodLogs?: boolean;
                          }
                        | undefined;
                      const kcalNum = typeof value === 'number' ? value : 0;
                      return (
                        <div className="flex flex-1 flex-col gap-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              Calorias
                            </span>
                            <span className="font-bold tabular-nums text-foreground">
                              {kcalNum.toLocaleString('pt-BR')} kcal
                            </span>
                          </div>
                          {row?.hasFoodLogs && (
                            <div className="text-[11px] tabular-nums text-muted-foreground">
                              P {fmt1(row.proteinG ?? 0)}g • C{' '}
                              {fmt1(row.carbsG ?? 0)}g • G {fmt1(row.fatG ?? 0)}g
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey="calories"
                radius={[8, 8, 2, 2]}
                maxBarSize={36}
                minPointSize={6}
                className="cursor-pointer"
                onClick={(entry) => {
                  const clickedDate = (entry as { date?: string })?.date;
                  if (clickedDate) {
                    onSelectDate(clickedDate);
                  }
                }}
              >
                {chartData.map((day) => {
                  const isSelected = day.date === selectedDate;
                  return (
                    <Cell
                      key={day.date}
                      fill={day.fill}
                      stroke={isSelected ? 'var(--foreground)' : 'none'}
                      strokeWidth={isSelected ? 2 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>

        {/* Médias Semanais */}
        <div className="grid grid-cols-2 gap-2.5 text-center sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-secondary/60 p-3">
            <span className="block text-[11px] font-semibold text-muted-foreground">
              Média Calorias
            </span>
            <span className="text-base font-extrabold tabular-nums text-foreground">
              {weeklyStats.avgCalories > 0
                ? `${weeklyStats.avgCalories.toLocaleString('pt-BR')} kcal`
                : '—'}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-secondary/60 p-3">
            <span className="block text-[11px] font-semibold text-muted-foreground">
              Média Proteína
            </span>
            <span className="text-base font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
              {weeklyStats.avgProteinG > 0
                ? `${fmt1(weeklyStats.avgProteinG)}g`
                : '—'}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-secondary/60 p-3">
            <span className="block text-[11px] font-semibold text-muted-foreground">
              Média Carboidrato
            </span>
            <span className="text-base font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
              {weeklyStats.avgCarbsG > 0
                ? `${fmt1(weeklyStats.avgCarbsG)}g`
                : '—'}
            </span>
          </div>
          <div className="rounded-xl border border-border bg-secondary/60 p-3">
            <span className="block text-[11px] font-semibold text-muted-foreground">
              Média Água
            </span>
            <span className="text-base font-extrabold tabular-nums text-sky-600 dark:text-sky-400">
              {weeklyStats.avgWaterMl > 0
                ? `${(weeklyStats.avgWaterMl / 1000).toFixed(2).replace('.', ',')} L`
                : '—'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
