'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  Check,
  Dumbbell,
  RefreshCw,
  Scale,
  Sliders,
  X,
} from 'lucide-react';
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

  if (!isOpen) return null;

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
    onClose();
  };

  const macroKcalSum =
    draftGoals.targetProteinG * 4 +
    draftGoals.targetCarbsG * 4 +
    draftGoals.targetFatG * 9;
  const weightKgSafe = Math.max(20, draftProfile.weightKg || 75);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-2 sm:p-4"
    >
      <form
        onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nutrition-goals-modal-title"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#3B82F6] flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="nutrition-goals-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
              >
                Calculadora TMB / TDEE & Metas
              </h2>
              <p className="text-xs text-slate-500">
                Equação de Mifflin-St Jeor + edição manual livre
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar metas nutricionais"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo rolável */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Atalho sincronização com Medidas Corporais */}
          {latestMeasurementWeight && (
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <Scale className="w-4 h-4 text-[#3B82F6] shrink-0" />
                <span>
                  Peso mais recente em Medidas Corporais:{' '}
                  <strong className="text-slate-900">
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
              <button
                type="button"
                onClick={() =>
                  handleProfileChange({
                    weightKg: latestMeasurementWeight.weightKg,
                  })
                }
                className="min-h-[40px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold shrink-0 transition"
              >
                Usar peso atual das Medidas Corporais
              </button>
            </div>
          )}

          {/* Bloco 1: Perfil Biométrico */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              1. Dados Biométricos & Objetivo
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['male', 'Masculino'],
                  ['female', 'Feminino'],
                ] as const
              ).map(([sexKey, label]) => (
                <button
                  key={sexKey}
                  type="button"
                  onClick={() => handleProfileChange({ sex: sexKey })}
                  className={`h-11 rounded-xl text-xs font-bold border transition ${
                    draftProfile.sex === sexKey
                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Idade (anos)
                </label>
                <IntegerInput
                  value={draftProfile.age}
                  onChange={(val) => {
                    if (val !== null && val > 0) {
                      handleProfileChange({ age: val });
                    }
                  }}
                  ariaLabel="Idade em anos"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Altura (cm)
                </label>
                <IntegerInput
                  value={draftProfile.heightCm}
                  onChange={(val) => {
                    if (val !== null && val > 0) {
                      handleProfileChange({ heightCm: val });
                    }
                  }}
                  ariaLabel="Altura em centímetros"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Peso ({unitLabel})
                </label>
                <DecimalInput
                  value={displayWeight}
                  onChange={(val) => {
                    if (val !== null && val > 0) {
                      const kg =
                        weightUnit === 'lbs'
                          ? convertWeightToKg(val, 'lbs') ?? val
                          : val;
                      handleProfileChange({ weightKg: kg });
                    }
                  }}
                  ariaLabel={`Peso corporal em ${unitLabel}`}
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-[#3B82F6]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nível de Atividade Física
                </label>
                <select
                  value={draftProfile.activityLevel}
                  onChange={(e) =>
                    handleProfileChange({
                      activityLevel: e.target.value as ActivityLevel,
                    })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-[#3B82F6]"
                >
                  {ACTIVITY_ORDER.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {ACTIVITY_LEVEL_META[lvl].label} (
                      {ACTIVITY_LEVEL_META[lvl].multiplier}x)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {ACTIVITY_LEVEL_META[draftProfile.activityLevel].description}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Objetivo Nutricional
                </label>
                <select
                  value={draftProfile.goalType}
                  onChange={(e) =>
                    handleProfileChange({
                      goalType: e.target.value as NutritionGoalType,
                    })
                  }
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-[#3B82F6]"
                >
                  {GOAL_ORDER.map((g) => (
                    <option key={g} value={g}>
                      {NUTRITION_GOAL_META[g].label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  {NUTRITION_GOAL_META[draftProfile.goalType].description}
                </p>
              </div>
            </div>

            {/* Resumo TMB / TDEE calculados */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-center">
                <span className="block text-[11px] font-semibold text-slate-500">
                  TMB Basal
                </span>
                <span className="text-base font-extrabold text-slate-900 tabular-nums">
                  {bmr.toLocaleString('pt-BR')}
                </span>
                <span className="block text-[10px] text-slate-500">kcal/dia</span>
              </div>
              <div className="text-center border-x border-slate-200">
                <span className="block text-[11px] font-semibold text-slate-500">
                  TDEE Total
                </span>
                <span className="text-base font-extrabold text-[#3B82F6] tabular-nums">
                  {tdee.toLocaleString('pt-BR')}
                </span>
                <span className="block text-[10px] text-slate-500">kcal/dia</span>
              </div>
              <div className="text-center">
                <span className="block text-[11px] font-semibold text-slate-500">
                  Meta Sugerida
                </span>
                <span className="text-base font-extrabold text-emerald-600 tabular-nums">
                  {recommended.targetCalories.toLocaleString('pt-BR')}
                </span>
                <span className="block text-[10px] text-slate-500">kcal/dia</span>
              </div>
            </div>
          </div>

          {/* Bloco 2: Metas Diárias (Editáveis Livremente) */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#3B82F6]" />
                2. Metas Diárias {draftGoals.customOverride ? '(Personalizadas)' : '(Automáticas)'}
              </h3>

              <button
                type="button"
                onClick={handleApplyCalculated}
                className="min-h-[36px] px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#3B82F6] text-xs font-bold flex items-center gap-1.5 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Recalcular pelo TDEE
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Calorias (kcal)
                </label>
                <IntegerInput
                  value={draftGoals.targetCalories}
                  onChange={(val) => {
                    if (val !== null) {
                      handleManualGoalChange({ targetCalories: val });
                    }
                  }}
                  ariaLabel="Meta diária de calorias"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-extrabold focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-700 mb-1">
                  Proteína (g){' '}
                  <span className="text-[10px] font-normal text-slate-500">
                    ({(draftGoals.targetProteinG / weightKgSafe).toFixed(1).replace('.', ',')} g/kg)
                  </span>
                </label>
                <IntegerInput
                  value={draftGoals.targetProteinG}
                  onChange={(val) => {
                    if (val !== null) {
                      handleManualGoalChange({ targetProteinG: val });
                    }
                  }}
                  ariaLabel="Meta diária de proteína em gramas"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 mb-1">
                  Carboidratos (g){' '}
                  <span className="text-[10px] font-normal text-slate-500">
                    ({(draftGoals.targetCarbsG / weightKgSafe).toFixed(1).replace('.', ',')} g/kg)
                  </span>
                </label>
                <IntegerInput
                  value={draftGoals.targetCarbsG}
                  onChange={(val) => {
                    if (val !== null) {
                      handleManualGoalChange({ targetCarbsG: val });
                    }
                  }}
                  ariaLabel="Meta diária de carboidratos em gramas"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-700 mb-1">
                  Gorduras (g){' '}
                  <span className="text-[10px] font-normal text-slate-500">
                    ({(draftGoals.targetFatG / weightKgSafe).toFixed(1).replace('.', ',')} g/kg)
                  </span>
                </label>
                <IntegerInput
                  value={draftGoals.targetFatG}
                  onChange={(val) => {
                    if (val !== null) {
                      handleManualGoalChange({ targetFatG: val });
                    }
                  }}
                  ariaLabel="Meta diária de gorduras em gramas"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Fibras (g)
                </label>
                <IntegerInput
                  value={draftGoals.targetFiberG}
                  onChange={(val) => {
                    if (val !== null) {
                      handleManualGoalChange({ targetFiberG: val });
                    }
                  }}
                  ariaLabel="Meta diária de fibras em gramas"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-sky-700 mb-1">
                  Água (ml)
                </label>
                <IntegerInput
                  value={draftGoals.targetWaterMl}
                  onChange={(val) => {
                    if (val !== null) {
                      handleManualGoalChange({ targetWaterMl: val });
                    }
                  }}
                  ariaLabel="Meta diária de água em mililitros"
                  className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 tabular-nums">
              Soma energética dos macros definidos:{' '}
              <strong className="text-slate-800">
                {macroKcalSum.toLocaleString('pt-BR')} kcal
              </strong>{' '}
              (P: {macroKcalSum > 0 ? Math.round((draftGoals.targetProteinG * 4 * 100) / macroKcalSum) : 0}% • C:{' '}
              {macroKcalSum > 0 ? Math.round((draftGoals.targetCarbsG * 4 * 100) / macroKcalSum) : 0}% • G:{' '}
              {macroKcalSum > 0 ? Math.round((draftGoals.targetFatG * 9 * 100) / macroKcalSum) : 0}%)
            </p>

            {/* Toggle calorias do treino */}
            <label className="flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
              <div className="flex items-start gap-2.5">
                <Dumbbell className="w-4 h-4 text-[#3B82F6] mt-0.5 shrink-0" />
                <div>
                  <span className="block text-xs font-bold text-slate-900">
                    Somar calorias estimadas dos treinos ao saldo diário
                  </span>
                  <span className="block text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Desligado por padrão para evitar dupla contagem, já que o
                    fator de atividade do TDEE já inclui seus treinos.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={draftGoals.includeWorkoutCalories}
                onChange={(e) =>
                  setDraftGoals((prev) => ({
                    ...prev,
                    includeWorkoutCalories: e.target.checked,
                  }))
                }
                className="w-5 h-5 mt-0.5 accent-[#2563EB] shrink-0"
              />
            </label>
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-2.5 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="h-12 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Check className="w-4 h-4" /> Salvar Metas
          </button>
        </div>
      </form>
    </div>
  );
}
