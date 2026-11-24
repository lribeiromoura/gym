import {
  ACTIVITY_LEVEL_META,
  FoodItem,
  FoodLogEntry,
  MEAL_SLOTS_ORDER,
  MealSlot,
  NUTRITION_GOAL_META,
  NutritionGoals,
  NutritionProfile,
} from '@/types/nutrition';
import { WorkoutSession } from '@/types/workout';

const round1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Retorna a data local no formato YYYY-MM-DD (sem deslocamento UTC).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Soma ou subtrai dias de uma string YYYY-MM-DD mantendo calendário local.
 */
export function shiftLocalDateString(dateStr: string, deltaDays: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return getLocalDateString();
  }
  const [y, m, d] = parts;
  const shifted = new Date(y, m - 1, d + deltaDays, 12, 0, 0);
  return getLocalDateString(shifted);
}

/**
 * Formata uma string YYYY-MM-DD para exibição amigável em pt-BR (Hoje, Ontem, ou dia/mês).
 */
export function formatDateLabelPtBr(
  dateStr: string,
  todayStr: string = getLocalDateString()
): string {
  if (dateStr === todayStr) return 'Hoje';
  if (dateStr === shiftLocalDateString(todayStr, -1)) return 'Ontem';
  if (dateStr === shiftLocalDateString(todayStr, 1)) return 'Amanhã';
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

/**
 * Taxa Metabólica Basal (TMB) pela equação de Mifflin-St Jeor:
 * 10 * peso(kg) + 6.25 * altura(cm) - 5 * idade + (homem ? +5 : -161)
 */
export function calculateBMR(profile: NutritionProfile): number {
  const weight = Math.max(20, Number(profile.weightKg) || 70);
  const height = Math.max(100, Number(profile.heightCm) || 170);
  const age = Math.max(10, Number(profile.age) || 28);
  const sexOffset = profile.sex === 'female' ? -161 : 5;
  return Math.round(10 * weight + 6.25 * height - 5 * age + sexOffset);
}

/**
 * Gasto Energético Total Diário (TDEE) aplicando o multiplicador de atividade física.
 */
export function calculateTDEE(profile: NutritionProfile): number {
  const bmr = calculateBMR(profile);
  const meta =
    ACTIVITY_LEVEL_META[profile.activityLevel] ?? ACTIVITY_LEVEL_META.moderate;
  return Math.round(bmr * meta.multiplier);
}

/**
 * Calcula metas nutricionais recomendadas baseadas em evidências:
 * - Calorias por objetivo (-22%, -15%, 0%, +10%, +18%)
 * - Proteína: 1,8 a 2,2 g/kg
 * - Gordura: 0,7 a 1,0 g/kg
 * - Carboidratos: calorias restantes / 4
 * - Fibra: 14g por 1000 kcal
 * - Água: 35 ml/kg arredondado para múltiplos de 250 ml
 */
export function calculateRecommendedGoals(
  profile: NutritionProfile,
  options?: { includeWorkoutCalories?: boolean }
): NutritionGoals {
  const tdee = calculateTDEE(profile);
  const goalMeta =
    NUTRITION_GOAL_META[profile.goalType] ?? NUTRITION_GOAL_META.maintain;
  const weight = Math.max(20, Number(profile.weightKg) || 70);

  const minCalories = profile.sex === 'female' ? 1200 : 1400;
  const targetCalories = Math.max(
    minCalories,
    Math.round(tdee * goalMeta.calorieFactor)
  );

  const targetProteinG = Math.round(weight * goalMeta.proteinPerKg);
  const targetFatG = Math.round(weight * goalMeta.fatPerKg);

  const usedKcal = targetProteinG * 4 + targetFatG * 9;
  const remainingKcal = Math.max(0, targetCalories - usedKcal);
  const targetCarbsG = Math.round(remainingKcal / 4);

  const targetFiberG = Math.max(18, Math.round((targetCalories / 1000) * 14));
  const targetWaterMl = Math.max(
    1500,
    Math.round((weight * 35) / 250) * 250
  );

  return {
    targetCalories,
    targetProteinG,
    targetCarbsG,
    targetFatG,
    targetFiberG,
    targetWaterMl,
    includeWorkoutCalories: options?.includeWorkoutCalories ?? false,
    customOverride: false,
  };
}

export interface CalculatedFoodMacros {
  totalGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sodiumMg?: number;
}

/**
 * Converte a porção informada (em gramas/ml ou em unidades práticas) em macros absolutos.
 */
export function calculateFoodEntryMacros(
  food: Pick<
    FoodItem,
    | 'caloriesPer100'
    | 'proteinPer100'
    | 'carbsPer100'
    | 'fatPer100'
    | 'fiberPer100'
    | 'sodiumMgPer100'
    | 'gramsPerUnit'
  >,
  quantity: number,
  measureMode: 'grams' | 'unit'
): CalculatedFoodMacros {
  const safeQty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const totalGrams =
    measureMode === 'unit' && food.gramsPerUnit && food.gramsPerUnit > 0
      ? round1(safeQty * food.gramsPerUnit)
      : round1(safeQty);
  const factor = totalGrams / 100;

  return {
    totalGrams,
    calories: Math.round((food.caloriesPer100 || 0) * factor),
    proteinG: round1((food.proteinPer100 || 0) * factor),
    carbsG: round1((food.carbsPer100 || 0) * factor),
    fatG: round1((food.fatPer100 || 0) * factor),
    ...(food.fiberPer100 !== undefined
      ? { fiberG: round1(food.fiberPer100 * factor) }
      : {}),
    ...(food.sodiumMgPer100 !== undefined
      ? { sodiumMg: Math.round(food.sodiumMgPer100 * factor) }
      : {}),
  };
}

/**
 * Filtra sessões de treino que ocorreram em uma data local específica (YYYY-MM-DD).
 */
export function getWorkoutSessionsOnDate(
  workoutHistory: WorkoutSession[],
  dateStr: string
): WorkoutSession[] {
  return workoutHistory.filter((session) => {
    if (!session.startTime) return false;
    if (session.startTime.length === 10) {
      return session.startTime === dateStr;
    }
    const parsed = new Date(session.startTime);
    if (Number.isNaN(parsed.getTime())) {
      return session.startTime.slice(0, 10) === dateStr;
    }
    return getLocalDateString(parsed) === dateStr;
  });
}

/**
 * Estimativa conservadora de gasto calórico de sessões de treino de força (~5 METs × peso × horas).
 */
export function estimateWorkoutCaloriesBurned(
  sessionsOnDate: WorkoutSession[],
  weightKg: number
): number {
  if (!sessionsOnDate || sessionsOnDate.length === 0) return 0;
  const safeWeight = Math.max(30, Number(weightKg) || 75);
  const MET_STRENGTH_TRAINING = 5.0;

  let totalKcal = 0;
  for (const session of sessionsOnDate) {
    const durationSec = Math.max(0, Number(session.durationSeconds) || 0);
    const hours = durationSec / 3600;
    totalKcal += MET_STRENGTH_TRAINING * safeWeight * hours;
  }
  return Math.round(totalKcal);
}

export interface MealSlotSummary {
  slot: MealSlot;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  entries: FoodLogEntry[];
}

export interface DailyNutritionSummary {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  waterMl: number;
  entryCount: number;
  workoutBonusKcal: number;
  effectiveTargetCalories: number;
  remainingCalories: number;
  adherencePct: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    water: number;
  };
  byMealSlot: Record<MealSlot, MealSlotSummary>;
}

