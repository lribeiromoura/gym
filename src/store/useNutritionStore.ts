'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ActivityLevel,
  FoodItem,
  FoodLogEntry,
  MealSlot,
  NutritionBackupData,
  NutritionGoals,
  NutritionGoalType,
  NutritionProfile,
  SavedMeal,
  SavedMealItem,
} from '@/types/nutrition';
import { FOODS_SEED_BR } from '@/data/foods-seed-br';
import {
  calculateFoodEntryMacros,
  calculateRecommendedGoals,
} from '@/lib/nutrition-calculations';

const MAX_CACHED_ONLINE_FOODS = 200;
const MAX_RECENT_FOOD_IDS = 30;

export const INITIAL_NUTRITION_PROFILE: NutritionProfile = {
  sex: 'male',
  age: 28,
  heightCm: 175,
  weightKg: 75,
  activityLevel: 'moderate',
  goalType: 'maintain',
};

export const INITIAL_NUTRITION_GOALS: NutritionGoals =
  calculateRecommendedGoals(INITIAL_NUTRITION_PROFILE);

const VALID_ACTIVITY_LEVELS: ActivityLevel[] = [
  'sedentary',
  'light',
  'moderate',
  'active',
  'very_active',
];

const VALID_GOAL_TYPES: NutritionGoalType[] = [
  'cut_aggressive',
  'cut',
  'maintain',
  'bulk_lean',
  'bulk',
];

export function resolveNutritionProfile(
  incoming?: Partial<NutritionProfile> | null
): NutritionProfile {
  const safe = incoming && typeof incoming === 'object' ? incoming : {};
  const age =
    typeof safe.age === 'number' && Number.isFinite(safe.age) && safe.age >= 10
      ? Math.min(120, Math.round(safe.age))
      : INITIAL_NUTRITION_PROFILE.age;
  const heightCm =
    typeof safe.heightCm === 'number' &&
    Number.isFinite(safe.heightCm) &&
    safe.heightCm >= 100
      ? Math.min(260, Math.round(safe.heightCm))
      : INITIAL_NUTRITION_PROFILE.heightCm;
  const weightKg =
    typeof safe.weightKg === 'number' &&
    Number.isFinite(safe.weightKg) &&
    safe.weightKg >= 20
      ? Math.min(400, Math.round(safe.weightKg * 10) / 10)
      : INITIAL_NUTRITION_PROFILE.weightKg;

  return {
    sex: safe.sex === 'female' ? 'female' : 'male',
    age,
    heightCm,
    weightKg,
    activityLevel: VALID_ACTIVITY_LEVELS.includes(
      safe.activityLevel as ActivityLevel
    )
      ? (safe.activityLevel as ActivityLevel)
      : INITIAL_NUTRITION_PROFILE.activityLevel,
    goalType: VALID_GOAL_TYPES.includes(safe.goalType as NutritionGoalType)
      ? (safe.goalType as NutritionGoalType)
      : INITIAL_NUTRITION_PROFILE.goalType,
  };
}

export function resolveNutritionGoals(
  incoming?: Partial<NutritionGoals> | null,
  fallbackProfile: NutritionProfile = INITIAL_NUTRITION_PROFILE
): NutritionGoals {
  const defaults = calculateRecommendedGoals(fallbackProfile);
  const safe = incoming && typeof incoming === 'object' ? incoming : {};
  const posNum = (v: unknown, fallback: number, min = 0) =>
    typeof v === 'number' && Number.isFinite(v) && v >= min
      ? Math.round(v)
      : fallback;

  return {
    targetCalories: posNum(safe.targetCalories, defaults.targetCalories, 500),
    targetProteinG: posNum(safe.targetProteinG, defaults.targetProteinG, 0),
    targetCarbsG: posNum(safe.targetCarbsG, defaults.targetCarbsG, 0),
    targetFatG: posNum(safe.targetFatG, defaults.targetFatG, 0),
    targetFiberG: posNum(safe.targetFiberG, defaults.targetFiberG, 0),
    targetWaterMl: posNum(safe.targetWaterMl, defaults.targetWaterMl, 250),
    includeWorkoutCalories: Boolean(safe.includeWorkoutCalories),
    customOverride: Boolean(safe.customOverride),
  };
}

