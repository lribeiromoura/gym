'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { convertWeightToKg, getWeightUnitLabel } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DecimalInput, IntegerInput } from '@/components/ui/NumericInputs';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

interface AddMeasurementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NUMERIC_FIELD_CLASS =
  'flex min-h-11 h-11 w-full rounded-xl border border-input bg-secondary/70 px-3.5 py-2 text-base text-foreground shadow-xs transition-colors placeholder:text-muted-foreground';

export function AddMeasurementDialog({
  open,
  onOpenChange,
}: AddMeasurementDialogProps) {
  const settings = useWorkoutStore((s) => s.settings);
  const addBodyMeasurement = useWorkoutStore((s) => s.addBodyMeasurement);

  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(weightUnit);

  const [mDate, setMDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [mWeight, setMWeight] = useState<number | null>(null);
  const [mBodyFat, setMBodyFat] = useState<number | null>(null);
  const [mKcal, setMKcal] = useState<number | null>(null);
  const [mChest, setMChest] = useState<number | null>(null);
  const [mBicep, setMBicep] = useState<number | null>(null);
  const [mWaist, setMWaist] = useState<number | null>(null);
  const [mThigh, setMThigh] = useState<number | null>(null);
  const [mCalf, setMCalf] = useState<number | null>(null);
  const [measurementError, setMeasurementError] = useState<string | null>(null);

  const resetForm = () => {
    setMDate(new Date().toISOString().slice(0, 10));
    setMWeight(null);
    setMBodyFat(null);
    setMKcal(null);
    setMChest(null);
    setMBicep(null);
    setMWaist(null);
    setMThigh(null);
    setMCalf(null);
    setMeasurementError(null);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    setMeasurementError(null);

    if (!mDate || Number.isNaN(new Date(`${mDate}T12:00:00`).getTime())) {
      setMeasurementError('Informe uma data válida.');
      return;
    }

    const validateOptionalPositive = (
      val: number | null,
      label: string,
      maxVal?: number
    ):
      | { ok: true; value: number | undefined }
      | { ok: false; error: string } => {
      if (val === null) return { ok: true, value: undefined };
      if (!Number.isFinite(val) || val <= 0) {
        return {
          ok: false,
          error: `${label} deve ser um valor maior que zero.`,
        };
      }
      if (maxVal !== undefined && val > maxVal) {
        return { ok: false, error: `${label} deve ser no máximo ${maxVal}.` };
      }
      return { ok: true, value: val };
    };

    const parsedWeight = validateOptionalPositive(
      mWeight,
      'Peso corporal',
      500
    );
    const parsedBf = validateOptionalPositive(mBodyFat, 'Gordura BF (%)', 100);
    const parsedKcal = validateOptionalPositive(mKcal, 'Calorias', 20000);
    const parsedChest = validateOptionalPositive(mChest, 'Peito', 300);
    const parsedBicep = validateOptionalPositive(mBicep, 'Bíceps', 150);
    const parsedWaist = validateOptionalPositive(mWaist, 'Cintura', 300);
    const parsedThigh = validateOptionalPositive(mThigh, 'Coxa', 200);
    const parsedCalf = validateOptionalPositive(mCalf, 'Panturrilha', 150);

    const allChecks = [
      parsedWeight,
      parsedBf,
      parsedKcal,
      parsedChest,
      parsedBicep,
      parsedWaist,
      parsedThigh,
      parsedCalf,
    ];
    const firstErr = allChecks.find((c) => !c.ok);
    if (firstErr && !firstErr.ok) {
      setMeasurementError(firstErr.error);
      return;
    }

    const hasAtLeastOne = allChecks.some(
      (c) => c.ok && c.value !== undefined
    );
    if (!hasAtLeastOne) {
      setMeasurementError(
        'Preencha pelo menos uma medida corporal antes de salvar.'
      );
      return;
    }

    const weightKgVal =
      parsedWeight.ok && parsedWeight.value !== undefined
        ? (convertWeightToKg(parsedWeight.value, weightUnit) ?? undefined)
        : undefined;

    addBodyMeasurement({
      date: mDate,
      weightKg: weightKgVal,
      bodyFatPct: parsedBf.ok ? parsedBf.value : undefined,
      caloricIntakeKcal: parsedKcal.ok ? parsedKcal.value : undefined,
      chestCm: parsedChest.ok ? parsedChest.value : undefined,
      leftBicepCm: parsedBicep.ok ? parsedBicep.value : undefined,
      rightBicepCm: parsedBicep.ok ? parsedBicep.value : undefined,
      waistCm: parsedWaist.ok ? parsedWaist.value : undefined,
      leftThighCm: parsedThigh.ok ? parsedThigh.value : undefined,
      rightThighCm: parsedThigh.ok ? parsedThigh.value : undefined,
      calfCm: parsedCalf.ok ? parsedCalf.value : undefined,
    });

    resetForm();
    onOpenChange(false);
    toast.success('Medida corporal registrada com sucesso!');
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <form
          onSubmit={handleSaveMeasurement}
          className="flex flex-1 flex-col min-h-0 overflow-hidden"
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle className="flex items-center gap-2">
              <Scale className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Registrar Medidas Corporais</span>
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Preencha ao menos uma medida para acompanhar sua evolução.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {measurementError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{measurementError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="measure-date">Data</Label>
                <Input
                  id="measure-date"
                  type="date"
                  required
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Peso Corporal ({unitLabel})</Label>
                <DecimalInput
                  value={mWeight}
                  onChange={setMWeight}
                  placeholder="Ex: 78,5"
                  ariaLabel={`Peso Corporal (${unitLabel})`}
                  className={NUMERIC_FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Gordura BF (%)</Label>
                <DecimalInput
                  value={mBodyFat}
                  onChange={setMBodyFat}
                  placeholder="Ex: 14,5"
                  ariaLabel="Gordura BF (%)"
                  className={NUMERIC_FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Peito (cm)</Label>
                <DecimalInput
                  value={mChest}
                  onChange={setMChest}
                  placeholder="Ex: 102"
                  ariaLabel="Peito (cm)"
                  className={NUMERIC_FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Bíceps (cm)</Label>
                <DecimalInput
                  value={mBicep}
                  onChange={setMBicep}
                  placeholder="Ex: 38,5"
                  ariaLabel="Bíceps (cm)"
                  className={NUMERIC_FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Cintura (cm)</Label>
                <DecimalInput
                  value={mWaist}
                  onChange={setMWaist}
                  placeholder="Ex: 82"
                  ariaLabel="Cintura (cm)"
                  className={NUMERIC_FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Coxa (cm)</Label>
                <DecimalInput
                  value={mThigh}
                  onChange={setMThigh}
                  placeholder="Ex: 58"
                  ariaLabel="Coxa (cm)"
                  className={NUMERIC_FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Panturrilha (cm)</Label>
                <DecimalInput
                  value={mCalf}
                  onChange={setMCalf}
                  placeholder="Ex: 39"
                  ariaLabel="Panturrilha (cm)"
                  className={NUMERIC_FIELD_CLASS}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Calorias (kcal)</Label>
                <IntegerInput
                  value={mKcal}
                  onChange={setMKcal}
                  placeholder="Ex: 2400"
                  ariaLabel="Calorias (kcal)"
                  className={NUMERIC_FIELD_CLASS}
                />
              </div>
            </div>
          </div>

          <ResponsiveDialogFooter className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" variant="default" className="w-full sm:w-auto">
              Salvar Medida
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