const safePct = (consumed: number, target: number): number => {
  if (!target || target <= 0) return 0;
  return Math.round((consumed / target) * 100);
};

/**
 * Calcula o resumo completo de calorias, macros, hidratação e subtotais por refeição de um dia.
 */
export function calculateDailyNutritionSummary(
  date: string,
  entries: FoodLogEntry[],
  waterMl: number,
  goals: NutritionGoals,
  workoutBonusKcal = 0
): DailyNutritionSummary {
  const dayEntries = entries.filter((e) => e.date === date);

  const byMealSlot = {} as Record<MealSlot, MealSlotSummary>;
  for (const slot of MEAL_SLOTS_ORDER) {
    byMealSlot[slot] = {
      slot,
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      entries: [],
    };
  }

  let calories = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberG = 0;
  let sodiumMg = 0;

  for (const entry of dayEntries) {
    const slotBucket = byMealSlot[entry.mealSlot] ?? byMealSlot.snacks;
    slotBucket.entries.push(entry);
    slotBucket.calories += entry.calories;
    slotBucket.proteinG = round1(slotBucket.proteinG + entry.proteinG);
    slotBucket.carbsG = round1(slotBucket.carbsG + entry.carbsG);
    slotBucket.fatG = round1(slotBucket.fatG + entry.fatG);
    slotBucket.fiberG = round1(slotBucket.fiberG + (entry.fiberG ?? 0));

    calories += entry.calories;
    proteinG += entry.proteinG;
    carbsG += entry.carbsG;
    fatG += entry.fatG;
    fiberG += entry.fiberG ?? 0;
    sodiumMg += entry.sodiumMg ?? 0;
  }

  calories = Math.round(calories);
  proteinG = round1(proteinG);
  carbsG = round1(carbsG);
  fatG = round1(fatG);
  fiberG = round1(fiberG);
  sodiumMg = Math.round(sodiumMg);

  const safeWaterMl = Math.max(0, Math.round(waterMl || 0));
  const appliedWorkoutBonus = goals.includeWorkoutCalories
    ? Math.max(0, Math.round(workoutBonusKcal || 0))
    : 0;
  const effectiveTargetCalories = Math.max(
    1,
    Math.round(goals.targetCalories) + appliedWorkoutBonus
  );
  const remainingCalories = effectiveTargetCalories - calories;

  return {
    date,
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG,
    sodiumMg,
    waterMl: safeWaterMl,
    entryCount: dayEntries.length,
    workoutBonusKcal: appliedWorkoutBonus,
    effectiveTargetCalories,
    remainingCalories,
    adherencePct: {
      calories: safePct(calories, effectiveTargetCalories),
      protein: safePct(proteinG, goals.targetProteinG),
      carbs: safePct(carbsG, goals.targetCarbsG),
      fat: safePct(fatG, goals.targetFatG),
      fiber: safePct(fiberG, goals.targetFiberG),
      water: safePct(safeWaterMl, goals.targetWaterMl),
    },
    byMealSlot,
  };
}