const uid = (prefix = 'nut') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const ids = new Set(current.map((item) => item.id));
  const result = [...current];
  for (const item of incoming) {
    if (!ids.has(item.id)) {
      ids.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export interface AddFoodLogParams {
  date: string;
  mealSlot: MealSlot;
  food: FoodItem;
  quantity: number;
  measureMode: 'grams' | 'unit';
}

export interface NutritionStoreState {
  customFoods: FoodItem[];
  cachedOnlineFoods: FoodItem[];
  recentFoodIds: string[];
  foodLogs: FoodLogEntry[];
  waterByDate: Record<string, number>;
  savedMeals: SavedMeal[];
  profile: NutritionProfile;
  goals: NutritionGoals;
  nutritionAIReportPrompt?: string;

  // Actions — Diário Alimentar
  addFoodLog: (params: AddFoodLogParams) => FoodLogEntry;
  updateFoodLogQuantity: (
    entryId: string,
    quantity: number,
    measureMode?: 'grams' | 'unit'
  ) => void;
  deleteFoodLog: (entryId: string) => void;
  copyMealFromDate: (
    fromDate: string,
    toDate: string,
    mealSlot: MealSlot
  ) => number;

  // Actions — Hidratação
  adjustWater: (date: string, deltaMl: number) => void;
  setWater: (date: string, ml: number) => void;

  // Actions — Alimentos
  addCustomFood: (food: Omit<FoodItem, 'id' | 'source'>) => FoodItem;
  deleteCustomFood: (foodId: string) => void;
  cacheOnlineFoods: (foods: FoodItem[]) => void;

  // Actions — Refeições Salvas / Combos
  saveMealFromSlot: (
    name: string,
    date: string,
    mealSlot: MealSlot
  ) => SavedMeal | null;
  saveCustomMeal: (
    meal: Omit<SavedMeal, 'id' | 'updatedAt'> & { id?: string }
  ) => SavedMeal;
  renameSavedMeal: (mealId: string, name: string) => void;
  deleteSavedMeal: (mealId: string) => void;
  logSavedMeal: (mealId: string, date: string, mealSlot: MealSlot) => number;

  // Actions — Perfil, Metas e Relatório IA
  updateProfileAndRecalculate: (updates: Partial<NutritionProfile>) => void;
  updateGoals: (updates: Partial<NutritionGoals>) => void;
  setNutritionAIReportPrompt: (prompt?: string) => void;

  // Actions — Dados & Backup
  getNutritionBackupData: () => NutritionBackupData;
  clearNutritionData: () => void;
  restoreNutritionData: (
    data: Partial<NutritionBackupData> | undefined,
    mode: 'replace' | 'merge'
  ) => void;
}

const findFoodInCatalog = (
  foodId: string,
  customFoods: FoodItem[],
  cachedOnlineFoods: FoodItem[]
): FoodItem | undefined => {
  return (
    customFoods.find((f) => f.id === foodId) ||
    FOODS_SEED_BR.find((f) => f.id === foodId) ||
    cachedOnlineFoods.find((f) => f.id === foodId)
  );
};

export const useNutritionStore = create<NutritionStoreState>()(
  persist(
    (set, get) => ({
      customFoods: [],
      cachedOnlineFoods: [],
      recentFoodIds: [],
      foodLogs: [],
      waterByDate: {},
      savedMeals: [],
      profile: INITIAL_NUTRITION_PROFILE,
      goals: INITIAL_NUTRITION_GOALS,
      nutritionAIReportPrompt: undefined,

      addFoodLog: ({ date, mealSlot, food, quantity, measureMode }) => {
        const effectiveMode: 'grams' | 'unit' =
          measureMode === 'unit' && food.gramsPerUnit && food.gramsPerUnit > 0
            ? 'unit'
            : 'grams';
        const macros = calculateFoodEntryMacros(food, quantity, effectiveMode);
        const entry: FoodLogEntry = {
          id: uid('log'),
          date,
          mealSlot,
          foodId: food.id,
          foodName: food.name,
          ...(food.brand ? { foodBrand: food.brand } : {}),
          quantity: Math.round(quantity * 100) / 100,
          measureMode: effectiveMode,
          ...(effectiveMode === 'unit' && food.unitLabel
            ? { unitLabel: food.unitLabel }
            : {}),
          totalGrams: macros.totalGrams,
          calories: macros.calories,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
          ...(macros.fiberG !== undefined ? { fiberG: macros.fiberG } : {}),
          ...(macros.sodiumMg !== undefined ? { sodiumMg: macros.sodiumMg } : {}),
          createdAt: new Date().toISOString(),
        };

        const state = get();
        const nextRecent = [
          food.id,
          ...state.recentFoodIds.filter((id) => id !== food.id),
        ].slice(0, MAX_RECENT_FOOD_IDS);

        let nextCached = state.cachedOnlineFoods;
        if (food.source === 'openfoodfacts') {
          nextCached = [
            food,
            ...state.cachedOnlineFoods.filter((f) => f.id !== food.id),
          ].slice(0, MAX_CACHED_ONLINE_FOODS);
        }

        set({
          foodLogs: [...state.foodLogs, entry],
          recentFoodIds: nextRecent,
          cachedOnlineFoods: nextCached,
        });

        return entry;
      },

      updateFoodLogQuantity: (entryId, quantity, measureMode) => {
        if (!Number.isFinite(quantity) || quantity <= 0) return;
        const state = get();
        const nextLogs = state.foodLogs.map((entry) => {
          if (entry.id !== entryId) return entry;

          const food = findFoodInCatalog(
            entry.foodId,
            state.customFoods,
            state.cachedOnlineFoods
          );

          if (food) {
            const targetMode: 'grams' | 'unit' =
              (measureMode ?? entry.measureMode) === 'unit' &&
              food.gramsPerUnit &&
              food.gramsPerUnit > 0
                ? 'unit'
                : 'grams';
            const macros = calculateFoodEntryMacros(food, quantity, targetMode);
            return {
              ...entry,
              quantity: Math.round(quantity * 100) / 100,
              measureMode: targetMode,
              unitLabel: targetMode === 'unit' ? food.unitLabel : undefined,
              totalGrams: macros.totalGrams,
              calories: macros.calories,
              proteinG: macros.proteinG,
              carbsG: macros.carbsG,
              fatG: macros.fatG,
              fiberG: macros.fiberG,
              sodiumMg: macros.sodiumMg,
            };
          }

          // Fallback proporcional se o alimento original não estiver mais no catálogo
          const ratio =
            entry.quantity > 0 ? quantity / entry.quantity : 1;
          const round1 = (n: number) => Math.round(n * 10) / 10;
          return {
            ...entry,
            quantity: Math.round(quantity * 100) / 100,
            totalGrams: round1(entry.totalGrams * ratio),
            calories: Math.round(entry.calories * ratio),
            proteinG: round1(entry.proteinG * ratio),
            carbsG: round1(entry.carbsG * ratio),
            fatG: round1(entry.fatG * ratio),
            ...(entry.fiberG !== undefined
              ? { fiberG: round1(entry.fiberG * ratio) }
              : {}),
            ...(entry.sodiumMg !== undefined
              ? { sodiumMg: Math.round(entry.sodiumMg * ratio) }
              : {}),
          };
        });

        set({ foodLogs: nextLogs });
      },

      deleteFoodLog: (entryId) => {
        set({
          foodLogs: get().foodLogs.filter((e) => e.id !== entryId),
        });
      },

      copyMealFromDate: (fromDate, toDate, mealSlot) => {
        const state = get();
        const sourceEntries = state.foodLogs.filter(
          (e) => e.date === fromDate && e.mealSlot === mealSlot
        );
        if (sourceEntries.length === 0) return 0;

        const now = new Date().toISOString();
        const copied: FoodLogEntry[] = sourceEntries.map((src, idx) => ({
          ...src,
          id: `${uid('log')}-${idx}`,
          date: toDate,
          createdAt: now,
        }));

        set({
          foodLogs: [...state.foodLogs, ...copied],
        });
        return copied.length;
      },

      adjustWater: (date, deltaMl) => {
        const current = get().waterByDate[date] || 0;
        const next = Math.max(0, Math.round(current + deltaMl));
        set({
          waterByDate: {
            ...get().waterByDate,
            [date]: next,
          },
        });
      },

      setWater: (date, ml) => {
        const next = Math.max(0, Math.round(Number(ml) || 0));
        set({
          waterByDate: {
            ...get().waterByDate,
            [date]: next,
          },
        });
      },

      addCustomFood: (foodData) => {
        const created: FoodItem = {
          ...foodData,
          id: uid('food'),
          source: 'custom',
        };
        set({
          customFoods: [created, ...get().customFoods],
        });
        return created;
      },

      deleteCustomFood: (foodId) => {
        set({
          customFoods: get().customFoods.filter((f) => f.id !== foodId),
          recentFoodIds: get().recentFoodIds.filter((id) => id !== foodId),
        });
      },

      cacheOnlineFoods: (foods) => {
        if (!foods || foods.length === 0) return;
        const state = get();
        const incomingMap = new Map(foods.map((f) => [f.id, f]));
        const preserved = state.cachedOnlineFoods.filter(
          (f) => !incomingMap.has(f.id)
        );
        const merged = [...foods, ...preserved].slice(
          0,
          MAX_CACHED_ONLINE_FOODS
        );
        set({ cachedOnlineFoods: merged });
      },

      saveMealFromSlot: (name, date, mealSlot) => {
        const cleanName = name.trim();
        if (!cleanName) return null;
        const slotEntries = get().foodLogs.filter(
          (e) => e.date === date && e.mealSlot === mealSlot
        );
        if (slotEntries.length === 0) return null;

        const items: SavedMealItem[] = slotEntries.map((e) => ({
          foodId: e.foodId,
          foodName: e.foodName,
          ...(e.foodBrand ? { foodBrand: e.foodBrand } : {}),
          quantity: e.quantity,
          measureMode: e.measureMode,
          ...(e.unitLabel ? { unitLabel: e.unitLabel } : {}),
          totalGrams: e.totalGrams,
          calories: e.calories,
          proteinG: e.proteinG,
          carbsG: e.carbsG,
          fatG: e.fatG,
          ...(e.fiberG !== undefined ? { fiberG: e.fiberG } : {}),
          ...(e.sodiumMg !== undefined ? { sodiumMg: e.sodiumMg } : {}),
        }));

        const meal: SavedMeal = {
          id: uid('meal'),
          name: cleanName,
          defaultMealSlot: mealSlot,
          items,
          updatedAt: new Date().toISOString(),
        };

        set({
          savedMeals: [meal, ...get().savedMeals],
        });
        return meal;
      },

      saveCustomMeal: (mealData) => {
        const now = new Date().toISOString();
        if (mealData.id) {
          const existing = get().savedMeals.find((m) => m.id === mealData.id);
          if (existing) {
            const updated: SavedMeal = {
              ...existing,
              ...mealData,
              id: existing.id,
              updatedAt: now,
            };
            set({
              savedMeals: get().savedMeals.map((m) =>
                m.id === existing.id ? updated : m
              ),
            });
            return updated;
          }
        }

        const created: SavedMeal = {
          ...mealData,
          id: uid('meal'),
          updatedAt: now,
        };
        set({
          savedMeals: [created, ...get().savedMeals],
        });
        return created;
      },

      renameSavedMeal: (mealId, name) => {
        const clean = name.trim();
        if (!clean) return;
        set({
          savedMeals: get().savedMeals.map((m) =>
            m.id === mealId
              ? { ...m, name: clean, updatedAt: new Date().toISOString() }
              : m
          ),
        });
      },

      deleteSavedMeal: (mealId) => {
        set({
          savedMeals: get().savedMeals.filter((m) => m.id !== mealId),
        });
      },

      logSavedMeal: (mealId, date, mealSlot) => {
        const meal = get().savedMeals.find((m) => m.id === mealId);
        if (!meal || meal.items.length === 0) return 0;

        const now = new Date().toISOString();
        const newEntries: FoodLogEntry[] = meal.items.map((item, idx) => ({
          id: `${uid('log')}-${idx}`,
          date,
          mealSlot,
          foodId: item.foodId,
          foodName: item.foodName,
          ...(item.foodBrand ? { foodBrand: item.foodBrand } : {}),
          quantity: item.quantity,
          measureMode: item.measureMode,
          ...(item.unitLabel ? { unitLabel: item.unitLabel } : {}),
          totalGrams: item.totalGrams,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          ...(item.fiberG !== undefined ? { fiberG: item.fiberG } : {}),
          ...(item.sodiumMg !== undefined ? { sodiumMg: item.sodiumMg } : {}),
          createdAt: now,
        }));

        set({
          foodLogs: [...get().foodLogs, ...newEntries],
        });
        return newEntries.length;
      },

      updateProfileAndRecalculate: (updates) => {
        const current = get();
        const nextProfile = resolveNutritionProfile({
          ...current.profile,
          ...updates,
        });
        const nextGoals = calculateRecommendedGoals(nextProfile, {
          includeWorkoutCalories: current.goals.includeWorkoutCalories,
        });
        set({
          profile: nextProfile,
          goals: nextGoals,
        });
      },

      updateGoals: (updates) => {
        const current = get();
        const nextGoals = resolveNutritionGoals(
          {
            ...current.goals,
            ...updates,
          },
          current.profile
        );
        set({ goals: nextGoals });
      },

      setNutritionAIReportPrompt: (prompt) => {
        set({ nutritionAIReportPrompt: prompt });
      },

      getNutritionBackupData: () => {
        const s = get();
        return {
          customFoods: s.customFoods,
          foodLogs: s.foodLogs,
          waterByDate: s.waterByDate,
          savedMeals: s.savedMeals,
          profile: s.profile,
          goals: s.goals,
        };
      },

      clearNutritionData: () => {
        set({
          customFoods: [],
          cachedOnlineFoods: [],
          recentFoodIds: [],
          foodLogs: [],
          waterByDate: {},
          savedMeals: [],
          profile: INITIAL_NUTRITION_PROFILE,
          goals: INITIAL_NUTRITION_GOALS,
          nutritionAIReportPrompt: undefined,
        });
      },

      restoreNutritionData: (data, mode) => {
        if (!data) return;
        const current = get();
        const incomingCustomFoods = Array.isArray(data.customFoods)
          ? data.customFoods
          : [];
        const incomingFoodLogs = Array.isArray(data.foodLogs)
          ? data.foodLogs
          : [];
        const incomingSavedMeals = Array.isArray(data.savedMeals)
          ? data.savedMeals
          : [];
        const incomingWater =
          data.waterByDate && typeof data.waterByDate === 'object'
            ? data.waterByDate
            : {};

        if (mode === 'replace') {
          const nextProfile = resolveNutritionProfile(data.profile);
          const nextGoals = resolveNutritionGoals(data.goals, nextProfile);
          set({
            customFoods: incomingCustomFoods,
            foodLogs: incomingFoodLogs,
            waterByDate: { ...incomingWater },
            savedMeals: incomingSavedMeals,
            profile: nextProfile,
            goals: nextGoals,
          });
        } else {
          const mergedWater: Record<string, number> = { ...current.waterByDate };
          for (const [dateKey, ml] of Object.entries(incomingWater)) {
            if (mergedWater[dateKey] === undefined && typeof ml === 'number') {
              mergedWater[dateKey] = Math.max(0, Math.round(ml));
            }
          }
          set({
            customFoods: mergeById(current.customFoods, incomingCustomFoods),
            foodLogs: mergeById(current.foodLogs, incomingFoodLogs),
            savedMeals: mergeById(current.savedMeals, incomingSavedMeals),
            waterByDate: mergedWater,
          });
        }
      },
    }),
    {
      name: 'ironpulse-nutrition-v1',
      partialize: (state) => ({
        customFoods: state.customFoods,
        cachedOnlineFoods: state.cachedOnlineFoods.slice(
          0,
          MAX_CACHED_ONLINE_FOODS
        ),
        recentFoodIds: state.recentFoodIds.slice(0, MAX_RECENT_FOOD_IDS),
        foodLogs: state.foodLogs,
        waterByDate: state.waterByDate,
        savedMeals: state.savedMeals,
        profile: state.profile,
        goals: state.goals,
        nutritionAIReportPrompt: state.nutritionAIReportPrompt,
      }),
      merge: (persistedState, currentState) => {
        const persisted =
          (persistedState as Partial<NutritionStoreState>) || {};
        const profile = resolveNutritionProfile(persisted.profile);
        const goals = resolveNutritionGoals(persisted.goals, profile);
        return {
          ...currentState,
          ...persisted,
          customFoods: Array.isArray(persisted.customFoods)
            ? persisted.customFoods
            : [],
          cachedOnlineFoods: Array.isArray(persisted.cachedOnlineFoods)
            ? persisted.cachedOnlineFoods.slice(0, MAX_CACHED_ONLINE_FOODS)
            : [],
          recentFoodIds: Array.isArray(persisted.recentFoodIds)
            ? persisted.recentFoodIds.slice(0, MAX_RECENT_FOOD_IDS)
            : [],
          foodLogs: Array.isArray(persisted.foodLogs) ? persisted.foodLogs : [],
          waterByDate:
            persisted.waterByDate && typeof persisted.waterByDate === 'object'
              ? persisted.waterByDate
              : {},
          savedMeals: Array.isArray(persisted.savedMeals)
            ? persisted.savedMeals
            : [],
          profile,
          goals,
        };
      },
    }
  )
);
