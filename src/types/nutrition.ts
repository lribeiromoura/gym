export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export const MEAL_SLOTS_ORDER: MealSlot[] = [
  'breakfast',
  'lunch',
  'dinner',
  'snacks',
];

export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Café da Manhã',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snacks: 'Lanches',
};

export type FoodCategory =
  | 'proteinas'
  | 'carboidratos'
  | 'frutas_vegetais'
  | 'laticinios'
  | 'gorduras'
  | 'suplementos'
  | 'bebidas'
  | 'industrializados'
  | 'outros';

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  proteinas: 'Proteínas',
  carboidratos: 'Carboidratos',
  frutas_vegetais: 'Frutas & Vegetais',
  laticinios: 'Laticínios',
  gorduras: 'Gorduras & Oleaginosas',
  suplementos: 'Suplementos',
  bebidas: 'Bebidas',
  industrializados: 'Industrializados',
  outros: 'Outros',
};

export type FoodUnit = 'g' | 'ml' | 'un' | 'colher' | 'xicara' | 'scoop';

export const FOOD_UNIT_LABELS: Record<FoodUnit, string> = {
  g: 'g',
  ml: 'ml',
  un: 'unidade',
  colher: 'colher',
  xicara: 'xícara',
  scoop: 'scoop',
};

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  source: 'taco' | 'openfoodfacts' | 'custom';
  category: FoodCategory;
  // Valores nutricionais normalizados por 100g (ou 100ml)
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fiberPer100?: number;
  sodiumMgPer100?: number;
  // Medida prática opcional (ex: 1 unidade = 50g, 1 scoop = 30g)
  defaultUnit: FoodUnit;
  gramsPerUnit?: number;
  unitLabel?: string; // Ex: "unidade (50g)", "scoop (30g)", "colher de sopa (13g)"
}

export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD (data local)
  mealSlot: MealSlot;
  foodId: string;
  foodName: string;
  foodBrand?: string;
  quantity: number; // Quantidade digitada pelo usuário (em gramas/ml ou em unidades práticas)
  measureMode: 'grams' | 'unit';
  unitLabel?: string;
  totalGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sodiumMg?: number;
  createdAt: string;
}

export interface SavedMealItem {
  foodId: string;
  foodName: string;
  foodBrand?: string;
  quantity: number;
  measureMode: 'grams' | 'unit';
  unitLabel?: string;
  totalGrams: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sodiumMg?: number;
}

export interface SavedMeal {
  id: string;
  name: string;
  defaultMealSlot?: MealSlot;
  items: SavedMealItem[];
  updatedAt: string;
}

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export const ACTIVITY_LEVEL_META: Record<
  ActivityLevel,
  { label: string; description: string; multiplier: number }
> = {
  sedentary: {
    label: 'Sedentário',
    description: 'Trabalho sentado, pouco ou nenhum exercício',
    multiplier: 1.2,
  },
  light: {
    label: 'Levemente Ativo',
    description: 'Exercício leve 1–3 dias/semana',
    multiplier: 1.375,
  },
  moderate: {
    label: 'Moderadamente Ativo',
    description: 'Treino moderado 3–5 dias/semana',
    multiplier: 1.55,
  },
  active: {
    label: 'Muito Ativo',
    description: 'Treino intenso 6–7 dias/semana',
    multiplier: 1.725,
  },
  very_active: {
    label: 'Extremamente Ativo',
    description: 'Treino intenso 2x/dia ou trabalho físico pesado',
    multiplier: 1.9,
  },
};

export type NutritionGoalType =
  | 'cut_aggressive'
  | 'cut'
  | 'maintain'
  | 'bulk_lean'
  | 'bulk';

export const NUTRITION_GOAL_META: Record<
  NutritionGoalType,
  {
    label: string;
    shortLabel: string;
    description: string;
    calorieFactor: number;
    proteinPerKg: number;
    fatPerKg: number;
  }
> = {
  cut_aggressive: {
    label: 'Cutting Agressivo (-22%)',
    shortLabel: 'Cutting Agressivo',
    description: 'Déficit acentuado com proteína elevada para preservar massa magra',
    calorieFactor: 0.78,
    proteinPerKg: 2.2,
    fatPerKg: 0.7,
  },
  cut: {
    label: 'Cutting Moderado (-15%)',
    shortLabel: 'Cutting',
    description: 'Perda de gordura sustentável mantendo performance nos treinos',
    calorieFactor: 0.85,
    proteinPerKg: 2.1,
    fatPerKg: 0.8,
  },
  maintain: {
    label: 'Manutenção (0%)',
    shortLabel: 'Manutenção',
    description: 'Equilíbrio calórico para recomposição corporal ou consolidação',
    calorieFactor: 1.0,
    proteinPerKg: 1.8,
    fatPerKg: 0.9,
  },
  bulk_lean: {
    label: 'Bulking Limpo (+10%)',
    shortLabel: 'Bulking Limpo',
    description: 'Superávit controlado para ganho de massa muscular com mínimo de gordura',
    calorieFactor: 1.1,
    proteinPerKg: 2.0,
    fatPerKg: 0.9,
  },
  bulk: {
    label: 'Bulking (+18%)',
    shortLabel: 'Bulking',
    description: 'Superávit expressivo para máxima hipertrofia e ganho de peso',
    calorieFactor: 1.18,
    proteinPerKg: 1.9,
    fatPerKg: 1.0,
  },
};

export interface NutritionProfile {
  sex: 'male' | 'female';
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goalType: NutritionGoalType;
}

export interface NutritionGoals {
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  targetFiberG: number;
  targetWaterMl: number;
  includeWorkoutCalories: boolean;
  customOverride: boolean;
}

export interface NutritionBackupData {
  customFoods: FoodItem[];
  foodLogs: FoodLogEntry[];
  waterByDate: Record<string, number>;
  savedMeals: SavedMeal[];
  profile: NutritionProfile;
  goals: NutritionGoals;
}
