import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  calculateBMR,
  calculateDailyNutritionSummary,
  calculateFoodEntryMacros,
  calculateRecommendedGoals,
  calculateTDEE,
  calculateWeeklyNutritionStats,
  estimateWorkoutCaloriesBurned,
  shiftLocalDateString,
} from './nutrition-calculations';
import {
  convertOpenFoodFactsProduct,
  fetchOpenFoodFactsByBarcode,
  normalizeBarcode,
} from './openfoodfacts';
import {
  BACKUP_SCHEMA_VERSION,
  createBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
} from './backup';
import {
  DEFAULT_NUTRITION_AI_REPORT_PROMPT,
  generateNutritionAIReport,
  generateWorkoutAIReport,
} from './ai-report';
import { FOODS_SEED_BR } from '@/data/foods-seed-br';
import { INITIAL_EXERCISES, INITIAL_USER_SETTINGS } from '@/data/initial-data';
import { useNutritionStore } from '@/store/useNutritionStore';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { NutritionProfile } from '@/types/nutrition';
import { WorkoutSession } from '@/types/workout';
import { NutritionView } from '@/components/nutrition/NutritionView';
import { FoodSearchModal } from '@/components/nutrition/FoodSearchModal';
import { BarcodeScannerModal } from '@/components/nutrition/BarcodeScannerModal';
import { NutritionGoalsModal } from '@/components/nutrition/NutritionGoalsModal';
import { SavedMealsModal } from '@/components/nutrition/SavedMealsModal';
import { NutritionAIReportModal } from '@/components/nutrition/NutritionAIReportModal';
import IronPulseAppPage from '@/app/page';

const SAMPLE_SESSION: WorkoutSession = {
  id: 'sess-nut-1',
  title: 'Treino A — Upper',
  startTime: '2026-11-20T18:00:00',
  endTime: '2026-11-20T19:00:00',
  durationSeconds: 3600,
  description: 'Ótima energia',
  totalVolumeKg: 4200,
  totalSets: 12,
  prCount: 1,
  exercises: [
    {
      id: 'we-1',
      exerciseId: 'ex-bench-press-barbell',
      supersetId: null,
      restTimerSeconds: 90,
      notes: '',
      sets: [
        {
          id: 's1',
          type: 'normal',
          weightKg: 100,
          reps: 8,
          completed: true,
        },
      ],
    },
  ],
};

