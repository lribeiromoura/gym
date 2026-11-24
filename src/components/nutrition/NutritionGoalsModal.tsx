'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Check,
  Dumbbell,
  RefreshCw,
  Scale,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ACTIVITY_LEVEL_META,
  ActivityLevel,
  NUTRITION_GOAL_META,
  NutritionGoals,
  NutritionGoalType,
  NutritionProfile,
} from '@/types/nutrition';
import { useNutritionStore } from '@/store/useNutritionStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculateBMR,
  calculateRecommendedGoals,
  calculateTDEE,
} from '@/lib/nutrition-calculations';
import {
  convertWeightFromKg,
  convertWeightToKg,
  formatWeightWithUnit,
  getWeightUnitLabel,
} from '@/lib/calculations';
import { DecimalInput, IntegerInput } from '@/components/ui/NumericInputs';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NutritionGoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTIVITY_ORDER: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];

const GOAL_ORDER: NutritionGoalType[] = [
  'cut_aggressive',
  'cut',
  'maintain',
  'bulk_lean',
  'bulk',
];

const NUMERIC_INPUT_CLASS =
  'min-h-11 h-11 w-full rounded-xl border border-input bg-secondary/70 px-3 text-base font-bold text-foreground placeholder:text-muted-foreground';

export function NutritionGoalsModal({
  isOpen,
  onClose,
}: NutritionGoalsModalProps) {
  const storedProfile = useNutritionStore((s) => s.profile);
  const storedGoals = useNutritionStore((s) => s.goals);
  const updateProfileAndRecalculate = useNutritionStore(
    (s) => s.updateProfileAndRecalculate
  );
  const updateGoals = useNutritionStore((s) => s.updateGoals);

  const measurements = useWorkoutStore((s) => s.measurements);
  const settings = useWorkoutStore((s) => s.settings);
  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(weightUnit);

  const [draftProfile, setDraftProfile] =
    useState<NutritionProfile>(storedProfile);
  const [draftGoals, setDraftGoals] = useState<NutritionGoals>(storedGoals);

  useEffect(() => {
    if (isOpen) {
      setDraftProfile(storedProfile);
      setDraftGoals(storedGoals);
    }
  }, [isOpen, storedProfile, storedGoals]);

  const latestMeasurementWeight = useMemo(() => {
    if (!measurements || measurements.length === 0) return null;
    const sortedDesc = [...measurements].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
    const match = sortedDesc.find(
      (m) => typeof m.weightKg === 'number' && m.weightKg > 0
    );
    return match ? { weightKg: match.weightKg!, date: match.date } : null;
  }, [measurements]);

  const bmr = useMemo(() => calculateBMR(draftProfile), [draftProfile]);
  const tdee = useMemo(() => calculateTDEE(draftProfile), [draftProfile]);
  const recommended = useMemo(
    () =>
      calculateRecommendedGoals(draftProfile, {
        includeWorkoutCalories: draftGoals.includeWorkoutCalories,
      }),
    [draftProfile, draftGoals.includeWorkoutCalories]
  );

  const displayWeight =
    weightUnit === 'lbs'
      ? convertWeightFromKg(draftProfile.weightKg, 'lbs')
      : draftProfile.weightKg;

  const handleProfileChange = (updates: Partial<NutritionProfile>) => {
    const nextProfile = { ...draftProfile, ...updates };
    setDraftProfile(nextProfile);
    if (!draftGoals.customOverride) {
      setDraftGoals(
        calculateRecommendedGoals(nextProfile, {
          includeWorkoutCalories: draftGoals.includeWorkoutCalories,
        })
      );
    }
  };

  const handleApplyCalculated = () => {
    setDraftGoals(
      calculateRecommendedGoals(draftProfile, {
        includeWorkoutCalories: draftGoals.includeWorkoutCalories,
      })
    );
  };

  const handleManualGoalChange = (updates: Partial<NutritionGoals>) => {
    setDraftGoals((prev) => ({
      ...prev,
      ...updates,
      customOverride: true,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileAndRecalculate(draftProfile);
    updateGoals(draftGoals);
    toast.success('Metas nutricionais salvas com sucesso!');
    onClose();
  };

  const macroKcalSum =
    draftGoals.targetProteinG * 4 +
    draftGoals.targetCarbsG * 4 +
    draftGoals.targetFatG * 9;
  const weightKgSafe = Math.max(20, draftProfile.weightKg || 75);

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-2xl">
        <form
          onSubmit={handleSave}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <ResponsiveDialogHeader className="shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-blue-600 dark:text-blue-400">
                <Calculator className="size-5" />
              </div>
              <div className="min-w-0">
                <ResponsiveDialogTitle className="truncate">
                  Calculadora TMB / TDEE &amp; Metas
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Equação de Mifflin-St Jeor + edição manual livre
                </ResponsiveDialogDescription>
              </div>
            </div>
          </ResponsiveDialogHeader>

          {/* Corpo rolável */}
          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {/* Atalho sincronização com Medidas Corporais */}
            {latestMeasurementWeight && (
              <Card className="flex flex-col justify-between gap-2.5 border-primary/30 bg-primary/10 p-3.5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                  <Scale className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <span>
                    Peso mais recente em Medidas Corporais:{' '}
                    <strong className="text-foreground">
                      {formatWeightWithUnit(
                        latestMeasurementWeight.weightKg,
                        weightUnit,
                        true
                      )}
                    </strong>{' '}
                    (
                    {new Date(
                      `${latestMeasurementWeight.date}T12:00:00`
                    ).toLocaleDateString('pt-BR')}
                    )
                  </span>
                </div>
                <Button
                  onClick={() =>
                    handleProfileChange({
                      weightKg: latestMeasurementWeight.weightKg,
                    })
                  }
                  className="shrink-0 px-3.5 text-xs"
                >
                  Usar peso atual das Medidas Corporais
                </Button>
              </Card>
            )}

            {/* Bloco 1: Perfil Biométrico */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                1. Dados Biométricos &amp; Objetivo
              </h3>

              <Tabs
                value={draftProfile.sex}
                onValueChange={(value) =>
                  handleProfileChange({ sex: value as 'male' | 'female' })
                }
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="male">Masculino</TabsTrigger>
                  <TabsTrigger value="female">Feminino</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <Label className="normal-case tracking-normal">
                    Idade (anos)
                  </Label>
                  <IntegerInput
                    value={draftProfile.age}
                    onChange={(val) => {
                      if (val !== null && val > 0) {
                        handleProfileChange({ age: val });
                      }
                    }}
                    ariaLabel="Idade em anos"
                    className={NUMERIC_INPUT_CLASS}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="normal-case tracking-normal">
                    Altura (cm)
                  </Label>
                  <IntegerInput
                    value={draftProfile.heightCm}
                    onChange={(val) => {
                      if (val !== null && val > 0) {
                        handleProfileChange({ heightCm: val });
                      }
                    }}
                    ariaLabel="Altura em centímetros"
                    className={NUMERIC_INPUT_CLASS}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="normal-case tracking-normal">
                    Peso ({unitLabel})
                  </Label>
                  <DecimalInput
                    value={displayWeight}
                    onChange={(val) => {
                      if (val !== null && val > 0) {
                        const kg =
                          weightUnit === 'lbs'
                            ? (convertWeightToKg(val, 'lbs') ?? val)
                            : val;
                        handleProfileChange({ weightKg: kg });
                      }
                    }}
                    ariaLabel={`Peso corporal em ${unitLabel}`}
                    className={NUMERIC_INPUT_CLASS}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label
                    htmlFor="goals-activity-level"
                    className="normal-case tracking-normal"
                  >
                    Nível de Atividade Física
                  </Label>
                  <Select
                    value={draftProfile.activityLevel}
                    onValueChange={(val) =>
                      handleProfileChange({
                        activityLevel: val as ActivityLevel,
                      })
                    }
                  >
                    <SelectTrigger
                      id="goals-activity-level"
                      aria-label="Nível de Atividade Física"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_ORDER.map((lvl) => (
                        <SelectItem key={lvl} value={lvl}>
                          {ACTIVITY_LEVEL_META[lvl].label} (
                          {ACTIVITY_LEVEL_META[lvl].multiplier}x)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {ACTIVITY_LEVEL_META[draftProfile.activityLevel].description}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label
                    htmlFor="goals-goal-type"
                    className="normal-case tracking-normal"
                  >
                    Objetivo Nutricional
                  </Label>
                  <Select
                    value={draftProfile.goalType}
                    onValueChange={(val) =>
                      handleProfileChange({
                        goalType: val as NutritionGoalType,
                      })
                    }
                  >
                    <SelectTrigger
                      id="goals-goal-type"
                      aria-label="Objetivo Nutricional"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_ORDER.map((g) => (
                        <SelectItem key={g} value={g}>
                          {NUTRITION_GOAL_META[g].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {NUTRITION_GOAL_META[draftProfile.goalType].description}
                  </p>
                </div>
              </div>

              {/* Resumo TMB / TDEE calculados */}
              <Card className="grid grid-cols-3 gap-2.5 bg-secondary/60 p-3.5">
                <div className="text-center">
                  <span className="block text-[11px] font-semibold text-muted-foreground">
                    TMB Basal
                  </span>
                  <span className="text-base font-extrabold tabular-nums text-foreground">
                    {bmr.toLocaleString('pt-BR')}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    kcal/dia
                  </span>
                </div>
                <div className="border-x border-border text-center">
                  <span className="block text-[11px] font-semibold text-muted-foreground">
                    TDEE Total
                  </span>
                  <span className="text-base font-extrabold tabular-nums text-blue-600 dark:text-blue-400">
                    {tdee.toLocaleString('pt-BR')}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    kcal/dia
                  </span>
                </div>
                <div className="text-center">
                  <span className="block text-[11px] font-semibold text-muted-foreground">
                    Meta Sugerida
                  </span>
                  <span className="text-base font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {recommended.targetCalories.toLocaleString('pt-BR')}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    kcal/dia
                  </span>
                </div>
              </Card>
            </div>

            {/* Bloco 2: Metas Diárias (Editáveis Livremente) */}
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    <Sliders className="size-3.5 text-blue-600 dark:text-blue-400" />
                    2. Metas Diárias
                  </h3>
                  <Badge
                    variant={draftGoals.customOverride ? 'warning' : 'info'}
                    className="text-[10px]"
                  >
                    {draftGoals.customOverride
                      ? 'Personalizadas'
                      : 'Automáticas'}
                  </Badge>
                </div>

                <Button
                  variant="outline"
                  onClick={handleApplyCalculated}
                  className="border-primary/30 bg-primary/10 px-3 text-xs text-blue-700 hover:bg-primary/20 dark:text-blue-400"
                >
                  <RefreshCw className="size-3.5" /> Recalcular pelo TDEE
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="normal-case tracking-normal">
                    Calorias (kcal)
                  </Label>
                  <IntegerInput
                    value={draftGoals.targetCalories}
                    onChange={(val) => {
                      if (val !== null) {
                        handleManualGoalChange({ targetCalories: val });
                      }
                    }}
                    ariaLabel="Meta diária de calorias"
                    className={`${NUMERIC_INPUT_CLASS} font-extrabold`}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="normal-case tracking-normal text-emerald-700 dark:text-emerald-400">
                    Proteína (g){' '}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (
                      {(draftGoals.targetProteinG / weightKgSafe)
                        .toFixed(1)
                        .replace('.', ',')}{' '}
                      g/kg)
                    </span>
                  </Label>
                  <IntegerInput
                    value={draftGoals.targetProteinG}
                    onChange={(val) => {
                      if (val !== null) {
                        handleManualGoalChange({ targetProteinG: val });
                      }
                    }}
                    ariaLabel="Meta diária de proteína em gramas"
                    className={NUMERIC_INPUT_CLASS}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="normal-case tracking-normal text-amber-700 dark:text-amber-400">
                    Carboidratos (g){' '}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (
                      {(draftGoals.targetCarbsG / weightKgSafe)
                        .toFixed(1)
                        .replace('.', ',')}{' '}
                      g/kg)
                    </span>
                  </Label>
                  <IntegerInput
                    value={draftGoals.targetCarbsG}
                    onChange={(val) => {
                      if (val !== null) {
                        handleManualGoalChange({ targetCarbsG: val });
                      }
                    }}
                    ariaLabel="Meta diária de carboidratos em gramas"
                    className={NUMERIC_INPUT_CLASS}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="normal-case tracking-normal text-purple-700 dark:text-purple-400">
                    Gorduras (g){' '}
                    <span className="text-[10px] font-normal text-muted-foreground">
                      (
                      {(draftGoals.targetFatG / weightKgSafe)
                        .toFixed(1)
                        .replace('.', ',')}{' '}
                      g/kg)
                    </span>
                  </Label>
                  <IntegerInput
                    value={draftGoals.targetFatG}
                    onChange={(val) => {
                      if (val !== null) {
                        handleManualGoalChange({ targetFatG: val });
                      }
                    }}
                    ariaLabel="Meta diária de gorduras em gramas"
                    className={NUMERIC_INPUT_CLASS}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="normal-case tracking-normal">
                    Fibras (g)
                  </Label>
                  <IntegerInput
                    value={draftGoals.targetFiberG}
                    onChange={(val) => {
                      if (val !== null) {
                        handleManualGoalChange({ targetFiberG: val });
                      }
                    }}
                    ariaLabel="Meta diária de fibras em gramas"
                    className={NUMERIC_INPUT_CLASS}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="normal-case tracking-normal text-sky-700 dark:text-sky-400">
                    Água (ml)
                  </Label>
                  <IntegerInput
                    value={draftGoals.targetWaterMl}
                    onChange={(val) => {
                      if (val !== null) {
                        handleManualGoalChange({ targetWaterMl: val });
                      }
                    }}
                    ariaLabel="Meta diária de água em mililitros"
                    className={NUMERIC_INPUT_CLASS}
                  />
                </div>
              </div>

              <p className="text-[11px] tabular-nums text-muted-foreground">
                Soma energética dos macros definidos:{' '}
                <strong className="text-foreground">
                  {macroKcalSum.toLocaleString('pt-BR')} kcal
                </strong>{' '}
                (P:{' '}
                {macroKcalSum > 0
                  ? Math.round((draftGoals.targetProteinG * 4 * 100) / macroKcalSum)
                  : 0}
                % • C:{' '}
                {macroKcalSum > 0
                  ? Math.round((draftGoals.targetCarbsG * 4 * 100) / macroKcalSum)
                  : 0}
                % • G:{' '}
                {macroKcalSum > 0
                  ? Math.round((draftGoals.targetFatG * 9 * 100) / macroKcalSum)
                  : 0}
                %)
              </p>

              {/* Toggle calorias do treino */}
              <Card className="flex items-start justify-between gap-3 bg-secondary/60 p-3.5">
                <div className="flex items-start gap-2.5">
                  <Dumbbell className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <Label
                    htmlFor="include-workout-calories-switch"
                    className="block cursor-pointer normal-case tracking-normal"
                  >
                    <span className="block text-xs font-bold text-foreground">
                      Somar calorias estimadas dos treinos ao saldo diário
                    </span>
                    <span className="mt-0.5 block text-[11px] font-normal leading-relaxed text-muted-foreground">
                      Desligado por padrão para evitar dupla contagem, já que o
                      fator de atividade do TDEE já inclui seus treinos.
                    </span>
                  </Label>
                </div>
                <Switch
                  id="include-workout-calories-switch"
                  checked={draftGoals.includeWorkoutCalories}
                  onCheckedChange={(checked) =>
                    setDraftGoals((prev) => ({
                      ...prev,
                      includeWorkoutCalories: checked,
                    }))
                  }
                />
              </Card>
            </div>
          </div>

          {/* Rodapé */}
          <ResponsiveDialogFooter className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid sm:grid-cols-2">
            <Button variant="secondary" size="lg" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" size="lg">
              <Check className="size-4" /> Salvar Metas
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
