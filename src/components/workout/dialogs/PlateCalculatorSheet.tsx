'use client';

import React from 'react';
import { Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { calculatePlatesPerSide } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DecimalInput, formatPtBrNumber } from '@/components/ui/NumericInputs';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface PlateCalcState {
  workoutExerciseId: string;
  setId?: string;
  exerciseTitle: string;
  totalWeightKg: number;
  barWeightKg: number;
}

export interface PlateCalculatorSheetProps {
  data: PlateCalcState | null;
  onChange: (next: PlateCalcState) => void;
  onChangeBarWeight: (barWeightKg: number) => void;
  onApplyWeight: (
    workoutExerciseId: string,
    setId: string,
    weightKg: number
  ) => void;
  onClose: () => void;
}

const BAR_WEIGHT_OPTIONS = [
  { value: '20', label: 'Barra Olímpica (20 kg)' },
  { value: '15', label: 'Barra Feminina (15 kg)' },
  { value: '10', label: 'Barra Curta / W (10 kg)' },
  { value: '0', label: 'Máquina / Sem Barra (0 kg)' },
] as const;

export function PlateCalculatorSheet({
  data,
  onChange,
  onChangeBarWeight,
  onApplyWeight,
  onClose,
}: PlateCalculatorSheetProps) {
  const breakdown = data
    ? calculatePlatesPerSide(data.totalWeightKg, data.barWeightKg)
    : null;

  return (
    <ResponsiveDialog
      open={Boolean(data)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        {data && breakdown && (
          <>
            <ResponsiveDialogHeader>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Calculadora de Anilhas
              </span>
              <ResponsiveDialogTitle>{data.exerciseTitle}</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Calcule a combinação ideal de anilhas por lado da barra
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Carga Total (kg)</Label>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Diminuir 2,5 kg"
                      onClick={() =>
                        onChange({
                          ...data,
                          totalWeightKg: Math.max(
                            data.barWeightKg,
                            data.totalWeightKg - 2.5
                          ),
                        })
                      }
                      className="shrink-0 text-xs font-bold"
                    >
                      -2,5
                    </Button>
                    <DecimalInput
                      value={data.totalWeightKg}
                      ariaLabel="Carga total na barra (kg)"
                      onChange={(val) =>
                        onChange({
                          ...data,
                          totalWeightKg: val ?? 0,
                        })
                      }
                      className="w-full h-11 text-center rounded-xl bg-secondary/70 border border-input font-extrabold text-foreground"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label="Aumentar 2,5 kg"
                      onClick={() =>
                        onChange({
                          ...data,
                          totalWeightKg: data.totalWeightKg + 2.5,
                        })
                      }
                      className="shrink-0 text-xs font-bold"
                    >
                      +2,5
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Peso da Barra</Label>
                  <Select
                    value={String(data.barWeightKg)}
                    onValueChange={(val) => {
                      const nextBar = Number(val);
                      onChange({
                        ...data,
                        barWeightKg: nextBar,
                      });
                      onChangeBarWeight(nextBar);
                    }}
                  >
                    <SelectTrigger aria-label="Peso da barra">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BAR_WEIGHT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cartão visual de anilhas por lado */}
              <div className="bg-secondary/50 border border-border rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Montar em <strong className="text-foreground">CADA LADO</strong> da barra:
                  </span>
                  <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400 tabular-nums shrink-0">
                    {formatPtBrNumber(breakdown.achievedPerSideKg)} kg / lado
                  </span>
                </div>

                {breakdown.platesPerSide.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    Apenas a barra ({data.barWeightKg} kg) — sem anilhas
                    adicionais.
                  </p>
                ) : (
                  <>
                    {/* Representação visual da manga da barra */}
                    <div
                      className="flex items-center gap-1 py-2 px-3 rounded-xl bg-card border border-border overflow-x-auto"
                      aria-hidden="true"
                    >
                      <div className="h-3 w-8 rounded-l-full bg-muted-foreground/40 shrink-0" />
                      <div className="h-6 w-2 rounded-xs bg-muted-foreground/60 shrink-0" />
                      {breakdown.platesPerSide.flatMap((plate) =>
                        Array.from({ length: plate.count }).map((_, i) => {
                          const heightPx = Math.max(
                            22,
                            Math.min(54, Math.round(20 + plate.weight * 1.4))
                          );
                          return (
                            <div
                              key={`${plate.weight}-${i}`}
                              style={{
                                backgroundColor: plate.color,
                                height: `${heightPx}px`,
                              }}
                              className="w-4 rounded-sm border border-black/20 shrink-0 flex items-center justify-center"
                              title={`${formatPtBrNumber(plate.weight)} kg`}
                            />
                          );
                        })
                      )}
                      <div className="h-3 flex-1 min-w-6 rounded-r-full bg-muted-foreground/40" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {breakdown.platesPerSide.map((p) => (
                        <div
                          key={p.weight}
                          className="px-3 py-2 rounded-xl bg-card border border-border flex items-center gap-2 shadow-2xs"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20"
                            style={{ backgroundColor: p.color }}
                          />
                          <span className="text-sm font-extrabold text-foreground tabular-nums">
                            {p.count}× {formatPtBrNumber(p.weight)} kg
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Total montado:{' '}
                      <strong className="text-foreground">
                        {formatPtBrNumber(breakdown.achievedTotalKg)} kg
                      </strong>{' '}
                      (Barra {data.barWeightKg} kg +{' '}
                      {formatPtBrNumber(breakdown.achievedPerSideKg)} kg × 2)
                    </p>
                  </>
                )}
              </div>
            </div>

            {data.setId && (
              <ResponsiveDialogFooter>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (data.setId) {
                      onApplyWeight(
                        data.workoutExerciseId,
                        data.setId,
                        breakdown.achievedTotalKg
                      );
                      toast.success(
                        `Carga atualizada para ${formatPtBrNumber(
                          breakdown.achievedTotalKg
                        )} kg`
                      );
                    }
                    onClose();
                  }}
                >
                  Usar {formatPtBrNumber(breakdown.achievedTotalKg)} kg na série
                  atual
                </Button>
              </ResponsiveDialogFooter>
            )}
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