describe('Módulo de Nutrição IronPulse', () => {
  it('calcula TMB (Mifflin-St Jeor), TDEE e metas recomendadas por objetivo para homem e mulher', () => {
    const maleProfile: NutritionProfile = {
      sex: 'male',
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: 'moderate',
      goalType: 'maintain',
    };
    // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    expect(calculateBMR(maleProfile)).toBe(1780);
    // 1780 * 1.55 = 2759
    expect(calculateTDEE(maleProfile)).toBe(2759);

    const femaleProfile: NutritionProfile = {
      sex: 'female',
      age: 28,
      heightCm: 165,
      weightKg: 60,
      activityLevel: 'light',
      goalType: 'cut',
    };
    // 10*60 + 6.25*165 - 5*28 - 161 = 600 + 1031.25 - 140 - 161 = 1330.25 -> 1330
    expect(calculateBMR(femaleProfile)).toBe(1330);
    // 1330 * 1.375 = 1828.75 -> 1829
    expect(calculateTDEE(femaleProfile)).toBe(1829);

    const cutGoals = calculateRecommendedGoals({
      ...maleProfile,
      goalType: 'cut',
    });
    const maintainGoals = calculateRecommendedGoals({
      ...maleProfile,
      goalType: 'maintain',
    });
    const bulkGoals = calculateRecommendedGoals({
      ...maleProfile,
      goalType: 'bulk',
    });

    // Cutting < Manutenção < Bulking
    expect(cutGoals.targetCalories).toBe(Math.round(2759 * 0.85));
    expect(maintainGoals.targetCalories).toBe(2759);
    expect(bulkGoals.targetCalories).toBe(Math.round(2759 * 1.18));

    // Proteína baseada em evidências (1.8-2.2 g/kg) e água (35 ml/kg arredondado para 250 ml)
    expect(cutGoals.targetProteinG).toBe(Math.round(80 * 2.1));
    expect(maintainGoals.targetWaterMl).toBe(2750); // 80 * 35 = 2800 -> arredondado para 2750 ml
    expect(cutGoals.includeWorkoutCalories).toBe(false);
    expect(cutGoals.customOverride).toBe(false);
  });

  it('calcula macros por porção em gramas e em unidades práticas (1 ovo = 50g, 1,5 scoop whey = 45g)', () => {
    const ovo = FOODS_SEED_BR.find((f) => f.id === 'taco-ovo-inteiro')!;
    const whey = FOODS_SEED_BR.find((f) => f.id === 'taco-whey-concentrado')!;
    const frango = FOODS_SEED_BR.find(
      (f) => f.id === 'taco-peito-frango-grelhado'
    )!;

    expect(ovo).toBeDefined();
    expect(whey).toBeDefined();
    expect(frango).toBeDefined();

    // 1 ovo (50g): metade dos valores de 100g
    const oneEgg = calculateFoodEntryMacros(ovo, 1, 'unit');
    expect(oneEgg.totalGrams).toBe(50);
    expect(oneEgg.calories).toBe(73);
    expect(oneEgg.proteinG).toBe(6.7);

    // 1,5 scoop whey (45g)
    const wheyPortion = calculateFoodEntryMacros(whey, 1.5, 'unit');
    expect(wheyPortion.totalGrams).toBe(45);
    expect(wheyPortion.calories).toBe(180); // 400 * 0.45
    expect(wheyPortion.proteinG).toBe(34.7); // 77 * 0.45 = 34.65 -> 34.7

    // 150g peito de frango grelhado
    const chicken150 = calculateFoodEntryMacros(frango, 150, 'grams');
    expect(chicken150.totalGrams).toBe(150);
    expect(chicken150.calories).toBe(239); // 159 * 1.5 = 238.5 -> 239
    expect(chicken150.proteinG).toBe(48);
  });

  it('catálogo offline TACO/TBCA possui ~90+ alimentos válidos sem IDs duplicados', () => {
    expect(FOODS_SEED_BR.length).toBeGreaterThanOrEqual(90);
    const ids = new Set(FOODS_SEED_BR.map((f) => f.id));
    expect(ids.size).toBe(FOODS_SEED_BR.length);
    for (const food of FOODS_SEED_BR) {
      expect(food.name.trim().length).toBeGreaterThan(0);
      expect(food.caloriesPer100).toBeGreaterThanOrEqual(0);
      expect(food.proteinPer100).toBeGreaterThanOrEqual(0);
      expect(food.carbsPer100).toBeGreaterThanOrEqual(0);
      expect(food.fatPer100).toBeGreaterThanOrEqual(0);
    }
  });

  it('calcula resumo diário com/sem calorias de treino e aderência semanal (7 dias)', () => {
    const goals = {
      targetCalories: 2000,
      targetProteinG: 160,
      targetCarbsG: 200,
      targetFatG: 62,
      targetFiberG: 28,
      targetWaterMl: 2500,
      includeWorkoutCalories: false,
      customOverride: false,
    };

    const workoutKcal = estimateWorkoutCaloriesBurned([SAMPLE_SESSION], 80);
    // 5 METs * 80kg * 1h = 400 kcal
    expect(workoutKcal).toBe(400);

    const entries = [
      {
        id: 'l1',
        date: '2026-11-20',
        mealSlot: 'breakfast' as const,
        foodId: 'taco-ovo-inteiro',
        foodName: 'Ovo inteiro',
        quantity: 3,
        measureMode: 'unit' as const,
        unitLabel: 'unidade (50g)',
        totalGrams: 150,
        calories: 219,
        proteinG: 20,
        carbsG: 0.9,
        fatG: 14.3,
        createdAt: '2026-11-20T08:00:00Z',
      },
      {
        id: 'l2',
        date: '2026-11-20',
        mealSlot: 'lunch' as const,
        foodId: 'taco-peito-frango-grelhado',
        foodName: 'Peito de frango',
        quantity: 200,
        measureMode: 'grams' as const,
        totalGrams: 200,
        calories: 318,
        proteinG: 64,
        carbsG: 0,
        fatG: 5,
        createdAt: '2026-11-20T12:30:00Z',
      },
      {
        id: 'l3',
        date: '2026-11-19',
        mealSlot: 'lunch' as const,
        foodId: 'taco-arroz-branco',
        foodName: 'Arroz branco',
        quantity: 1000,
        measureMode: 'grams' as const,
        totalGrams: 1000,
        calories: 1950,
        proteinG: 150,
        carbsG: 210,
        fatG: 55,
        createdAt: '2026-11-19T12:30:00Z',
      },
    ];

    // Sem calorias de treino somadas
    const summaryOff = calculateDailyNutritionSummary(
      '2026-11-20',
      entries,
      1500,
      goals,
      workoutKcal
    );
    expect(summaryOff.calories).toBe(537);
    expect(summaryOff.proteinG).toBe(84);
    expect(summaryOff.effectiveTargetCalories).toBe(2000);
    expect(summaryOff.remainingCalories).toBe(1463);
    expect(summaryOff.byMealSlot.breakfast.calories).toBe(219);
    expect(summaryOff.byMealSlot.lunch.calories).toBe(318);
    expect(summaryOff.adherencePct.water).toBe(60);

    // Com calorias de treino somadas
    const summaryOn = calculateDailyNutritionSummary(
      '2026-11-20',
      entries,
      1500,
      { ...goals, includeWorkoutCalories: true },
      workoutKcal
    );
    expect(summaryOn.effectiveTargetCalories).toBe(2400);
    expect(summaryOn.workoutBonusKcal).toBe(400);
    expect(summaryOn.remainingCalories).toBe(1863);

    // Aderência semanal (7 dias)
    const weekly = calculateWeeklyNutritionStats(
      '2026-11-20',
      entries,
      { '2026-11-19': 2500, '2026-11-20': 1500 },
      goals
    );
    expect(weekly.days.length).toBe(7);
    expect(weekly.loggedDaysCount).toBe(2);
    expect(weekly.daysWithinGoal).toBe(1); // 2026-11-19 (1950 kcal está dentro de ±10% de 2000)
    expect(weekly.avgCalories).toBe(Math.round((537 + 1950) / 2));
    expect(weekly.avgWaterMl).toBe(2000);
  });

  it('useNutritionStore gerencia diário, edição, copiar de ontem, combos, hidratação e alimentos personalizados', () => {
    const store = useNutritionStore.getState();
    store.clearNutritionData();

    const ovo = FOODS_SEED_BR.find((f) => f.id === 'taco-ovo-inteiro')!;
    const aveia = FOODS_SEED_BR.find((f) => f.id === 'taco-aveia-flocos')!;

    // 1. Lançar alimentos em ontem
    const yesterday = '2026-11-19';
    const today = shiftLocalDateString(yesterday, 1);
    expect(today).toBe('2026-11-20');

    const log1 = store.addFoodLog({
      date: yesterday,
      mealSlot: 'breakfast',
      food: ovo,
      quantity: 2,
      measureMode: 'unit',
    });
    store.addFoodLog({
      date: yesterday,
      mealSlot: 'breakfast',
      food: aveia,
      quantity: 40,
      measureMode: 'grams',
    });

    expect(useNutritionStore.getState().foodLogs.length).toBe(2);
    expect(useNutritionStore.getState().recentFoodIds[0]).toBe(aveia.id);

    // 2. Editar quantidade inline (2 ovos -> 4 ovos)
    store.updateFoodLogQuantity(log1.id, 4, 'unit');
    const updatedLog1 = useNutritionStore
      .getState()
      .foodLogs.find((l) => l.id === log1.id)!;
    expect(updatedLog1.totalGrams).toBe(200);
    expect(updatedLog1.calories).toBe(292);

    // 3. Copiar refeição de ontem para hoje
    const copiedCount = store.copyMealFromDate(yesterday, today, 'breakfast');
    expect(copiedCount).toBe(2);
    expect(
      useNutritionStore
        .getState()
        .foodLogs.filter((l) => l.date === today && l.mealSlot === 'breakfast')
        .length
    ).toBe(2);

    // 4. Salvar combo e lançar em outra refeição
    const savedMeal = store.saveMealFromSlot('Café Campeão', today, 'breakfast');
    expect(savedMeal).not.toBeNull();
    expect(savedMeal!.items.length).toBe(2);

    store.renameSavedMeal(savedMeal!.id, 'Café Proteico');
    expect(useNutritionStore.getState().savedMeals[0].name).toBe(
      'Café Proteico'
    );

    const loggedFromCombo = store.logSavedMeal(savedMeal!.id, today, 'snacks');
    expect(loggedFromCombo).toBe(2);
    expect(
      useNutritionStore
        .getState()
        .foodLogs.filter((l) => l.date === today && l.mealSlot === 'snacks')
        .length
    ).toBe(2);

    // 5. Hidratação (+250, +500, -250, sem ficar negativo)
    store.adjustWater(today, 250);
    store.adjustWater(today, 500);
    store.adjustWater(today, -250);
    expect(useNutritionStore.getState().waterByDate[today]).toBe(500);
    store.adjustWater(today, -1000);
    expect(useNutritionStore.getState().waterByDate[today]).toBe(0);

    // 6. Alimento personalizado + exclusão de log
    const custom = store.addCustomFood({
      name: 'Crepioca Fit Caseira',
      brand: 'Caseira',
      barcode: '7890000000011',
      category: 'carboidratos',
      caloriesPer100: 190,
      proteinPer100: 11,
      carbsPer100: 25,
      fatPer100: 5,
      defaultUnit: 'un',
      gramsPerUnit: 80,
      unitLabel: 'unidade (80g)',
    });
    expect(custom.source).toBe('custom');
    expect(useNutritionStore.getState().customFoods.length).toBe(1);

    store.deleteFoodLog(log1.id);
    expect(
      useNutritionStore.getState().foodLogs.some((l) => l.id === log1.id)
    ).toBe(false);

    // 7. Limite de cache online (teto de 200 itens)
    const manyOnline = Array.from({ length: 230 }, (_, i) => ({
      id: `off-test-${i}`,
      name: `Produto ${i}`,
      source: 'openfoodfacts' as const,
      category: 'industrializados' as const,
      caloriesPer100: 200,
      proteinPer100: 10,
      carbsPer100: 20,
      fatPer100: 5,
      defaultUnit: 'g' as const,
    }));
    store.cacheOnlineFoods(manyOnline);
    expect(useNutritionStore.getState().cachedOnlineFoods.length).toBe(200);
  });

  it('normaliza produtos da Open Food Facts (kJ → kcal, sal → sódio) e rejeita códigos inválidos', async () => {
    expect(normalizeBarcode('7891000100103')).toBe('7891000100103');
    expect(normalizeBarcode('789-1000-100103')).toBe('7891000100103');
    expect(normalizeBarcode('12345')).toBeNull();
    expect(normalizeBarcode('abc')).toBeNull();

    const invalidLookup = await fetchOpenFoodFactsByBarcode('123');
    expect(invalidLookup.food).toBeNull();
    expect(invalidLookup.invalidBarcode).toBe(true);

    // Conversão de kJ para kcal (1674 kJ / 4.184 ≈ 400 kcal) e sal → sódio (1g sal = 400mg Na)
    const convertedKj = convertOpenFoodFactsProduct({
      code: '7891000100103',
      product_name_pt: 'Leite Condensado Teste',
      brands: 'Nestlé, Brasil',
      categories_tags: ['en:dairies'],
      serving_quantity: 20,
      nutriments: {
        'energy-kj_100g': 1674,
        proteins_100g: 7.5,
        carbohydrates_100g: 55.2,
        fat_100g: 8.1,
        salt_100g: 1.0,
      },
    });

    expect(convertedKj).not.toBeNull();
    expect(convertedKj!.id).toBe('off-7891000100103');
    expect(convertedKj!.brand).toBe('Nestlé');
    expect(convertedKj!.category).toBe('laticinios');
    expect(convertedKj!.caloriesPer100).toBe(400);
    expect(convertedKj!.sodiumMgPer100).toBe(400);
    expect(convertedKj!.gramsPerUnit).toBe(20);
  });

  it('suporta retrocompatibilidade de backup v1 → v2, restauração e relatórios IA com nutrição', () => {
    // 1. Backup v1 legado continua válido sem nutrition
    const v1Json = JSON.stringify({
      app: 'ironpulse',
      schemaVersion: 1,
      exportedAt: '2026-10-01T12:00:00Z',
      includesPhotos: false,
      data: {
        exercises: [],
        folders: [],
        routines: [],
        workoutHistory: [SAMPLE_SESSION],
        measurements: [],
        progressPhotos: [],
        settings: INITIAL_USER_SETTINGS,
      },
    });
    const parsedV1 = parseBackup(v1Json);
    expect(parsedV1.ok).toBe(true);
    if (parsedV1.ok) {
      expect(parsedV1.file.schemaVersion).toBe(1);
      expect(parsedV1.file.data.nutrition).toBeUndefined();
      expect(summarizeBackup(parsedV1.file).foodLogs).toBe(0);
    }

    // 2. Backup v2 inclui nutrição completa (round-trip)
    const nutStore = useNutritionStore.getState();
    nutStore.clearNutritionData();
    nutStore.updateProfileAndRecalculate({
      sex: 'male',
      age: 30,
      heightCm: 180,
      weightKg: 82,
      activityLevel: 'active',
      goalType: 'cut',
    });
    const frango = FOODS_SEED_BR.find(
      (f) => f.id === 'taco-peito-frango-grelhado'
    )!;
    nutStore.addFoodLog({
      date: '2026-11-20',
      mealSlot: 'lunch',
      food: frango,
      quantity: 200,
      measureMode: 'grams',
    });
    nutStore.adjustWater('2026-11-20', 2000);
    nutStore.saveMealFromSlot('Almoço Frango', '2026-11-20', 'lunch');

    const backupFile = createBackup(
      {
        exercises: INITIAL_EXERCISES,
        folders: [],
        routines: [],
        workoutHistory: [SAMPLE_SESSION],
        measurements: [{ id: 'm1', date: '2026-11-20', weightKg: 82 }],
        progressPhotos: [],
        settings: INITIAL_USER_SETTINGS,
        nutrition: nutStore.getNutritionBackupData(),
      },
      {
        includePhotos: false,
        seedIds: new Set(INITIAL_EXERCISES.map((e) => e.id)),
      }
    );

    expect(backupFile.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(BACKUP_SCHEMA_VERSION).toBe(2);

    const parsedV2 = parseBackup(serializeBackup(backupFile));
    expect(parsedV2.ok).toBe(true);
    if (parsedV2.ok) {
      expect(summarizeBackup(parsedV2.file)).toMatchObject({
        workouts: 1,
        foodLogs: 1,
        savedMeals: 1,
      });
    }

    // 3. Relatório IA do Treino inclui bloco de Nutrição & Hidratação
    const nutState = useNutritionStore.getState();
    const workoutReport = generateWorkoutAIReport({
      session: SAMPLE_SESSION,
      workoutHistory: [SAMPLE_SESSION],
      exercises: INITIAL_EXERCISES,
      measurements: [{ id: 'm1', date: '2026-11-20', weightKg: 82 }],
      settings: INITIAL_USER_SETTINGS,
      nutrition: {
        foodLogs: nutState.foodLogs,
        waterByDate: nutState.waterByDate,
        goals: nutState.goals,
        profile: nutState.profile,
      },
    });
    expect(workoutReport).toContain(
      '## Nutrição & Hidratação (Dia do Treino + Média 7 Dias)'
    );
    expect(workoutReport).toContain('318 /');
    expect(workoutReport).toContain('2000 ml');

    // 4. Relatório Nutricional Dedicado
    const nutritionReport = generateNutritionAIReport({
      date: '2026-11-20',
      foodLogs: nutState.foodLogs,
      waterByDate: nutState.waterByDate,
      profile: nutState.profile,
      goals: nutState.goals,
      measurements: [{ id: 'm1', date: '2026-11-20', weightKg: 82 }],
      workoutHistory: [SAMPLE_SESSION],
      settings: INITIAL_USER_SETTINGS,
    });
    expect(nutritionReport).toContain(DEFAULT_NUTRITION_AI_REPORT_PROMPT);
    expect(nutritionReport).toContain('## Perfil & Metas Diárias (TMB / TDEE)');
    expect(nutritionReport).toContain('## Diário Alimentar por Refeição');
    expect(nutritionReport).toContain('Peito de frango grelhado (sem pele)');
    expect(nutritionReport).toContain('## Aderência dos Últimos 7 Dias');

    // 5. clearAllData limpa também a store de nutrição
    useWorkoutStore.getState().clearAllData();
    expect(useNutritionStore.getState().foodLogs.length).toBe(0);
    expect(useNutritionStore.getState().savedMeals.length).toBe(0);

    // 6. Ciclo completo: Restaurar (replace & merge) + Desfazer (undoLastRestore)
    const storageMap = new Map<string, string>();
    const originalStorage = (globalThis as { localStorage?: Storage })
      .localStorage;
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => storageMap.get(k) ?? null,
        setItem: (k: string, v: string) => {
          storageMap.set(k, v);
        },
        removeItem: (k: string) => {
          storageMap.delete(k);
        },
      },
    });

    try {
      // Restaura o backup v2 com 1 registro de frango, 2000ml água e 1 combo
      useWorkoutStore.getState().restoreBackup(backupFile.data, 'replace');
      expect(useNutritionStore.getState().foodLogs.length).toBe(1);
      expect(useNutritionStore.getState().waterByDate['2026-11-20']).toBe(2000);
      expect(useNutritionStore.getState().savedMeals.length).toBe(1);
      expect(useNutritionStore.getState().profile.weightKg).toBe(82);

      // Desfazer volta ao estado vazio anterior à restauração
      const undone = useWorkoutStore.getState().undoLastRestore();
      expect(undone).toBe(true);
      expect(useNutritionStore.getState().foodLogs.length).toBe(0);
      expect(useNutritionStore.getState().savedMeals.length).toBe(0);

      // Modo merge preserva itens locais e adiciona novos do backup sem duplicar
      useNutritionStore.getState().addFoodLog({
        date: '2026-11-21',
        mealSlot: 'breakfast',
        food: FOODS_SEED_BR.find((f) => f.id === 'taco-ovo-inteiro')!,
        quantity: 2,
        measureMode: 'unit',
      });
      useWorkoutStore.getState().restoreBackup(backupFile.data, 'merge');
      expect(useNutritionStore.getState().foodLogs.length).toBe(2);
      expect(useNutritionStore.getState().waterByDate['2026-11-20']).toBe(2000);
    } finally {
      if (originalStorage === undefined) {
        delete (globalThis as { localStorage?: Storage }).localStorage;
      } else {
        Object.defineProperty(globalThis, 'localStorage', {
          configurable: true,
          value: originalStorage,
        });
      }
    }
  });

  it('renderiza NutritionView, modais e barra de 5 abas sem erros de SSR', () => {
    const syncInitialStates = () => {
      Object.assign(
        useWorkoutStore.getInitialState(),
        useWorkoutStore.getState()
      );
      Object.assign(
        useNutritionStore.getInitialState(),
        useNutritionStore.getState()
      );
    };

    syncInitialStates();

    const appHtml = renderToStaticMarkup(React.createElement(IronPulseAppPage));
    expect(appHtml).toContain('grid-cols-5');
    expect(appHtml).toContain('Nutrição');

    const nutritionHtml = renderToStaticMarkup(
      React.createElement(NutritionView)
    );
    expect(nutritionHtml).toContain('Café da Manhã');
    expect(nutritionHtml).toContain('Almoço');
    expect(nutritionHtml).toContain('Jantar');
    expect(nutritionHtml).toContain('Lanches');
    expect(nutritionHtml).toContain('Hidratação');
    expect(nutritionHtml).toContain('Calorias dos Últimos 7 Dias');
    expect(nutritionHtml).not.toContain('fill="#0F172A"');

    const searchHtml = renderToStaticMarkup(
      React.createElement(FoodSearchModal, {
        isOpen: true,
        date: '2026-11-20',
        mealSlot: 'lunch',
        onClose: () => {},
        onOpenBarcodeScanner: () => {},
      })
    );
    expect(searchHtml).toContain('Adicionar em Almoço');
    expect(searchHtml).toContain('Peito de frango grelhado');

    const scannerHtml = renderToStaticMarkup(
      React.createElement(BarcodeScannerModal, {
        isOpen: true,
        onClose: () => {},
        onFoodFound: () => {},
        onCreateCustomWithBarcode: () => {},
      })
    );
    expect(scannerHtml).toContain('Ler Código de Barras');
    expect(scannerHtml).toContain('7891000100103');

    const goalsHtml = renderToStaticMarkup(
      React.createElement(NutritionGoalsModal, {
        isOpen: true,
        onClose: () => {},
      })
    );
    expect(goalsHtml).toContain('Calculadora TMB / TDEE &amp; Metas');
    expect(goalsHtml).toContain('TMB Basal');

    const savedHtml = renderToStaticMarkup(
      React.createElement(SavedMealsModal, {
        isOpen: true,
        date: '2026-11-20',
        onClose: () => {},
      })
    );
    expect(savedHtml).toContain('Refeições Salvas &amp; Combos');

    const aiModalHtml = renderToStaticMarkup(
      React.createElement(NutritionAIReportModal, {
        isOpen: true,
        date: '2026-11-20',
        onClose: () => {},
      })
    );
    expect(aiModalHtml).toContain('Relatório Nutricional para IA');
    expect(aiModalHtml).toContain('Copiar Relatório');
  });
});
