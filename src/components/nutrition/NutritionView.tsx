'use client';

import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Flame,
  Minus,
  Plus,
  ScanBarcode,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  FoodItem,
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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { CalorieRingChart, WeeklyCaloriesChart } from './NutritionCharts';
import { MealSlotCard } from './MealSlotCard';
import { FoodSearchModal } from './FoodSearchModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { NutritionGoalsModal } from './NutritionGoalsModal';
import { SavedMealsModal } from './SavedMealsModal';
import { NutritionAIReportModal } from './NutritionAIReportModal';

const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

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
  const [scannerTargetSlot, setScannerTargetSlot] =
    useState<MealSlot>('snacks');
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showSavedMealsModal, setShowSavedMealsModal] = useState(false);
  const [showAIReportModal, setShowAIReportModal] = useState(false);

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

  const openSearchForSlot = (slot: MealSlot) => {
    setSearchInitialFood(null);
    setSearchInitialCreateBarcode(null);
    setSearchModalSlot(slot);
  };

  const openScannerForSlot = (slot: MealSlot) => {
    setScannerTargetSlot(slot);
    setShowScanner(true);
  };

  const handleCopyYesterday = (slot: MealSlot) => {
    const count = copyMealFromDate(yesterdayStr, selectedDate, slot);
    if (count > 0) {
      toast.success(
        `${count} ${count === 1 ? 'item copiado' : 'itens copiados'} de ontem para ${MEAL_SLOT_LABELS[slot]}!`
      );
    } else {
      toast.info(`Nenhum item encontrado ontem em ${MEAL_SLOT_LABELS[slot]}.`);
    }
  };

  const handleSaveCombo = (name: string, slot: MealSlot): boolean => {
    const saved = saveMealFromSlot(name, selectedDate, slot);
    if (saved) {
      toast.success(
        `Combo "${saved.name}" salvo com ${saved.items.length} itens!`
      );
      return true;
    }
    return false;
  };

  const macroRows = [
    {
      label: 'Proteína',
      value: summary.proteinG,
      target: goals.targetProteinG,
      pct: summary.adherencePct.protein,
      indicatorClass: 'bg-emerald-500',
      labelClass: 'text-emerald-700 dark:text-emerald-400',
    },
    {
      label: 'Carboidratos',
      value: summary.carbsG,
      target: goals.targetCarbsG,
      pct: summary.adherencePct.carbs,
      indicatorClass: 'bg-amber-500',
      labelClass: 'text-amber-700 dark:text-amber-400',
    },
    {
      label: 'Gorduras',
      value: summary.fatG,
      target: goals.targetFatG,
      pct: summary.adherencePct.fat,
      indicatorClass: 'bg-purple-500',
      labelClass: 'text-purple-700 dark:text-purple-400',
    },
  ];

  return (
    <div className="space-y-5 pb-28">
      {/* ==================== CABEÇALHO + ATALHOS ==================== */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <Utensils className="size-6 text-blue-600 dark:text-blue-400" />
            Nutrição
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {goalMeta.shortLabel} • Meta:{' '}
            <strong className="text-foreground">
              {goals.targetCalories.toLocaleString('pt-BR')} kcal
            </strong>{' '}
            ({goals.targetProteinG}P / {goals.targetCarbsG}C /{' '}
            {goals.targetFatG}G)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => openScannerForSlot('snacks')}
            className="border-primary/30 bg-primary/10 px-3.5 text-xs text-blue-700 hover:bg-primary/20 dark:text-blue-400"
          >
            <ScanBarcode className="size-4" />
            <span>Código de Barras</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowSavedMealsModal(true)}
            className="px-3.5 text-xs"
          >
            <Bookmark className="size-4 text-blue-600 dark:text-blue-400" />
            <span>
              Combos{savedMeals.length > 0 ? ` (${savedMeals.length})` : ''}
            </span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowGoalsModal(true)}
            className="px-3.5 text-xs"
          >
            <Calculator className="size-4 text-blue-600 dark:text-blue-400" />
            <span>Metas &amp; TMB</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowAIReportModal(true)}
            className="border-emerald-500/30 bg-emerald-500/15 px-3.5 text-xs text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-400"
          >
            <Sparkles className="size-4" />
            <span>Relatório IA</span>
          </Button>
        </div>
      </div>

      {/* ==================== NAVEGAÇÃO POR DATA ==================== */}
      <Card className="flex items-center justify-between gap-2 p-2">
        <Button
          variant="secondary"
          size="icon"
          aria-label="Dia anterior"
          onClick={() => setSelectedDate((d) => shiftLocalDateString(d, -1))}
          className="shrink-0"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <label className="relative flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-secondary">
            <Calendar className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="truncate text-sm font-extrabold capitalize text-foreground">
              {formatDateLabelPtBr(selectedDate, todayStr)}
            </span>
            <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
              (
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')}
              )
            </span>
            <Input
              type="date"
              aria-label="Selecionar data do diário alimentar"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
            />
          </label>

          {selectedDate !== todayStr && (
            <Button
              variant="outline"
              onClick={() => setSelectedDate(todayStr)}
              className="shrink-0 border-primary/30 bg-primary/10 px-3 text-xs text-blue-700 hover:bg-primary/20 dark:text-blue-400"
            >
              Hoje
            </Button>
          )}
        </div>

        <Button
          variant="secondary"
          size="icon"
          aria-label="Próximo dia"
          onClick={() => setSelectedDate((d) => shiftLocalDateString(d, 1))}
          className="shrink-0"
        >
          <ChevronRight className="size-5" />
        </Button>
      </Card>

      {/* ==================== RESUMO CALORIAS & MACROS + ÁGUA ==================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Card Calorias & Macros */}
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              {/* Gráfico Anel de Calorias (Recharts) */}
              <CalorieRingChart
                calories={summary.calories}
                effectiveTargetCalories={summary.effectiveTargetCalories}
                remainingCalories={summary.remainingCalories}
                adherencePct={summary.adherencePct.calories}
              />

              {/* Equação Calórica + Barras de Macros */}
              <div className="w-full flex-1 space-y-4">
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-secondary/60 p-3 text-center">
                  <div>
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      Meta Base
                    </span>
                    <span className="text-sm font-extrabold tabular-nums text-foreground sm:text-base">
                      {goals.targetCalories.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="border-x border-border">
                    <span className="block text-[11px] font-semibold text-muted-foreground">
                      Consumido
                    </span>
                    <span className="text-sm font-extrabold tabular-nums text-blue-600 dark:text-blue-400 sm:text-base">
                      {summary.calories.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div>
                    <span className="flex items-center justify-center gap-0.5 text-[11px] font-semibold text-muted-foreground">
                      <Flame className="size-3 text-amber-500" />
                      Treino
                    </span>
                    <span className="text-sm font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-base">
                      {goals.includeWorkoutCalories
                        ? `+${summary.workoutBonusKcal}`
                        : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Barras de Proteína, Carboidratos e Gorduras */}
                <div className="space-y-3">
                  {macroRows.map((macro) => (
                    <div key={macro.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${macro.labelClass}`}>
                          {macro.label}
                        </span>
                        <span className="font-semibold tabular-nums text-muted-foreground">
                          <strong className="text-foreground">
                            {fmt1(macro.value)}g
                          </strong>{' '}
                          / {macro.target}g ({macro.pct}%)
                        </span>
                      </div>
                      <Progress
                        value={macro.pct}
                        indicatorClassName={macro.indicatorClass}
                        aria-label={`${macro.label}: ${macro.pct}% da meta`}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                  <span>
                    Fibras:{' '}
                    <strong className="text-foreground">
                      {fmt1(summary.fiberG)}g
                    </strong>{' '}
                    / {goals.targetFiberG}g
                  </span>
                  {summary.sodiumMg > 0 && (
                    <span className="tabular-nums">
                      Sódio:{' '}
                      <strong className="text-foreground">
                        {summary.sodiumMg.toLocaleString('pt-BR')} mg
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card Hidratação */}
        <Card className="flex flex-col justify-between gap-4 p-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <Droplets className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-foreground">
                    Hidratação
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Meta:{' '}
                    {(goals.targetWaterMl / 1000).toFixed(2).replace('.', ',')}{' '}
                    L
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-sky-500/30 bg-sky-500/15 tabular-nums text-sky-700 dark:text-sky-400"
              >
                {summary.adherencePct.water}%
              </Badge>
            </div>

            <div>
              <p className="text-2xl font-black tabular-nums text-foreground">
                {(summary.waterMl / 1000).toFixed(2).replace('.', ',')}{' '}
                <span className="text-xs font-bold text-muted-foreground">
                  L ({summary.waterMl} ml)
                </span>
              </p>
              <Progress
                value={summary.adherencePct.water}
                className="mt-2 h-3"
                indicatorClassName="bg-sky-500"
                aria-label={`Hidratação: ${summary.adherencePct.water}% da meta`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              aria-label="Remover 250 ml de água"
              onClick={() => adjustWater(selectedDate, -250)}
              disabled={summary.waterMl <= 0}
              className="px-2 text-xs font-extrabold"
            >
              <Minus className="size-3.5" /> 250ml
            </Button>
            <Button
              variant="outline"
              aria-label="Adicionar 250 ml de água"
              onClick={() => adjustWater(selectedDate, 250)}
              className="border-sky-500/30 bg-sky-500/15 px-2 text-xs font-extrabold text-sky-700 hover:bg-sky-500/25 dark:text-sky-400"
            >
              <Plus className="size-3.5" /> 250ml
            </Button>
            <Button
              aria-label="Adicionar 500 ml de água"
              onClick={() => adjustWater(selectedDate, 500)}
              className="px-2 text-xs font-extrabold"
            >
              <Plus className="size-3.5" /> 500ml
            </Button>
          </div>
        </Card>
      </div>

      {/* ==================== 4 SEÇÕES DE REFEIÇÃO ==================== */}
      <div className="space-y-4">
        {MEAL_SLOTS_ORDER.map((slot) => (
          <MealSlotCard
            key={slot}
            slot={slot}
            bucket={summary.byMealSlot[slot]}
            yesterdayCount={yesterdaySlotCounts[slot]}
            foodCatalogMap={foodCatalogMap}
            onOpenSearch={openSearchForSlot}
            onOpenScanner={openScannerForSlot}
            onCopyYesterday={handleCopyYesterday}
            onSaveCombo={handleSaveCombo}
            onUpdateEntryQuantity={(entryId, qty, mode) => {
              updateFoodLogQuantity(entryId, qty, mode);
              toast.success('Porção atualizada!');
            }}
            onDeleteEntry={(entryId) => {
              deleteFoodLog(entryId);
              toast.info('Item removido do diário.');
            }}
          />
        ))}
      </div>

      {/* ==================== RESUMO DOS ÚLTIMOS 7 DIAS ==================== */}
      <WeeklyCaloriesChart
        weeklyStats={weeklyStats}
        targetCalories={goals.targetCalories}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

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
        onAdded={(label) => toast.success(`"${label}" adicionado ao diário!`)}
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
          toast.success(
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