export interface WeeklyDayPoint {
  date: string;
  dayLabel: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  hasFoodLogs: boolean;
  withinGoal: boolean;
}

export interface WeeklyNutritionStats {
  days: WeeklyDayPoint[];
  loggedDaysCount: number;
  waterLoggedDaysCount: number;
  avgCalories: number;
  avgProteinG: number;
  avgCarbsG: number;
  avgFatG: number;
  avgWaterMl: number;
  daysWithinGoal: number;
}

const WEEKDAY_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/**
 * Calcula estatísticas agregadas dos últimos 7 dias (incluindo referenceDate).
 */
export function calculateWeeklyNutritionStats(
  referenceDate: string,
  entries: FoodLogEntry[],
  waterByDate: Record<string, number>,
  goals: NutritionGoals
): WeeklyNutritionStats {
  const days: WeeklyDayPoint[] = [];

  for (let offset = -6; offset <= 0; offset++) {
    const dateStr = shiftLocalDateString(referenceDate, offset);
    const dayEntries = entries.filter((e) => e.date === dateStr);
    const waterMl = Math.max(0, Math.round(waterByDate[dateStr] || 0));

    let calories = 0;
    let proteinG = 0;
    let carbsG = 0;
    let fatG = 0;
    for (const e of dayEntries) {
      calories += e.calories;
      proteinG += e.proteinG;
      carbsG += e.carbsG;
      fatG += e.fatG;
    }

    calories = Math.round(calories);
    proteinG = round1(proteinG);
    carbsG = round1(carbsG);
    fatG = round1(fatG);

    const hasFoodLogs = dayEntries.length > 0;
    const lowerBound = goals.targetCalories * 0.9;
    const upperBound = goals.targetCalories * 1.1;
    const withinGoal =
      hasFoodLogs && calories >= lowerBound && calories <= upperBound;

    const dObj = new Date(`${dateStr}T12:00:00`);
    const dayLabel = Number.isNaN(dObj.getTime())
      ? dateStr.slice(8, 10)
      : WEEKDAY_SHORT_PT[dObj.getDay()];

    days.push({
      date: dateStr,
      dayLabel,
      calories,
      proteinG,
      carbsG,
      fatG,
      waterMl,
      hasFoodLogs,
      withinGoal,
    });
  }

  const loggedDays = days.filter((d) => d.hasFoodLogs);
  const waterDays = days.filter((d) => d.waterMl > 0);
  const loggedDaysCount = loggedDays.length;
  const waterLoggedDaysCount = waterDays.length;

  const avgCalories =
    loggedDaysCount > 0
      ? Math.round(
          loggedDays.reduce((acc, d) => acc + d.calories, 0) / loggedDaysCount
        )
      : 0;
  const avgProteinG =
    loggedDaysCount > 0
      ? round1(
          loggedDays.reduce((acc, d) => acc + d.proteinG, 0) / loggedDaysCount
        )
      : 0;
  const avgCarbsG =
    loggedDaysCount > 0
      ? round1(
          loggedDays.reduce((acc, d) => acc + d.carbsG, 0) / loggedDaysCount
        )
      : 0;
  const avgFatG =
    loggedDaysCount > 0
      ? round1(loggedDays.reduce((acc, d) => acc + d.fatG, 0) / loggedDaysCount)
      : 0;
  const avgWaterMl =
    waterLoggedDaysCount > 0
      ? Math.round(
          waterDays.reduce((acc, d) => acc + d.waterMl, 0) /
            waterLoggedDaysCount
        )
      : 0;
  const daysWithinGoal = loggedDays.filter((d) => d.withinGoal).length;

  return {
    days,
    loggedDaysCount,
    waterLoggedDaysCount,
    avgCalories,
    avgProteinG,
    avgCarbsG,
    avgFatG,
    avgWaterMl,
    daysWithinGoal,
  };
}
