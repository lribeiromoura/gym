'use client';

import React, { useMemo, useState } from 'react';
import {
  Apple,
  BarChart3,
  Bookmark,
  Calculator,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Copy,
  Droplets,
  Flame,
  Minus,
  Moon,
  Plus,
  ScanBarcode,
  Sparkles,
  Sun,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import {
  FoodItem,
  FoodLogEntry,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
  MealSlot,
  NUTRITION_GOAL_META,
} from '@/types/nutrition';
import { FOODS_SEED_BR } from '@/data/foods-seed-br';
import { useNutritionStore } from '@/store/useNutritionStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculateDailyNutritionSummary,
  calculateWeeklyNutritionStats,
  estimateWorkoutCaloriesBurned,
  formatDateLabelPtBr,
  getLocalDateString,
  getWorkoutSessionsOnDate,
  shiftLocalDateString,
} from '@/lib/nutrition-calculations';
import { DecimalInput } from '@/components/ui/NumericInputs';
import { FoodSearchModal } from './FoodSearchModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { NutritionGoalsModal } from './NutritionGoalsModal';
import { SavedMealsModal } from './SavedMealsModal';
import { NutritionAIReportModal } from './NutritionAIReportModal';

const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

const MEAL_SLOT_ICONS: Record<
  MealSlot,
  React.ComponentType<{ className?: string }>
> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snacks: Apple,
};

