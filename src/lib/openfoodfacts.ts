import { FoodCategory, FoodItem, FoodUnit } from '@/types/nutrition';

const SEARCH_API_BASE = 'https://br.openfoodfacts.org/cgi/search.pl';
const PRODUCT_API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const REQUEST_TIMEOUT_MS = 6000;

export interface OpenFoodFactsNutriments {
  'energy-kcal_100g'?: number | string;
  'energy-kcal'?: number | string;
  'energy-kj_100g'?: number | string;
  energy_100g?: number | string;
  proteins_100g?: number | string;
  carbohydrates_100g?: number | string;
  fat_100g?: number | string;
  fiber_100g?: number | string;
  sodium_100g?: number | string;
  salt_100g?: number | string;
}

export interface OpenFoodFactsRawProduct {
  code?: string;
  id?: string;
  product_name_pt?: string;
  product_name?: string;
  generic_name_pt?: string;
  generic_name?: string;
  brands?: string;
  categories?: string;
  categories_tags?: string[];
  serving_size?: string;
  serving_quantity?: number | string;
  quantity?: string;
  nutriments?: OpenFoodFactsNutriments;
}

const toPositiveNumber = (val: unknown): number | undefined => {
  if (val === null || val === undefined || val === '') return undefined;
  const num = Number(val);
  if (!Number.isFinite(num) || num < 0) return undefined;
  return num;
};

const round1 = (val: number): number => Math.round(val * 10) / 10;

/**
 * Valida e normaliza códigos de barras (EAN-8, UPC-A, EAN-13, GTIN-14: 8 a 14 dígitos).
 */
export function normalizeBarcode(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 14) {
    return null;
  }
  return digits;
}

function inferCategory(raw: OpenFoodFactsRawProduct, name: string): FoodCategory {
  const haystack = [
    name,
    raw.categories || '',
    ...(raw.categories_tags || []),
  ]
    .join(' ')
    .toLowerCase();

  if (
    haystack.includes('whey') ||
    haystack.includes('protein') ||
    haystack.includes('suplement') ||
    haystack.includes('creatin') ||
    haystack.includes('barras de prote')
  ) {
    return 'suplementos';
  }
  if (
    haystack.includes('beverages') ||
    haystack.includes('bebidas') ||
    haystack.includes('suco') ||
    haystack.includes('refrigerante') ||
    haystack.includes('água') ||
    haystack.includes('agua') ||
    haystack.includes('café') ||
    haystack.includes('cafe') ||
    haystack.includes('chá') ||
    haystack.includes('juice') ||
    haystack.includes('drink')
  ) {
    return 'bebidas';
  }
  if (
    haystack.includes('dairies') ||
    haystack.includes('latic') ||
    haystack.includes('leite') ||
    haystack.includes('milk') ||
    haystack.includes('yogurt') ||
    haystack.includes('iogurte') ||
    haystack.includes('queijo') ||
    haystack.includes('cheese') ||
    haystack.includes('requeij')
  ) {
    return 'laticinios';
  }
  if (
    haystack.includes('meat') ||
    haystack.includes('carne') ||
    haystack.includes('frango') ||
    haystack.includes('chicken') ||
    haystack.includes('fish') ||
    haystack.includes('peixe') ||
    haystack.includes('atum') ||
    haystack.includes('egg') ||
    haystack.includes('ovo')
  ) {
    return 'proteinas';
  }
  if (
    haystack.includes('olive') ||
    haystack.includes('azeite') ||
    haystack.includes('amendoim') ||
    haystack.includes('peanut') ||
    haystack.includes('castanha') ||
    haystack.includes('nuts') ||
    haystack.includes('manteiga') ||
    haystack.includes('butter') ||
    haystack.includes('oil')
  ) {
    return 'gorduras';
  }
  if (
    haystack.includes('fruit') ||
    haystack.includes('fruta') ||
    haystack.includes('vegeta') ||
    haystack.includes('legume') ||
    haystack.includes('verdura')
  ) {
    return 'frutas_vegetais';
  }
  if (
    haystack.includes('bread') ||
    haystack.includes('pão') ||
    haystack.includes('pao') ||
    haystack.includes('arroz') ||
    haystack.includes('rice') ||
    haystack.includes('pasta') ||
    haystack.includes('macarr') ||
    haystack.includes('aveia') ||
    haystack.includes('oat') ||
    haystack.includes('cereal') ||
    haystack.includes('granola') ||
    haystack.includes('tapioca')
  ) {
    return 'carboidratos';
  }
  return 'industrializados';
}

/**
 * Converte um produto retornado pela Open Food Facts em `FoodItem` normalizado por 100g/100ml.
 * Converte kJ → kcal automaticamente quando `energy-kcal_100g` não estiver presente.
 */
