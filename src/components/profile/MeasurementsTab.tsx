'use client';

import React, { useId, useMemo, useState } from 'react';
import { Plus, Scale, Trash2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  convertWeightFromKg,
  formatWeightValue,
  getWeightUnitLabel,
} from '@/lib/calculations';
import { AddMeasurementDialog } from '@/components/profile/AddMeasurementDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type MeasureMetricKey =
  | 'weightKg'
  | 'bodyFatPct'
  | 'rightBicepCm'
  | 'chestCm'
  | 'waistCm'
  | 'rightThighCm';

export function MeasurementsTab() {
  const measurements = useWorkoutStore((s) => s.measurements);
  const settings = useWorkoutStore((s) => s.settings);
  const deleteBodyMeasurement = useWorkoutStore((s) => s.deleteBodyMeasurement);

  const [measureMetric, setMeasureMetric] =
    useState<MeasureMetricKey>('weightKg');
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const gradientId = useId().replace(/:/g, '');
  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(weightUnit);

  const measureMeta: Record<MeasureMetricKey, { label: string; unit: string }> =
    useMemo(
      () => ({
        weightKg: { label: 'Peso Corporal', unit: unitLabel },
        bodyFatPct: { label: 'Gordura Corporal (BF)', unit: '%' },
        rightBicepCm: { label: 'Bíceps', unit: 'cm' },
        chestCm: { label: 'Peitoral', unit: 'cm' },
        waistCm: { label: 'Cintura', unit: 'cm' },
        rightThighCm: { label: 'Coxa / Quadríceps', unit: 'cm' },
      }),
      [unitLabel]
    );

  const activeMeta = measureMeta[measureMetric];

  const chartConfig = useMemo(
    () =>
      ({
        value: {
          label: activeMeta.label,
          color: 'var(--chart-1)',
        },
      }) satisfies ChartConfig,
    [activeMeta.label]
  );

  const chartPoints = useMemo(() => {
    const sorted = [...measurements].sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    return sorted
      .map((m) => {
        const rawVal = m[measureMetric];
        if (rawVal === undefined) return null;
        const displayNumeric =
          measureMetric === 'weightKg'
            ? (convertWeightFromKg(rawVal, weightUnit) ?? rawVal)
            : rawVal;
        const dt = new Date(`${m.date}T12:00:00`);
        return {
          id: m.id,
          value: displayNumeric,
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
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [measurements, measureMetric, weightUnit]);

  const metricDelta = useMemo(() => {
    if (chartPoints.length < 2) return null;
    const first = chartPoints[0].value;
    const last = chartPoints[chartPoints.length - 1].value;
    const diff = Math.round((last - first) * 10) / 10;
    return diff;
  }, [chartPoints]);

  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    deleteBodyMeasurement(pendingDeleteId);
    setPendingDeleteId(null);
    toast.success('Medida corporal excluída.');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-foreground">
            Rastreador de Medidas Corporais &amp; Peso
          </h2>
          <p className="text-xs text-muted-foreground">
            Acompanhe a evolução de peso, percentual de gordura e
            circunferências
          </p>
        </div>

        <Button
          onClick={() => setShowAddMeasurement(true)}
          className="rounded-full min-h-[44px] px-4 text-xs"
        >
          <Plus className="size-4" /> Registrar Medida
        </Button>
      </div>

      {measurements.length === 0 ? (
        <Card className="border-dashed p-10 text-center space-y-3 shadow-none">
          <Scale className="size-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">
            Nenhuma medida corporal registrada
          </h3>
          <p className="text-xs text-muted-foreground">
            Clique em &ldquo;Registrar Medida&rdquo; para acompanhar seu peso e
            medidas.
          </p>
        </Card>
      ) : (
        <>
          {/* Seletor de Métrica, Gráfico de Evolução e Cards */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>{activeMeta.label}</CardTitle>
                  <CardDescription className="mt-0.5">
                    Evolução histórica ({activeMeta.unit})
                  </CardDescription>
                </div>
                {metricDelta !== null && (
                  <Badge
                    variant={
                      metricDelta === 0
                        ? 'secondary'
                        : metricDelta > 0
                          ? 'info'
                          : 'success'
                    }
                    className="tabular-nums"
                  >
                    {metricDelta > 0 ? '+' : ''}
                    {String(metricDelta).replace('.', ',')} {activeMeta.unit}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div
                role="group"
                aria-label="Selecionar métrica corporal"
                className="flex flex-wrap gap-2"
              >
                {(Object.keys(measureMeta) as MeasureMetricKey[]).map((key) => {
                  const isActive = measureMetric === key;
                  return (
                    <Button
                      key={key}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setMeasureMetric(key)}
                      className="min-h-[44px] px-3.5 text-xs"
                    >
                      {measureMeta[key].label}
                    </Button>
                  );
                })}
              </div>

              {/* Gráfico Recharts AreaChart */}
              <div className="rounded-xl border border-border bg-secondary/40 p-2 sm:p-3">
                {chartPoints.length === 0 ? (
                  <div className="flex h-56 items-center justify-center text-xs text-muted-foreground text-center px-4">
                    Nenhum registro para {activeMeta.label} ainda.
                  </div>
                ) : (
                  <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-56 w-full"
                  >
                    <AreaChart
                      data={chartPoints}
                      margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
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
                            stopOpacity={0.32}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-value)"
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="4 4" />
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
                          `${String(val).replace('.', ',')}${activeMeta.unit}`
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
                            formatter={(value) => (
                              <div className="flex flex-1 items-center justify-between gap-3">
                                <span className="text-muted-foreground">
                                  {activeMeta.label}
                                </span>
                                <span className="font-bold tabular-nums text-foreground">
                                  {typeof value === 'number'
                                    ? `${value.toLocaleString('pt-BR')} ${activeMeta.unit}`
                                    : `${String(value ?? '—')} ${activeMeta.unit}`}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-value)"
                        strokeWidth={2.5}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={false}
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
                )}
              </div>

              {/* Cards individuais de registros */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {measurements.map((m) => {
                  const rawVal = m[measureMetric];
                  const displayVal =
                    rawVal !== undefined
                      ? measureMetric === 'weightKg'
                        ? formatWeightValue(rawVal, weightUnit)
                        : String(rawVal).replace('.', ',')
                      : '—';
                  return (
                    <Card
                      key={m.id}
                      className="bg-secondary/50 p-3 flex flex-col justify-between shadow-none"
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="tabular-nums">
                          {new Date(`${m.date}T12:00:00`).toLocaleDateString(
                            'pt-BR'
                          )}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir medida corporal"
                          onClick={() => setPendingDeleteId(m.id)}
                          className="-mr-2 -mt-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                      <p className="text-xl font-extrabold text-foreground mt-1 tabular-nums">
                        {displayVal}{' '}
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {activeMeta.unit}
                        </span>
                      </p>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tabela Completa de Histórico de Medidas */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-secondary/70 text-muted-foreground uppercase text-[10px] border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-bold">Data</th>
                    <th className="py-3 px-4 font-bold">Peso</th>
                    <th className="py-3 px-4 font-bold">BF %</th>
                    <th className="py-3 px-4 font-bold">Kcal</th>
                    <th className="py-3 px-4 font-bold">Peito</th>
                    <th className="py-3 px-4 font-bold">Bíceps</th>
                    <th className="py-3 px-4 font-bold">Cintura</th>
                    <th className="py-3 px-4 font-bold">Coxa</th>
                    <th className="py-3 px-4 font-bold">Panturrilha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground/90">
                  {[...measurements].reverse().map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-secondary/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold tabular-nums whitespace-nowrap">
                        {new Date(`${m.date}T12:00:00`).toLocaleDateString(
                          'pt-BR'
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-foreground tabular-nums whitespace-nowrap">
                        {m.weightKg
                          ? `${formatWeightValue(m.weightKg, weightUnit)} ${unitLabel}`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-semibold tabular-nums whitespace-nowrap">
                        {m.bodyFatPct
                          ? `${String(m.bodyFatPct).replace('.', ',')}%`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                        {m.caloricIntakeKcal
                          ? `${m.caloricIntakeKcal.toLocaleString('pt-BR')} kcal`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                        {m.chestCm
                          ? `${String(m.chestCm).replace('.', ',')} cm`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-600 dark:text-blue-400 tabular-nums whitespace-nowrap">
                        {m.rightBicepCm
                          ? `${String(m.rightBicepCm).replace('.', ',')} cm`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                        {m.waistCm
                          ? `${String(m.waistCm).replace('.', ',')} cm`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                        {m.rightThighCm
                          ? `${String(m.rightThighCm).replace('.', ',')} cm`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 tabular-nums whitespace-nowrap">
                        {m.calfCm
                          ? `${String(m.calfCm).replace('.', ',')} cm`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <AddMeasurementDialog
        open={showAddMeasurement}
        onOpenChange={setShowAddMeasurement}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Excluir Medida Corporal"
        description="Deseja excluir este registro de medida corporal? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
