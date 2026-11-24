'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  Check,
  Clock,
  Globe,
  Loader2,
  Plus,
  ScanBarcode,
  Search,
  Sparkles,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import {
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  FoodItem,
  FoodUnit,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
  MealSlot,
  SavedMeal,
} from '@/types/nutrition';
import { FOODS_SEED_BR } from '@/data/foods-seed-br';
import { useNutritionStore } from '@/store/useNutritionStore';
import { calculateFoodEntryMacros } from '@/lib/nutrition-calculations';
import { searchOpenFoodFactsWithStatus } from '@/lib/openfoodfacts';
import { DecimalInput } from '@/components/ui/NumericInputs';

interface FoodSearchModalProps {
  isOpen: boolean;
  date: string;
  mealSlot: MealSlot;
  initialFood?: FoodItem | null;
  initialCreateBarcode?: string | null;
  onClose: () => void;
  onOpenBarcodeScanner: () => void;
  onAdded?: (label: string) => void;
}

type SearchTab = 'search' | 'recent' | 'custom' | 'saved';
type ModalStep = 'browse' | 'portion' | 'create';

const CATEGORY_LIST: (FoodCategory | 'all')[] = [
  'all',
  'proteinas',
  'carboidratos',
  'frutas_vegetais',
  'laticinios',
  'gorduras',
  'suplementos',
  'bebidas',
  'industrializados',
];

const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