export function NutritionView() {
  const foodLogs = useNutritionStore((s) => s.foodLogs);
  const waterByDate = useNutritionStore((s) => s.waterByDate);
  const customFoods = useNutritionStore((s) => s.customFoods);
  const cachedOnlineFoods = useNutritionStore((s) => s.cachedOnlineFoods);
  const savedMeals = useNutritionStore((s) => s.savedMeals);
  const profile = useNutritionStore((s) => s.profile);
  const goals = useNutritionStore((s) => s.goals);

  const adjustWater = useNutritionStore((s) => s.adjustWater);
  const updateFoodLogQuantity = useNutritionStore(
    (s) => s.updateFoodLogQuantity
  );
  const deleteFoodLog = useNutritionStore((s) => s.deleteFoodLog);
  const copyMealFromDate = useNutritionStore((s) => s.copyMealFromDate);
  const saveMealFromSlot = useNutritionStore((s) => s.saveMealFromSlot);

  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const measurements = useWorkoutStore((s) => s.measurements);

  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const yesterdayStr = shiftLocalDateString(selectedDate, -1);

  // Modais
  const [searchModalSlot, setSearchModalSlot] = useState<MealSlot | null>(null);
  const [searchInitialFood, setSearchInitialFood] = useState<FoodItem | null>(
    null
  );
  const [searchInitialCreateBarcode, setSearchInitialCreateBarcode] = useState<
    string | null
  >(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTargetSlot, setScannerTargetSlot] = useState<MealSlot>('snacks');
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showSavedMealsModal, setShowSavedMealsModal] = useState(false);
  const [showAIReportModal, setShowAIReportModal] = useState(false);

  // Edição inline de item lançado
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number | null>(null);
  const [editingMode, setEditingMode] = useState<'grams' | 'unit'>('grams');

  // Mini-form inline "Salvar Combo"
  const [savingComboSlot, setSavingComboSlot] = useState<MealSlot | null>(null);
  const [comboNameInput, setComboNameInput] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  const foodCatalogMap = useMemo(() => {
    const map = new Map<string, FoodItem>();
    for (const f of FOODS_SEED_BR) map.set(f.id, f);
    for (const f of cachedOnlineFoods) map.set(f.id, f);
    for (const f of customFoods) map.set(f.id, f);
    return map;
  }, [customFoods, cachedOnlineFoods]);

  const refWeightKg = useMemo(() => {
    if (measurements.length > 0) {
      const sorted = [...measurements].sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      const latest = sorted.find(
        (m) => typeof m.weightKg === 'number' && m.weightKg > 0
      );
      if (latest?.weightKg) return latest.weightKg;
    }
    return profile.weightKg || 75;
  }, [measurements, profile.weightKg]);

  const dayWorkoutBonusKcal = useMemo(() => {
    const sessions = getWorkoutSessionsOnDate(workoutHistory, selectedDate);
    return estimateWorkoutCaloriesBurned(sessions, refWeightKg);
  }, [workoutHistory, selectedDate, refWeightKg]);

  const summary = useMemo(
    () =>
      calculateDailyNutritionSummary(
        selectedDate,
        foodLogs,
        waterByDate[selectedDate] || 0,
        goals,
        dayWorkoutBonusKcal
      ),
    [selectedDate, foodLogs, waterByDate, goals, dayWorkoutBonusKcal]
  );

  const weeklyStats = useMemo(
    () =>
      calculateWeeklyNutritionStats(selectedDate, foodLogs, waterByDate, goals),
    [selectedDate, foodLogs, waterByDate, goals]
  );

  const yesterdaySlotCounts = useMemo(() => {
    const counts: Record<MealSlot, number> = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snacks: 0,
    };
    for (const log of foodLogs) {
      if (log.date === yesterdayStr) {
        counts[log.mealSlot] = (counts[log.mealSlot] || 0) + 1;
      }
    }
    return counts;
  }, [foodLogs, yesterdayStr]);

  const goalMeta =
    NUTRITION_GOAL_META[profile.goalType] ?? NUTRITION_GOAL_META.maintain;

  // Parâmetros do anel SVG de calorias
  const ringRadius = 62;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const clampedCalPct = Math.min(100, Math.max(0, summary.adherencePct.calories));
  const ringOffset =
    ringCircumference - (clampedCalPct / 100) * ringCircumference;
  const isOverCalories = summary.remainingCalories < 0;
  const ringStrokeColor = isOverCalories
    ? '#EF4444'
    : summary.adherencePct.calories >= 85 &&
        summary.adherencePct.calories <= 105
      ? '#10B981'
      : '#3B82F6';

  const openSearchForSlot = (slot: MealSlot) => {
    setSearchInitialFood(null);
    setSearchInitialCreateBarcode(null);
    setSearchModalSlot(slot);
  };

  const openScannerForSlot = (slot: MealSlot) => {
    setScannerTargetSlot(slot);
    setShowScanner(true);
  };

  const handleStartEditEntry = (entry: FoodLogEntry) => {
    setEditingEntryId(entry.id);
    setEditingQty(entry.quantity);
    setEditingMode(entry.measureMode);
  };

  const handleSaveEditEntry = (entryId: string) => {
    if (editingQty && editingQty > 0) {
      updateFoodLogQuantity(entryId, editingQty, editingMode);
    }
    setEditingEntryId(null);
    setEditingQty(null);
  };

  const handleCopyYesterday = (slot: MealSlot) => {
    const count = copyMealFromDate(yesterdayStr, selectedDate, slot);
    if (count > 0) {
      showToast(
        `${count} ${count === 1 ? 'item copiado' : 'itens copiados'} de ontem para ${MEAL_SLOT_LABELS[slot]}!`
      );
    }
  };

  const handleSaveCombo = (e: React.FormEvent, slot: MealSlot) => {
    e.preventDefault();
    const saved = saveMealFromSlot(comboNameInput, selectedDate, slot);
    if (saved) {
      showToast(`Combo "${saved.name}" salvo com ${saved.items.length} itens!`);
      setSavingComboSlot(null);
      setComboNameInput('');
    }
  };

  // Cálculo do gráfico de 7 dias
  const maxWeeklyKcal = Math.max(
    goals.targetCalories * 1.15,
    ...weeklyStats.days.map((d) => d.calories),
    1500
  );
  const goalLineBottomPct = Math.min(
    95,
    Math.max(8, Math.round((goals.targetCalories / maxWeeklyKcal) * 100))
  );

  return (
    <div className="space-y-5 pb-28">
      {/* ==================== CABEÇALHO + ATALHOS ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Utensils className="w-6 h-6 text-[#3B82F6]" />
            Nutrição
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {goalMeta.shortLabel} • Meta:{' '}
            <strong className="text-slate-800">
              {goals.targetCalories.toLocaleString('pt-BR')} kcal
            </strong>{' '}
            ({goals.targetProteinG}P / {goals.targetCarbsG}C /{' '}
            {goals.targetFatG}G)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openScannerForSlot('snacks')}
            className="min-h-[44px] px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#3B82F6] text-xs font-bold flex items-center gap-1.5 transition"
          >
            <ScanBarcode className="w-4 h-4" />
            <span>Código de Barras</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSavedMealsModal(true)}
            className="min-h-[44px] px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Bookmark className="w-4 h-4 text-[#3B82F6]" />
            <span>Combos{savedMeals.length > 0 ? ` (${savedMeals.length})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGoalsModal(true)}
            className="min-h-[44px] px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Calculator className="w-4 h-4 text-[#3B82F6]" />
            <span>Metas & TMB</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAIReportModal(true)}
            className="min-h-[44px] px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Relatório IA</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {toastMessage && (
        <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ==================== NAVEGAÇÃO POR DATA ==================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex items-center justify-between gap-2 shadow-xs">
        <button
          type="button"
          aria-label="Dia anterior"
          onClick={() =>
            setSelectedDate((d) => shiftLocalDateString(d, -1))
          }
          className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-center gap-2 flex-1 min-w-0">
          <label className="relative flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 cursor-pointer transition min-h-[44px]">
            <Calendar className="w-4 h-4 text-[#3B82F6] shrink-0" />
            <span className="text-sm font-extrabold text-slate-900 capitalize truncate">
              {formatDateLabelPtBr(selectedDate, todayStr)}
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline tabular-nums">
              (
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')}
              )
            </span>
            <input
              type="date"
              aria-label="Selecionar data do diário alimentar"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>

          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="min-h-[36px] px-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[#3B82F6] text-xs font-bold shrink-0"
            >
              Hoje
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Próximo dia"
          onClick={() =>
            setSelectedDate((d) => shiftLocalDateString(d, 1))
          }
          className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ==================== RESUMO CALORIAS & MACROS + ÁGUA ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card Calorias & Macros */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Anel SVG de Calorias */}
            <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
              <svg
                viewBox="0 0 160 160"
                className="w-full h-full -rotate-90"
                role="img"
                aria-label={`Calorias consumidas: ${summary.calories} de ${summary.effectiveTargetCalories} kcal`}
              >
                <circle
                  cx="80"
                  cy="80"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="12"
                  className="stroke-slate-100"
                />
                <circle
                  cx="80"
                  cy="80"
                  r={ringRadius}
                  fill="none"
                  stroke={ringStrokeColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                <span
                  className={`text-2xl font-black tabular-nums leading-tight ${
                    isOverCalories ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {Math.abs(summary.remainingCalories).toLocaleString('pt-BR')}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {isOverCalories ? 'Excedidas' : 'Restantes'}
                </span>
                <span className="text-[10px] text-slate-500 font-semibold tabular-nums mt-0.5">
                  {summary.adherencePct.calories}% da meta
                </span>
              </div>
            </div>

            {/* Equação Calórica + Barras de Macros */}
            <div className="flex-1 w-full space-y-4">
              {/* Fórmula estilo MyFitnessPal */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div>
                  <span className="block text-[11px] text-slate-500 font-semibold">
                    Meta Base
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 tabular-nums">
                    {goals.targetCalories.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="block text-[11px] text-slate-500 font-semibold">
                    Consumido
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-[#3B82F6] tabular-nums">
                    {summary.calories.toLocaleString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500 font-semibold flex items-center justify-center gap-0.5">
                    <Flame className="w-3 h-3 text-amber-500" />
                    Treino
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-emerald-600 tabular-nums">
                    {goals.includeWorkoutCalories
                      ? `+${summary.workoutBonusKcal}`
                      : 'Off'}
                  </span>
                </div>
              </div>

              {/* Barras de Proteína, Carboidratos e Gorduras */}
              <div className="space-y-3">
                {[
                  {
                    label: 'Proteína',
                    value: summary.proteinG,
                    target: goals.targetProteinG,
                    pct: summary.adherencePct.protein,
                    barClass: 'bg-emerald-500',
                    labelClass: 'text-emerald-700',
                  },
                  {
                    label: 'Carboidratos',
                    value: summary.carbsG,
                    target: goals.targetCarbsG,
                    pct: summary.adherencePct.carbs,
                    barClass: 'bg-amber-500',
                    labelClass: 'text-amber-700',
                  },
                  {
                    label: 'Gorduras',
                    value: summary.fatG,
                    target: goals.targetFatG,
                    pct: summary.adherencePct.fat,
                    barClass: 'bg-purple-500',
                    labelClass: 'text-purple-700',
                  },
                ].map((macro) => (
                  <div key={macro.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-bold ${macro.labelClass}`}>
                        {macro.label}
                      </span>
                      <span className="text-slate-600 font-semibold tabular-nums">
                        <strong className="text-slate-900">
                          {fmt1(macro.value)}g
                        </strong>{' '}
                        / {macro.target}g ({macro.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${macro.barClass}`}
                        style={{ width: `${Math.min(100, macro.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  Fibras:{' '}
                  <strong className="text-slate-800">
                    {fmt1(summary.fiberG)}g
                  </strong>{' '}
                  / {goals.targetFiberG}g
                </span>
                {summary.sodiumMg > 0 && (
                  <span className="tabular-nums">
                    Sódio:{' '}
                    <strong className="text-slate-800">
                      {summary.sodiumMg.toLocaleString('pt-BR')} mg
                    </strong>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card Hidratação */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Hidratação
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Meta: {(goals.targetWaterMl / 1000).toFixed(2).replace('.', ',')} L
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-extrabold tabular-nums">
                {summary.adherencePct.water}%
              </span>
            </div>

            <div>
              <p className="text-2xl font-black text-slate-900 tabular-nums">
                {(summary.waterMl / 1000).toFixed(2).replace('.', ',')}{' '}
                <span className="text-xs font-bold text-slate-500">
                  L ({summary.waterMl} ml)
                </span>
              </p>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, summary.adherencePct.water)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              aria-label="Remover 250 ml de água"
              onClick={() => adjustWater(selectedDate, -250)}
              disabled={summary.waterMl <= 0}
              className="min-h-[44px] px-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-extrabold flex items-center justify-center gap-1 transition"
            >
              <Minus className="w-3.5 h-3.5" /> 250ml
            </button>
            <button
              type="button"
              aria-label="Adicionar 250 ml de água"
              onClick={() => adjustWater(selectedDate, 250)}
              className="min-h-[44px] px-2 rounded-xl bg-sky-50 hover:bg-blue-100 border border-sky-200 text-sky-700 text-xs font-extrabold flex items-center justify-center gap-1 transition"
            >
              <Plus className="w-3.5 h-3.5" /> 250ml
            </button>
            <button
              type="button"
              aria-label="Adicionar 500 ml de água"
              onClick={() => adjustWater(selectedDate, 500)}
              className="min-h-[44px] px-2 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center gap-1 shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" /> 500ml
            </button>
          </div>
        </div>
      </div>

      {/* ==================== 4 SEÇÕES DE REFEIÇÃO ==================== */}
      <div className="space-y-4">
        {MEAL_SLOTS_ORDER.map((slot) => {
          const bucket = summary.byMealSlot[slot];
          const SlotIcon = MEAL_SLOT_ICONS[slot];
          const yesterdayCount = yesterdaySlotCounts[slot];
          const isSavingThisCombo = savingComboSlot === slot;

          return (
            <section
              key={slot}
              aria-label={MEAL_SLOT_LABELS[slot]}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
            >
              {/* Cabeçalho da Refeição */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#3B82F6] flex items-center justify-center shrink-0">
                    <SlotIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-extrabold text-slate-900">
                      {MEAL_SLOT_LABELS[slot]}
                    </h2>
                    <p className="text-xs text-slate-500 tabular-nums">
                      <strong className="text-slate-800">
                        {bucket.calories} kcal
                      </strong>{' '}
                      • P: {fmt1(bucket.proteinG)}g • C: {fmt1(bucket.carbsG)}g
                      • G: {fmt1(bucket.fatG)}g
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {yesterdayCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleCopyYesterday(slot)}
                      className="min-h-[44px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar de ontem</span>
                    </button>
                  )}

                  {bucket.entries.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSavingComboSlot(slot);
                        setComboNameInput(`${MEAL_SLOT_LABELS[slot]} Padrão`);
                      }}
                      className="min-h-[44px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-[#3B82F6]" />
                      <span>Salvar combo</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openSearchForSlot(slot)}
                    className="min-h-[44px] px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              {/* Mini-form inline para Salvar Combo */}
              {isSavingThisCombo && (
                <form
                  onSubmit={(e) => handleSaveCombo(e, slot)}
                  className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex flex-col sm:flex-row sm:items-center gap-2"
                >
                  <input
                    type="text"
                    required
                    autoFocus
                    value={comboNameInput}
                    onChange={(e) => setComboNameInput(e.target.value)}
                    placeholder="Nome do combo (ex: Café Proteico)..."
                    aria-label="Nome do combo para salvar"
                    className="flex-1 h-11 px-3 rounded-xl bg-white border border-blue-200 text-base text-slate-900 focus:outline-none focus:border-[#3B82F6]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> Salvar
                    </button>
                    <button
                      type="button"
                      aria-label="Cancelar salvar combo"
                      onClick={() => setSavingComboSlot(null)}
                      className="w-11 h-11 rounded-xl bg-white border border-slate-200 text-slate-600 flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Alimentos Lançados */}
              {bucket.entries.length === 0 ? (
                <div className="px-4 py-5 flex items-center justify-between text-xs text-slate-500">
                  <span>Nenhum alimento registrado nesta refeição.</span>
                  <button
                    type="button"
                    onClick={() => openScannerForSlot(slot)}
                    aria-label={`Escanear código de barras para ${MEAL_SLOT_LABELS[slot]}`}
                    className="min-h-[40px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    <ScanBarcode className="w-4 h-4 text-[#3B82F6]" />
                    <span className="hidden sm:inline">Escanear</span>
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {bucket.entries.map((entry) => {
                    const isEditing = editingEntryId === entry.id;
                    const catalogFood = foodCatalogMap.get(entry.foodId);
                    const supportsUnitMode = Boolean(
                      catalogFood?.gramsPerUnit &&
                        catalogFood.gramsPerUnit > 0 &&
                        catalogFood.unitLabel
                    );

                    return (
                      <li key={entry.id} className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-2.5 p-3 rounded-xl bg-slate-50 border border-blue-200">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900 truncate">
                                {entry.foodName}
                              </span>
                              <button
                                type="button"
                                aria-label="Cancelar edição da porção"
                                onClick={() => setEditingEntryId(null)}
                                className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {supportsUnitMode && catalogFood && (
                              <div className="grid grid-cols-2 gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMode('grams');
                                    setEditingQty(Math.round(entry.totalGrams));
                                  }}
                                  className={`h-10 rounded-lg text-xs font-bold border ${
                                    editingMode === 'grams'
                                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  {catalogFood.defaultUnit === 'ml'
                                    ? 'ml'
                                    : 'Gramas (g)'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingMode('unit');
                                    setEditingQty(1);
                                  }}
                                  className={`h-10 rounded-lg text-xs font-bold border truncate px-2 ${
                                    editingMode === 'unit'
                                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                                      : 'bg-white border-slate-200 text-slate-700'
                                  }`}
                                >
                                  {catalogFood.unitLabel}
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <DecimalInput
                                value={editingQty}
                                onChange={setEditingQty}
                                ariaLabel={`Editar quantidade de ${entry.foodName}`}
                                className="flex-1 h-11 px-3 rounded-xl bg-white border border-[#3B82F6] text-base font-extrabold text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditEntry(entry.id)}
                                className="h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1"
                              >
                                <Check className="w-4 h-4" /> Salvar
                              </button>
                              <button
                                type="button"
                                aria-label={`Remover ${entry.foodName}`}
                                onClick={() => {
                                  deleteFoodLog(entry.id);
                                  setEditingEntryId(null);
                                }}
                                className="w-11 h-11 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEditEntry(entry)}
                              className="flex-1 text-left min-w-0 py-1 group"
                            >
                              <p className="text-sm font-bold text-slate-900 group-hover:text-[#3B82F6] truncate transition">
                                {entry.foodName}
                                {entry.foodBrand && (
                                  <span className="font-normal text-slate-500">
                                    {' '}
                                    • {entry.foodBrand}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500 tabular-nums mt-0.5">
                                {entry.measureMode === 'unit' && entry.unitLabel
                                  ? `${fmt1(entry.quantity)} × ${entry.unitLabel} (${fmt1(entry.totalGrams)}g)`
                                  : `${fmt1(entry.totalGrams)}g`}{' '}
                                • P {fmt1(entry.proteinG)}g • C{' '}
                                {fmt1(entry.carbsG)}g • G {fmt1(entry.fatG)}g
                              </p>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-sm font-extrabold text-slate-900 tabular-nums mr-1">
                                {entry.calories}{' '}
                                <span className="text-[11px] font-semibold text-slate-500">
                                  kcal
                                </span>
                              </span>
                              <button
                                type="button"
                                aria-label={`Excluir ${entry.foodName}`}
                                onClick={() => deleteFoodLog(entry.id)}
                                className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {/* ==================== RESUMO DOS ÚLTIMOS 7 DIAS ==================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#3B82F6]" />
              Calorias dos Últimos 7 Dias
            </h2>
            <p className="text-xs text-slate-500">
              Comparativo diário vs linha de meta (
              {goals.targetCalories.toLocaleString('pt-BR')} kcal)
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700 tabular-nums">
            {weeklyStats.daysWithinGoal}/{weeklyStats.loggedDaysCount} dias na
            meta
          </span>
        </div>

        {/* Gráfico de Barras com Linha de Meta */}
        <div className="relative h-44 pt-6 px-2 pb-1 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Linha pontilhada da meta calórica */}
          <div
            style={{ bottom: `calc(${goalLineBottomPct}% * 0.72 + 24px)` }}
            className="pointer-events-none absolute inset-x-2 border-t-2 border-dashed border-[#3B82F6]/60 z-10 flex justify-end"
          >
            <span className="text-[10px] font-bold text-[#3B82F6] bg-slate-50 px-1 -mt-2.5 tabular-nums">
              Meta {goals.targetCalories}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 items-end h-full">
            {weeklyStats.days.map((day) => {
              const barPct =
                day.calories <= 0
                  ? 4
                  : Math.max(
                      10,
                      Math.min(
                        100,
                        Math.round((day.calories / maxWeeklyKcal) * 100)
                      )
                    );
              const isSelectedDay = day.date === selectedDate;
              const isOver = day.calories > goals.targetCalories * 1.1;
              const barColor = !day.hasFoodLogs
                ? 'bg-slate-200'
                : isOver
                  ? 'bg-red-500'
                  : day.withinGoal
                    ? 'bg-emerald-500'
                    : 'bg-[#3B82F6]';

              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  title={`${day.date}: ${day.calories} kcal`}
                  className="flex flex-col items-center justify-end h-full gap-1 group"
                >
                  <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                    {day.calories > 0 ? day.calories : '—'}
                  </span>
                  <div className="w-full flex-1 flex items-end justify-center">
                    <div
                      style={{ height: `${barPct}%` }}
                      className={`w-full max-w-[30px] rounded-t-lg transition-all ${barColor} ${
                        isSelectedDay ? 'ring-2 ring-offset-1 ring-[#3B82F6]' : ''
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[11px] font-bold tabular-nums ${
                      isSelectedDay ? 'text-[#3B82F6]' : 'text-slate-500'
                    }`}
                  >
                    {day.dayLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Médias Semanais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="block text-[11px] text-slate-500 font-semibold">
              Média Calorias
            </span>
            <span className="text-base font-extrabold text-slate-900 tabular-nums">
              {weeklyStats.avgCalories > 0
                ? `${weeklyStats.avgCalories.toLocaleString('pt-BR')} kcal`
                : '—'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="block text-[11px] text-slate-500 font-semibold">
              Média Proteína
            </span>
            <span className="text-base font-extrabold text-emerald-600 tabular-nums">
              {weeklyStats.avgProteinG > 0
                ? `${fmt1(weeklyStats.avgProteinG)}g`
                : '—'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="block text-[11px] text-slate-500 font-semibold">
              Média Carboidrato
            </span>
            <span className="text-base font-extrabold text-amber-600 tabular-nums">
              {weeklyStats.avgCarbsG > 0
                ? `${fmt1(weeklyStats.avgCarbsG)}g`
                : '—'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="block text-[11px] text-slate-500 font-semibold">
              Média Água
            </span>
            <span className="text-base font-extrabold text-sky-600 tabular-nums">
              {weeklyStats.avgWaterMl > 0
                ? `${(weeklyStats.avgWaterMl / 1000).toFixed(2).replace('.', ',')} L`
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ==================== MODAIS DO MÓDULO NUTRIÇÃO ==================== */}
      <FoodSearchModal
        isOpen={searchModalSlot !== null}
        date={selectedDate}
        mealSlot={searchModalSlot ?? 'lunch'}
        initialFood={searchInitialFood}
        initialCreateBarcode={searchInitialCreateBarcode}
        onClose={() => {
          setSearchModalSlot(null);
          setSearchInitialFood(null);
          setSearchInitialCreateBarcode(null);
        }}
        onOpenBarcodeScanner={() => {
          const target = searchModalSlot ?? 'snacks';
          setSearchModalSlot(null);
          openScannerForSlot(target);
        }}
        onAdded={(label) => showToast(`"${label}" adicionado ao diário!`)}
      />

      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onFoodFound={(food) => {
          setShowScanner(false);
          setSearchInitialCreateBarcode(null);
          setSearchInitialFood(food);
          setSearchModalSlot(scannerTargetSlot);
        }}
        onCreateCustomWithBarcode={(barcode) => {
          setShowScanner(false);
          setSearchInitialFood(null);
          setSearchInitialCreateBarcode(barcode);
          setSearchModalSlot(scannerTargetSlot);
        }}
      />

      <NutritionGoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
      />

      <SavedMealsModal
        isOpen={showSavedMealsModal}
        date={selectedDate}
        defaultSlot="lunch"
        onClose={() => setShowSavedMealsModal(false)}
        onLogged={(name, count, slot) =>
          showToast(
            `Combo "${name}" (${count} itens) lançado em ${MEAL_SLOT_LABELS[slot]}!`
          )
        }
      />

      <NutritionAIReportModal
        isOpen={showAIReportModal}
        date={selectedDate}
        onClose={() => setShowAIReportModal(false)}
      />
    </div>
  );
}