export function convertOpenFoodFactsProduct(
  raw: OpenFoodFactsRawProduct
): FoodItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const name = (
    raw.product_name_pt ||
    raw.product_name ||
    raw.generic_name_pt ||
    raw.generic_name ||
    ''
  )
    .trim()
    .replace(/\s+/g, ' ');

  if (!name) return null;

  const nutriments = raw.nutriments || {};
  const kcalDirect =
    toPositiveNumber(nutriments['energy-kcal_100g']) ??
    toPositiveNumber(nutriments['energy-kcal']);
  const kjVal =
    toPositiveNumber(nutriments['energy-kj_100g']) ??
    toPositiveNumber(nutriments.energy_100g);

  const protein = toPositiveNumber(nutriments.proteins_100g) ?? 0;
  const carbs = toPositiveNumber(nutriments.carbohydrates_100g) ?? 0;
  const fat = toPositiveNumber(nutriments.fat_100g) ?? 0;
  const fiber = toPositiveNumber(nutriments.fiber_100g);

  const sodiumG = toPositiveNumber(nutriments.sodium_100g);
  const saltG = toPositiveNumber(nutriments.salt_100g);
  const sodiumMg =
    sodiumG !== undefined
      ? Math.round(sodiumG * 1000)
      : saltG !== undefined
        ? Math.round((saltG / 2.5) * 1000)
        : undefined;

  let calories: number;
  if (kcalDirect !== undefined) {
    calories = Math.round(kcalDirect);
  } else if (kjVal !== undefined) {
    calories = Math.round(kjVal / 4.184);
  } else {
    // Fallback pela soma dos macronutrientes caso a energia esteja omissa
    const estimated = Math.round(protein * 4 + carbs * 4 + fat * 9);
    if (estimated <= 0 && protein === 0 && carbs === 0 && fat === 0) {
      return null;
    }
    calories = estimated;
  }

  const barcode = normalizeBarcode(String(raw.code || raw.id || '')) ?? undefined;
  const brand = raw.brands?.split(',')[0]?.trim() || undefined;
  const category = inferCategory(raw, name);

  const quantityStr = `${raw.quantity || ''} ${raw.serving_size || ''}`.toLowerCase();
  const isLiquid =
    category === 'bebidas' ||
    /\b\d+\s*(ml|l)\b/.test(quantityStr);
  const defaultUnit: FoodUnit = isLiquid ? 'ml' : 'g';

  const servingQty = toPositiveNumber(raw.serving_quantity);
  const hasServing = servingQty !== undefined && servingQty >= 3 && servingQty <= 1000;
  const unitSuffix = isLiquid ? 'ml' : 'g';
  const unitLabel = hasServing
    ? `porção (${Math.round(servingQty)}${unitSuffix})`
    : undefined;

  const cleanId = barcode
    ? `off-${barcode}`
    : `off-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 40)}-${calories}`;

  return {
    id: cleanId,
    name,
    ...(brand ? { brand } : {}),
    ...(barcode ? { barcode } : {}),
    source: 'openfoodfacts',
    category,
    caloriesPer100: calories,
    proteinPer100: round1(protein),
    carbsPer100: round1(carbs),
    fatPer100: round1(fat),
    ...(fiber !== undefined ? { fiberPer100: round1(fiber) } : {}),
    ...(sodiumMg !== undefined ? { sodiumMgPer100: sodiumMg } : {}),
    defaultUnit,
    ...(hasServing ? { gramsPerUnit: Math.round(servingQty) } : {}),
    ...(unitLabel ? { unitLabel } : {}),
  };
}

async function fetchWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

const FIELDS =
  'code,product_name_pt,product_name,generic_name_pt,generic_name,brands,categories,categories_tags,serving_size,serving_quantity,quantity,nutriments';

/**
 * Busca alimentos na base Open Food Facts Brasil via proxy same-origin (/api/foods/search)
 * evitando erros de CORS no navegador e com fallback gracioso para modo offline.
 */
export async function searchOpenFoodFactsWithStatus(
  query: string
): Promise<{ foods: FoodItem[]; isOffline: boolean }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { foods: [], isOffline: true };
  }
  const clean = query.trim();
  if (clean.length < 2) {
    return { foods: [], isOffline: false };
  }

  try {
    const isBrowser = typeof window !== 'undefined';
    const url = isBrowser
      ? `/api/foods/search?q=${encodeURIComponent(clean)}`
      : `${SEARCH_API_BASE}?${new URLSearchParams({
          search_terms: clean,
          search_simple: '1',
          action: 'process',
          json: '1',
          page_size: '20',
          fields: FIELDS,
        }).toString()}`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      return { foods: [], isOffline: true };
    }
    const json = await res.json();
    if (json?.isOffline === true) {
      return { foods: [], isOffline: true };
    }
    const rawProducts = Array.isArray(json?.products) ? json.products : [];
    const seen = new Set<string>();
    const foods: FoodItem[] = [];

    for (const raw of rawProducts) {
      const converted = convertOpenFoodFactsProduct(raw as OpenFoodFactsRawProduct);
      if (converted && !seen.has(converted.id)) {
        seen.add(converted.id);
        foods.push(converted);
      }
    }

    return { foods, isOffline: false };
  } catch {
    return { foods: [], isOffline: true };
  }
}

/**
 * Consulta um produto específico pelo código de barras (EAN-13 / EAN-8 / UPC-A)
 * na API Open Food Facts v2.
 */
export async function fetchOpenFoodFactsByBarcode(
  barcode: string
): Promise<{ food: FoodItem | null; isOffline: boolean; invalidBarcode?: boolean }> {
  const normalized = normalizeBarcode(barcode);
  if (!normalized) {
    return { food: null, isOffline: false, invalidBarcode: true };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { food: null, isOffline: true };
  }

  try {
    const url = `${PRODUCT_API_BASE}/${encodeURIComponent(normalized)}.json?fields=${encodeURIComponent(FIELDS)}`;
    const res = await fetchWithTimeout(url);
    if (res.status === 404) {
      return { food: null, isOffline: false };
    }
    if (!res.ok) {
      return { food: null, isOffline: true };
    }
    const json = await res.json();
    if (json?.status !== 1 || !json?.product) {
      return { food: null, isOffline: false };
    }
    const product = convertOpenFoodFactsProduct({
      ...(json.product as OpenFoodFactsRawProduct),
      code: json.code || normalized,
    });
    return { food: product, isOffline: false };
  } catch {
    return { food: null, isOffline: true };
  }
}