export function FoodSearchModal({
  isOpen,
  date,
  mealSlot,
  initialFood = null,
  initialCreateBarcode = null,
  onClose,
  onOpenBarcodeScanner,
  onAdded,
}: FoodSearchModalProps) {
  const customFoods = useNutritionStore((s) => s.customFoods);
  const cachedOnlineFoods = useNutritionStore((s) => s.cachedOnlineFoods);
  const recentFoodIds = useNutritionStore((s) => s.recentFoodIds);
  const savedMeals = useNutritionStore((s) => s.savedMeals);
  const addFoodLog = useNutritionStore((s) => s.addFoodLog);
  const addCustomFood = useNutritionStore((s) => s.addCustomFood);
  const deleteCustomFood = useNutritionStore((s) => s.deleteCustomFood);
  const cacheOnlineFoods = useNutritionStore((s) => s.cacheOnlineFoods);
  const logSavedMeal = useNutritionStore((s) => s.logSavedMeal);

  const [activeTab, setActiveTab] = useState<SearchTab>('search');
  const [step, setStep] = useState<ModalStep>('browse');
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(mealSlot);

  // Busca
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    FoodCategory | 'all'
  >('all');
  const [onlineResults, setOnlineResults] = useState<FoodItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Porção
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [measureMode, setMeasureMode] = useState<'grams' | 'unit'>('grams');
  const [quantity, setQuantity] = useState<number | null>(100);

  // Cadastro personalizado
  const [cName, setCName] = useState('');
  const [cBrand, setCBrand] = useState('');
  const [cBarcode, setCBarcode] = useState('');
  const [cCategory, setCCategory] = useState<FoodCategory>('outros');
  const [cUnit, setCUnit] = useState<'g' | 'ml'>('g');
  const [cKcal, setCKcal] = useState<number | null>(null);
  const [cProtein, setCProtein] = useState<number | null>(null);
  const [cCarbs, setCCarbs] = useState<number | null>(null);
  const [cFat, setCFat] = useState<number | null>(null);
  const [cFiber, setCFiber] = useState<number | null>(null);
  const [cGramsPerUnit, setCGramsPerUnit] = useState<number | null>(null);
  const [cUnitLabel, setCUnitLabel] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const openPortionForFood = (food: FoodItem) => {
    setSelectedFood(food);
    const hasPracticalUnit = Boolean(
      food.gramsPerUnit && food.gramsPerUnit > 0 && food.unitLabel
    );
    const preferUnit =
      hasPracticalUnit &&
      food.defaultUnit !== 'g' &&
      food.defaultUnit !== 'ml';
    setMeasureMode(preferUnit ? 'unit' : 'grams');
    setQuantity(preferUnit ? 1 : 100);
    setStep('portion');
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedSlot(mealSlot);
    setCreateError(null);

    if (initialFood) {
      openPortionForFood(initialFood);
      return;
    }

    if (initialCreateBarcode) {
      setCName('');
      setCBrand('');
      setCBarcode(initialCreateBarcode);
      setCCategory('industrializados');
      setCUnit('g');
      setCKcal(null);
      setCProtein(null);
      setCCarbs(null);
      setCFat(null);
      setCFiber(null);
      setCGramsPerUnit(null);
      setCUnitLabel('');
      setStep('create');
      return;
    }

    setStep('browse');
    setSelectedFood(null);
  }, [isOpen, mealSlot, initialFood, initialCreateBarcode]);

  // Monitora conectividade
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncStatus = () => setIsOffline(!navigator.onLine);
    syncStatus();
    window.addEventListener('online', syncStatus);
    window.addEventListener('offline', syncStatus);
    return () => {
      window.removeEventListener('online', syncStatus);
      window.removeEventListener('offline', syncStatus);
    };
  }, []);

  // Busca debounced (400ms) na Open Food Facts
  useEffect(() => {
    if (!isOpen || activeTab !== 'search' || step !== 'browse') return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    let cancelled = false;
    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      const { foods, isOffline: offline } =
        await searchOpenFoodFactsWithStatus(trimmed);
      if (!cancelled) {
        setIsOffline(offline);
        setOnlineResults(foods);
        if (foods.length > 0) {
          cacheOnlineFoods(foods);
        }
        setIsSearchingOnline(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen, activeTab, step, cacheOnlineFoods]);

  const allLocalFoods = useMemo(() => {
    const map = new Map<string, FoodItem>();
    for (const f of customFoods) map.set(f.id, f);
    for (const f of FOODS_SEED_BR) {
      if (!map.has(f.id)) map.set(f.id, f);
    }
    for (const f of cachedOnlineFoods) {
      if (!map.has(f.id)) map.set(f.id, f);
    }
    return Array.from(map.values());
  }, [customFoods, cachedOnlineFoods]);

  const searchResults = useMemo(() => {
    const q = query
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const matchesText = (food: FoodItem) => {
      if (!q) return true;
      const haystack = `${food.name} ${food.brand || ''} ${food.barcode || ''} ${FOOD_CATEGORY_LABELS[food.category]}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      return q.split(/\s+/).every((token) => haystack.includes(token));
    };

    const matchesCategory = (food: FoodItem) =>
      selectedCategory === 'all' || food.category === selectedCategory;

    const localFiltered = allLocalFoods.filter(
      (f) => matchesText(f) && matchesCategory(f)
    );

    if (onlineResults.length === 0) return localFiltered;

    const seen = new Set(localFiltered.map((f) => f.id));
    const merged = [...localFiltered];
    for (const online of onlineResults) {
      if (!seen.has(online.id) && matchesCategory(online)) {
        seen.add(online.id);
        merged.push(online);
      }
    }
    return merged;
  }, [allLocalFoods, onlineResults, query, selectedCategory]);

  const recentFoods = useMemo(() => {
    const byId = new Map(allLocalFoods.map((f) => [f.id, f]));
    return recentFoodIds
      .map((id) => byId.get(id))
      .filter((f): f is FoodItem => Boolean(f));
  }, [allLocalFoods, recentFoodIds]);

  const portionPreview = useMemo(() => {
    if (!selectedFood) return null;
    return calculateFoodEntryMacros(selectedFood, quantity ?? 0, measureMode);
  }, [selectedFood, quantity, measureMode]);

  if (!isOpen) return null;

  const handleConfirmPortion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || !quantity || quantity <= 0) return;
    addFoodLog({
      date,
      mealSlot: selectedSlot,
      food: selectedFood,
      quantity,
      measureMode,
    });
    onAdded?.(selectedFood.name);
    onClose();
  };

  const handleCreateCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    const cleanName = cName.trim();
    if (!cleanName) {
      setCreateError('Informe o nome do alimento.');
      return;
    }
    if (cKcal === null || cKcal < 0) {
      setCreateError('Informe as calorias por 100g/100ml.');
      return;
    }

    const gramsPerUnit =
      cGramsPerUnit && cGramsPerUnit > 0 ? cGramsPerUnit : undefined;
    const unitLabel =
      gramsPerUnit && cUnitLabel.trim()
        ? `${cUnitLabel.trim()} (${gramsPerUnit}${cUnit})`
        : gramsPerUnit
          ? `porção (${gramsPerUnit}${cUnit})`
          : undefined;
    const defaultUnit: FoodUnit = gramsPerUnit ? 'un' : cUnit;

    const created = addCustomFood({
      name: cleanName,
      ...(cBrand.trim() ? { brand: cBrand.trim() } : {}),
      ...(cBarcode.trim() ? { barcode: cBarcode.replace(/\D/g, '') } : {}),
      category: cCategory,
      caloriesPer100: Math.round(cKcal),
      proteinPer100: Math.max(0, cProtein ?? 0),
      carbsPer100: Math.max(0, cCarbs ?? 0),
      fatPer100: Math.max(0, cFat ?? 0),
      ...(cFiber !== null && cFiber >= 0 ? { fiberPer100: cFiber } : {}),
      defaultUnit,
      ...(gramsPerUnit ? { gramsPerUnit } : {}),
      ...(unitLabel ? { unitLabel } : {}),
    });

    openPortionForFood(created);
  };

  const handleLogSavedMealQuick = (meal: SavedMeal) => {
    const count = logSavedMeal(meal.id, date, selectedSlot);
    if (count > 0) {
      onAdded?.(`${meal.name} (${count} itens)`);
      onClose();
    }
  };

  const sourceBadge = (source: FoodItem['source']) => {
    if (source === 'taco') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          TACO
        </span>
      );
    }
    if (source === 'custom') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          Meu
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
        <Globe className="w-2.5 h-2.5" /> Online
      </span>
    );
  };

  const renderFoodRow = (food: FoodItem, allowDelete = false) => {
    const baseUnit = food.defaultUnit === 'ml' ? 'ml' : 'g';
    return (
      <div
        key={food.id}
        className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#3B82F6] transition"
      >
        <button
          type="button"
          onClick={() => openPortionForFood(food)}
          className="flex-1 text-left min-w-0 space-y-1"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 truncate">
              {food.name}
            </span>
            {sourceBadge(food.source)}
          </div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 tabular-nums">
            {food.brand && (
              <span className="font-semibold text-slate-600">{food.brand} •</span>
            )}
            <span className="font-bold text-slate-800">
              {food.caloriesPer100} kcal
            </span>
            <span>/ 100{baseUnit}</span>
            <span>
              • P {fmt1(food.proteinPer100)}g • C {fmt1(food.carbsPer100)}g • G{' '}
              {fmt1(food.fatPer100)}g
            </span>
          </div>
          {food.unitLabel && (
            <p className="text-[11px] text-[#3B82F6] font-semibold">
              Medida prática: 1 {food.unitLabel}
            </p>
          )}
        </button>

        {allowDelete && food.source === 'custom' && (
          <button
            type="button"
            aria-label={`Excluir ${food.name}`}
            onClick={() => {
              if (confirm(`Excluir alimento personalizado "${food.name}"?`)) {
                deleteCustomFood(food.id);
              }
            }}
            className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center shrink-0 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          aria-label={`Adicionar ${food.name}`}
          onClick={() => openPortionForFood(food)}
          className="w-11 h-11 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white flex items-center justify-center shrink-0 transition"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-2 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="food-search-modal-title"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {step !== 'browse' && (
              <button
                type="button"
                aria-label="Voltar para busca de alimentos"
                onClick={() => setStep('browse')}
                className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="min-w-0">
              <h2
                id="food-search-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
              >
                {step === 'portion'
                  ? 'Definir Porção'
                  : step === 'create'
                    ? 'Novo Alimento Personalizado'
                    : `Adicionar em ${MEAL_SLOT_LABELS[selectedSlot]}`}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {step === 'portion' && selectedFood
                  ? selectedFood.name
                  : step === 'create'
                    ? 'Informe os dados do rótulo nutricional por 100g/100ml'
                    : 'Catálogo TACO offline + Open Food Facts online'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca de alimentos"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ==================== STEP 1: BUSCAR / NAVEGAR ==================== */}
        {step === 'browse' && (
          <>
            {/* Abas rápidas */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 space-y-3 shrink-0">
              <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(
                  [
                    ['search', 'Buscar', Search],
                    ['recent', 'Recentes', Clock],
                    ['custom', 'Meus', Sparkles],
                    ['saved', 'Combos', Bookmark],
                  ] as const
                ).map(([tabKey, label, Icon]) => (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveTab(tabKey)}
                    className={`min-h-[40px] px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition ${
                      activeTab === tabKey
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>

              {activeTab === 'search' && (
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar alimento (ex: frango, arroz, whey)..."
                        aria-label="Buscar alimento no catálogo"
                        className="w-full h-11 pl-10 pr-16 rounded-xl bg-slate-50 border border-slate-200 text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#3B82F6]"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {isSearchingOnline && (
                          <Loader2 className="w-4 h-4 text-[#3B82F6] animate-spin" />
                        )}
                        {query && (
                          <button
                            type="button"
                            aria-label="Limpar busca"
                            onClick={() => setQuery('')}
                            className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenBarcodeScanner}
                      aria-label="Abrir leitor de código de barras"
                      title="Ler Código de Barras"
                      className="w-11 h-11 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#3B82F6] flex items-center justify-center shrink-0 transition"
                    >
                      <ScanBarcode className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCName(query.trim());
                        setCBarcode('');
                        setStep('create');
                      }}
                      aria-label="Criar alimento personalizado"
                      title="Novo Alimento Personalizado"
                      className="h-11 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 shrink-0 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="hidden sm:inline">Criar</span>
                    </button>
                  </div>

                  {isOffline && (
                    <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
                      <WifiOff className="w-4 h-4 shrink-0" />
                      <span>
                        Modo Offline: exibindo catálogo local TACO e itens em
                        cache (Open Food Facts online indisponível).
                      </span>
                    </div>
                  )}

                  {/* Filtros de Categoria */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {CATEGORY_LIST.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`min-h-[36px] px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                          selectedCategory === cat
                            ? 'bg-[#2563EB] border-[#2563EB] text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {cat === 'all' ? 'Todos' : FOOD_CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Lista de Resultados */}
            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {activeTab === 'search' && (
                <>
                  {searchResults.length === 0 ? (
                    <div className="py-10 px-4 text-center space-y-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                      <Search className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-900">
                        Nenhum alimento encontrado para &ldquo;{query}&rdquo;
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCName(query.trim());
                            setCBarcode('');
                            setStep('create');
                          }}
                          className="h-11 px-4 rounded-xl bg-[#2563EB] text-white text-xs font-bold flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" /> Cadastrar Alimento
                          Personalizado
                        </button>
                        <button
                          type="button"
                          onClick={onOpenBarcodeScanner}
                          className="h-11 px-4 rounded-xl bg-blue-50 border border-blue-200 text-[#3B82F6] text-xs font-bold flex items-center gap-1.5"
                        >
                          <ScanBarcode className="w-4 h-4" /> Ler Código de
                          Barras
                        </button>
                      </div>
                    </div>
                  ) : (
                    searchResults.map((food) => renderFoodRow(food, false))
                  )}
                </>
              )}

              {activeTab === 'recent' && (
                <>
                  {recentFoods.length === 0 ? (
                    <div className="py-10 text-center space-y-2 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                      <Clock className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-900">
                        Nenhum alimento recente
                      </p>
                      <p className="text-xs text-slate-500">
                        Seus últimos 30 alimentos lançados aparecerão aqui para
                        acesso instantâneo.
                      </p>
                    </div>
                  ) : (
                    recentFoods.map((food) => renderFoodRow(food, false))
                  )}
                </>
              )}

              {activeTab === 'custom' && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCName('');
                      setCBarcode('');
                      setStep('create');
                    }}
                    className="w-full h-11 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition"
                  >
                    <Plus className="w-4 h-4" /> Cadastrar Novo Alimento
                    Personalizado
                  </button>

                  {customFoods.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                      Você ainda não cadastrou alimentos personalizados.
                    </div>
                  ) : (
                    customFoods.map((food) => renderFoodRow(food, true))
                  )}
                </div>
              )}

              {activeTab === 'saved' && (
                <>
                  {savedMeals.length === 0 ? (
                    <div className="py-10 text-center space-y-2 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                      <Bookmark className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-900">
                        Nenhum combo salvo ainda
                      </p>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto">
                        Monte uma refeição com 2+ alimentos e clique em
                        &ldquo;Salvar combo&rdquo; no diário.
                      </p>
                    </div>
                  ) : (
                    savedMeals.map((meal) => {
                      const totalKcal = meal.items.reduce(
                        (acc, it) => acc + it.calories,
                        0
                      );
                      const totalP = meal.items.reduce(
                        (acc, it) => acc + it.proteinG,
                        0
                      );
                      const totalC = meal.items.reduce(
                        (acc, it) => acc + it.carbsG,
                        0
                      );
                      const totalF = meal.items.reduce(
                        (acc, it) => acc + it.fatG,
                        0
                      );

                      return (
                        <div
                          key={meal.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {meal.name}
                            </p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              {Math.round(totalKcal)} kcal • P {fmt1(totalP)}g •
                              C {fmt1(totalC)}g • G {fmt1(totalF)}g (
                              {meal.items.length} itens)
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleLogSavedMealQuick(meal)}
                            className="h-11 px-3.5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition"
                          >
                            <Plus className="w-4 h-4" /> Lançar
                          </button>
                        </div>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* ==================== STEP 2: DEFINIR PORÇÃO ==================== */}
        {step === 'portion' && selectedFood && portionPreview && (
          <form
            onSubmit={handleConfirmPortion}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Resumo do Alimento */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedFood.name}
                  </h3>
                  {sourceBadge(selectedFood.source)}
                </div>
                {selectedFood.brand && (
                  <p className="text-xs font-semibold text-slate-600">
                    {selectedFood.brand}
                  </p>
                )}
                <p className="text-xs text-slate-500 tabular-nums">
                  Referência (100{selectedFood.defaultUnit === 'ml' ? 'ml' : 'g'}
                  ): {selectedFood.caloriesPer100} kcal • P:{' '}
                  {fmt1(selectedFood.proteinPer100)}g • C:{' '}
                  {fmt1(selectedFood.carbsPer100)}g • G:{' '}
                  {fmt1(selectedFood.fatPer100)}g
                </p>
              </div>

              {/* Refeição destino */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Refeição
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {MEAL_SLOTS_ORDER.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`min-h-[40px] px-2.5 rounded-xl text-xs font-bold border transition ${
                        selectedSlot === slot
                          ? 'bg-[#2563EB] border-[#2563EB] text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {MEAL_SLOT_LABELS[slot]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alternância Gramas vs Unidade Prática */}
              {selectedFood.gramsPerUnit &&
                selectedFood.gramsPerUnit > 0 &&
                selectedFood.unitLabel && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Tipo de Medida
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMeasureMode('grams');
                          setQuantity(
                            Math.round(
                              (quantity ?? 1) * (selectedFood.gramsPerUnit || 100)
                            ) || 100
                          );
                        }}
                        className={`h-11 px-3 rounded-xl text-xs font-bold border transition ${
                          measureMode === 'grams'
                            ? 'bg-[#2563EB] border-[#2563EB] text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {selectedFood.defaultUnit === 'ml'
                          ? 'Mililitros (ml)'
                          : 'Gramas (g)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMeasureMode('unit');
                          setQuantity(1);
                        }}
                        className={`h-11 px-3 rounded-xl text-xs font-bold border truncate transition ${
                          measureMode === 'unit'
                            ? 'bg-[#2563EB] border-[#2563EB] text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        {selectedFood.unitLabel}
                      </button>
                    </div>
                  </div>
                )}

              {/* Quantidade + Atalhos Rápidos */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quantidade (
                  {measureMode === 'unit' && selectedFood.unitLabel
                    ? selectedFood.unitLabel
                    : selectedFood.defaultUnit === 'ml'
                      ? 'ml'
                      : 'g'}
                  )
                </label>
                <DecimalInput
                  value={quantity}
                  onChange={setQuantity}
                  ariaLabel="Quantidade do alimento"
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 border-2 border-[#3B82F6] text-lg font-extrabold text-slate-900 focus:outline-none"
                />

                <div className="flex flex-wrap gap-1.5">
                  {(measureMode === 'unit'
                    ? [0.5, 1, 1.5, 2, 3, 4]
                    : [30, 50, 100, 150, 200, 250]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setQuantity(preset)}
                      className={`min-h-[38px] px-3 rounded-xl text-xs font-bold border tabular-nums transition ${
                        quantity === preset
                          ? 'bg-blue-50 border-[#3B82F6] text-[#3B82F6]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {String(preset).replace('.', ',')}
                      {measureMode === 'grams'
                        ? selectedFood.defaultUnit === 'ml'
                          ? 'ml'
                          : 'g'
                        : '×'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prévia em Tempo Real dos Macros */}
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Prévia Nutricional ({fmt1(portionPreview.totalGrams)}
                    {selectedFood.defaultUnit === 'ml' ? 'ml' : 'g'})
                  </span>
                  <span className="text-2xl font-black text-slate-900 tabular-nums">
                    {portionPreview.calories}{' '}
                    <span className="text-xs font-bold text-slate-500">
                      kcal
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="block text-[11px] font-bold text-emerald-700">
                      Proteína
                    </span>
                    <span className="text-base font-extrabold text-slate-900 tabular-nums">
                      {fmt1(portionPreview.proteinG)}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="block text-[11px] font-bold text-amber-700">
                      Carboidrato
                    </span>
                    <span className="text-base font-extrabold text-slate-900 tabular-nums">
                      {fmt1(portionPreview.carbsG)}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                    <span className="block text-[11px] font-bold text-purple-700">
                      Gordura
                    </span>
                    <span className="text-base font-extrabold text-slate-900 tabular-nums">
                      {fmt1(portionPreview.fatG)}g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-2.5 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setStep('browse')}
                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={!quantity || quantity <= 0}
                className="h-12 rounded-xl bg-[#2563EB] hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Check className="w-4 h-4" /> Adicionar ao Diário
              </button>
            </div>
          </form>
        )}

        {/* ==================== STEP 3: CRIAR ALIMENTO PERSONALIZADO ==================== */}
        {step === 'create' && (
          <form
            onSubmit={handleCreateCustomFood}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1">
              {createError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Nome do alimento *
                  </label>
                  <input
                    type="text"
                    required
                    value={cName}
                    onChange={(e) => setCName(e.target.value)}
                    placeholder="Ex: Crepioca caseira, Whey Growth Chocolate..."
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-base text-slate-900 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Marca (opcional)
                  </label>
                  <input
                    type="text"
                    value={cBrand}
                    onChange={(e) => setCBrand(e.target.value)}
                    placeholder="Ex: Growth, Italac..."
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-base text-slate-900 focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Código de barras (opcional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cBarcode}
                    onChange={(e) =>
                      setCBarcode(e.target.value.replace(/\D/g, '').slice(0, 14))
                    }
                    placeholder="Ex: 789..."
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-base text-slate-900 tabular-nums focus:outline-none focus:border-[#3B82F6]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Categoria
                  </label>
                  <select
                    value={cCategory}
                    onChange={(e) =>
                      setCCategory(e.target.value as FoodCategory)
                    }
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold"
                  >
                    {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map(
                      (cat) => (
                        <option key={cat} value={cat}>
                          {FOOD_CATEGORY_LABELS[cat]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Base nutricional
                  </label>
                  <select
                    value={cUnit}
                    onChange={(e) =>
                      setCUnit(e.target.value === 'ml' ? 'ml' : 'g')
                    }
                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-semibold"
                  >
                    <option value="g">Por 100 gramas (g)</option>
                    <option value="ml">Por 100 mililitros (ml)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Informação Nutricional por 100{cUnit}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Calorias *
                    </label>
                    <DecimalInput
                      value={cKcal}
                      onChange={setCKcal}
                      placeholder="kcal"
                      ariaLabel="Calorias por 100g"
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-emerald-700 mb-1">
                      Prot (g)
                    </label>
                    <DecimalInput
                      value={cProtein}
                      onChange={setCProtein}
                      placeholder="0"
                      ariaLabel="Proteína por 100g"
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-amber-700 mb-1">
                      Carb (g)
                    </label>
                    <DecimalInput
                      value={cCarbs}
                      onChange={setCCarbs}
                      placeholder="0"
                      ariaLabel="Carboidratos por 100g"
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-purple-700 mb-1">
                      Gord (g)
                    </label>
                    <DecimalInput
                      value={cFat}
                      onChange={setCFat}
                      placeholder="0"
                      ariaLabel="Gorduras por 100g"
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Fibra (g)
                    </label>
                    <DecimalInput
                      value={cFiber}
                      onChange={setCFiber}
                      placeholder="opc."
                      ariaLabel="Fibras por 100g"
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Medida Caseira / Prática (Opcional)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Nome da medida (ex: scoop, fatia, unidade)
                    </label>
                    <input
                      type="text"
                      value={cUnitLabel}
                      onChange={(e) => setCUnitLabel(e.target.value)}
                      placeholder="Ex: scoop"
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-base text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Peso de 1 medida ({cUnit})
                    </label>
                    <DecimalInput
                      value={cGramsPerUnit}
                      onChange={setCGramsPerUnit}
                      placeholder="Ex: 30"
                      ariaLabel="Gramas por unidade prática"
                      className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-2 gap-2.5 shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setStep('browse')}
                className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-12 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Check className="w-4 h-4" /> Salvar & Lançar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
