'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
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
import { toast } from 'sonner';
import {
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  FoodItem,
  MEAL_SLOT_LABELS,
  MealSlot,
  SavedMeal,
} from '@/types/nutrition';
import { FOODS_SEED_BR } from '@/data/foods-seed-br';
import { useNutritionStore } from '@/store/useNutritionStore';
import { searchOpenFoodFactsWithStatus } from '@/lib/openfoodfacts';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FoodPortionStep } from './FoodPortionStep';
import {
  CreateCustomFoodPayload,
  CreateCustomFoodStep,
} from './CreateCustomFoodStep';

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

  // Valores iniciais para Step 3 (Criar alimento personalizado)
  const [createSeed, setCreateSeed] = useState<{
    key: number;
    name: string;
    barcode: string;
    category: FoodCategory;
  }>({
    key: 0,
    name: '',
    barcode: '',
    category: 'outros',
  });

  // Confirmação de exclusão de alimento personalizado
  const [foodToDelete, setFoodToDelete] = useState<FoodItem | null>(null);

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

  const openCreateCustomStep = (
    name: string,
    barcode = '',
    category: FoodCategory = 'outros'
  ) => {
    setCreateSeed((prev) => ({
      key: prev.key + 1,
      name,
      barcode,
      category,
    }));
    setStep('create');
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelectedSlot(mealSlot);

    if (initialFood) {
      openPortionForFood(initialFood);
      return;
    }

    if (initialCreateBarcode) {
      setCreateSeed((prev) => ({
        key: prev.key + 1,
        name: '',
        barcode: initialCreateBarcode,
        category: 'industrializados',
      }));
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
    if (onAdded) {
      onAdded(selectedFood.name);
    } else {
      toast.success(`"${selectedFood.name}" adicionado ao diário!`);
    }
    onClose();
  };

  const handleCreateCustomFood = (payload: CreateCustomFoodPayload) => {
    const created = addCustomFood(payload);
    toast.success(`Alimento "${created.name}" criado!`);
    openPortionForFood(created);
  };

  const handleLogSavedMealQuick = (meal: SavedMeal) => {
    const count = logSavedMeal(meal.id, date, selectedSlot);
    if (count > 0) {
      const label = `${meal.name} (${count} itens)`;
      if (onAdded) {
        onAdded(label);
      } else {
        toast.success(`"${label}" adicionado ao diário!`);
      }
      onClose();
    }
  };

  const sourceBadge = (source: FoodItem['source']) => {
    if (source === 'taco') {
      return (
        <Badge variant="success" className="text-[10px]">
          TACO
        </Badge>
      );
    }
    if (source === 'custom') {
      return (
        <Badge variant="purple" className="text-[10px]">
          Meu
        </Badge>
      );
    }
    return (
      <Badge variant="info" className="text-[10px]">
        <Globe className="size-2.5" /> Online
      </Badge>
    );
  };

  const renderFoodRow = (food: FoodItem, allowDelete = false) => {
    const baseUnit = food.defaultUnit === 'ml' ? 'ml' : 'g';
    return (
      <Card
        key={food.id}
        className="flex items-center gap-2 bg-secondary/40 p-3 transition-colors hover:border-primary/60"
      >
        <button
          type="button"
          onClick={() => openPortionForFood(food)}
          className="min-h-11 min-w-0 flex-1 cursor-pointer space-y-1 text-left"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-bold text-foreground">
              {food.name}
            </span>
            {sourceBadge(food.source)}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs tabular-nums text-muted-foreground">
            {food.brand && (
              <span className="font-semibold text-foreground/80">
                {food.brand} •
              </span>
            )}
            <span className="font-bold text-foreground">
              {food.caloriesPer100} kcal
            </span>
            <span>/ 100{baseUnit}</span>
            <span>
              • P {fmt1(food.proteinPer100)}g • C {fmt1(food.carbsPer100)}g • G{' '}
              {fmt1(food.fatPer100)}g
            </span>
          </div>
          {food.unitLabel && (
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
              Medida prática: 1 {food.unitLabel}
            </p>
          )}
        </button>

        {allowDelete && food.source === 'custom' && (
          <Button
            variant="outline"
            size="icon"
            aria-label={`Excluir ${food.name}`}
            onClick={() => setFoodToDelete(food)}
            className="shrink-0 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        )}

        <Button
          size="icon"
          aria-label={`Adicionar ${food.name}`}
          onClick={() => openPortionForFood(food)}
          className="shrink-0"
        >
          <Plus className="size-5" />
        </Button>
      </Card>
    );
  };

  return (
    <>
      <ResponsiveDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-2xl">
          {/* Cabeçalho */}
          <ResponsiveDialogHeader className="shrink-0">
            <div className="flex min-w-0 items-center gap-2.5">
              {step !== 'browse' && (
                <Button
                  variant="secondary"
                  size="icon"
                  aria-label="Voltar para busca de alimentos"
                  onClick={() => setStep('browse')}
                  className="shrink-0 rounded-full"
                >
                  <ArrowLeft className="size-5" />
                </Button>
              )}
              <div className="min-w-0">
                <ResponsiveDialogTitle className="truncate">
                  {step === 'portion'
                    ? 'Definir Porção'
                    : step === 'create'
                      ? 'Novo Alimento Personalizado'
                      : `Adicionar em ${MEAL_SLOT_LABELS[selectedSlot]}`}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="truncate">
                  {step === 'portion' && selectedFood
                    ? selectedFood.name
                    : step === 'create'
                      ? 'Informe os dados do rótulo nutricional por 100g/100ml'
                      : 'Catálogo TACO offline + Open Food Facts online'}
                </ResponsiveDialogDescription>
              </div>
            </div>
          </ResponsiveDialogHeader>

          {/* ==================== STEP 1: BUSCAR / NAVEGAR ==================== */}
          {step === 'browse' && (
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as SearchTab)}
              className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
            >
              {/* Abas rápidas + Controles de Busca */}
              <div className="shrink-0 space-y-3 border-b border-border px-4 pb-3 pt-3">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="search" className="px-2 text-xs">
                    <Search className="size-3.5 shrink-0" />
                    <span className="truncate">Buscar</span>
                  </TabsTrigger>
                  <TabsTrigger value="recent" className="px-2 text-xs">
                    <Clock className="size-3.5 shrink-0" />
                    <span className="truncate">Recentes</span>
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="px-2 text-xs">
                    <Sparkles className="size-3.5 shrink-0" />
                    <span className="truncate">Meus</span>
                  </TabsTrigger>
                  <TabsTrigger value="saved" className="px-2 text-xs">
                    <Bookmark className="size-3.5 shrink-0" />
                    <span className="truncate">Combos</span>
                  </TabsTrigger>
                </TabsList>

                {activeTab === 'search' && (
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Buscar alimento (ex: frango, arroz, whey)..."
                          aria-label="Buscar alimento no catálogo"
                          className="pl-10 pr-16"
                        />
                        <div className="absolute right-0 top-1/2 flex -translate-y-1/2 items-center">
                          {isSearchingOnline && (
                            <Loader2 className="mr-2 size-4 animate-spin text-primary" />
                          )}
                          {query && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Limpar busca"
                              onClick={() => setQuery('')}
                            >
                              <X className="size-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        onClick={onOpenBarcodeScanner}
                        aria-label="Abrir leitor de código de barras"
                        title="Ler Código de Barras"
                        className="shrink-0 border-primary/30 bg-primary/10 text-blue-700 hover:bg-primary/20 dark:text-blue-400"
                      >
                        <ScanBarcode className="size-5" />
                      </Button>

                      <Button
                        variant="secondary"
                        onClick={() => openCreateCustomStep(query.trim())}
                        aria-label="Criar alimento personalizado"
                        title="Novo Alimento Personalizado"
                        className="shrink-0 px-3 text-xs"
                      >
                        <Plus className="size-4" />
                        <span className="hidden sm:inline">Criar</span>
                      </Button>
                    </div>

                    {isOffline && (
                      <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-400">
                        <WifiOff className="size-4 shrink-0" />
                        <span>
                          Modo Offline: exibindo catálogo local TACO e itens em
                          cache (Open Food Facts online indisponível).
                        </span>
                      </div>
                    )}

                    {/* Filtros de Categoria */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {CATEGORY_LIST.map((cat) => {
                        const isSelected = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className="shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Badge
                              variant={isSelected ? 'default' : 'secondary'}
                              className="min-h-11 px-3.5 text-xs"
                            >
                              {cat === 'all'
                                ? 'Todos'
                                : FOOD_CATEGORY_LABELS[cat]}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de Resultados */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <TabsContent value="search" className="mt-0 space-y-2.5">
                  {searchResults.length === 0 ? (
                    <Card className="space-y-3 border-dashed bg-secondary/40 px-4 py-10 text-center">
                      <Search className="mx-auto size-8 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground">
                        Nenhum alimento encontrado para &ldquo;{query}&rdquo;
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          onClick={() => openCreateCustomStep(query.trim())}
                          className="text-xs"
                        >
                          <Plus className="size-4" /> Cadastrar Alimento
                          Personalizado
                        </Button>
                        <Button
                          variant="outline"
                          onClick={onOpenBarcodeScanner}
                          className="border-primary/30 bg-primary/10 text-xs text-blue-700 hover:bg-primary/20 dark:text-blue-400"
                        >
                          <ScanBarcode className="size-4" /> Ler Código de
                          Barras
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    searchResults.map((food) => renderFoodRow(food, false))
                  )}
                </TabsContent>

                <TabsContent value="recent" className="mt-0 space-y-2.5">
                  {recentFoods.length === 0 ? (
                    <Card className="space-y-2 border-dashed bg-secondary/40 px-4 py-10 text-center">
                      <Clock className="mx-auto size-8 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground">
                        Nenhum alimento recente
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Seus últimos 30 alimentos lançados aparecerão aqui para
                        acesso instantâneo.
                      </p>
                    </Card>
                  ) : (
                    recentFoods.map((food) => renderFoodRow(food, false))
                  )}
                </TabsContent>

                <TabsContent value="custom" className="mt-0 space-y-3">
                  <Button
                    onClick={() => openCreateCustomStep('')}
                    className="w-full text-xs"
                  >
                    <Plus className="size-4" /> Cadastrar Novo Alimento
                    Personalizado
                  </Button>

                  {customFoods.length === 0 ? (
                    <Card className="border-dashed bg-secondary/40 px-4 py-8 text-center text-xs text-muted-foreground">
                      Você ainda não cadastrou alimentos personalizados.
                    </Card>
                  ) : (
                    customFoods.map((food) => renderFoodRow(food, true))
                  )}
                </TabsContent>

                <TabsContent value="saved" className="mt-0 space-y-2.5">
                  {savedMeals.length === 0 ? (
                    <Card className="space-y-2 border-dashed bg-secondary/40 px-4 py-10 text-center">
                      <Bookmark className="mx-auto size-8 text-muted-foreground" />
                      <p className="text-sm font-bold text-foreground">
                        Nenhum combo salvo ainda
                      </p>
                      <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                        Monte uma refeição com 2+ alimentos e clique em
                        &ldquo;Salvar combo&rdquo; no diário.
                      </p>
                    </Card>
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
                        <Card
                          key={meal.id}
                          className="flex items-center justify-between gap-3 bg-secondary/40 p-3.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-foreground">
                              {meal.name}
                            </p>
                            <p className="text-xs tabular-nums text-muted-foreground">
                              {Math.round(totalKcal)} kcal • P {fmt1(totalP)}g •
                              C {fmt1(totalC)}g • G {fmt1(totalF)}g (
                              {meal.items.length} itens)
                            </p>
                          </div>
                          <Button
                            onClick={() => handleLogSavedMealQuick(meal)}
                            className="shrink-0 px-3.5 text-xs"
                          >
                            <Plus className="size-4" /> Lançar
                          </Button>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              </div>
            </Tabs>
          )}

          {/* ==================== STEP 2: DEFINIR PORÇÃO ==================== */}
          {step === 'portion' && selectedFood && (
            <FoodPortionStep
              food={selectedFood}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
              measureMode={measureMode}
              onChangeMeasureMode={setMeasureMode}
              quantity={quantity}
              onChangeQuantity={setQuantity}
              onBack={() => setStep('browse')}
              onSubmit={handleConfirmPortion}
            />
          )}

          {/* ==================== STEP 3: CRIAR ALIMENTO PERSONALIZADO ==================== */}
          {step === 'create' && (
            <CreateCustomFoodStep
              key={createSeed.key}
              initialName={createSeed.name}
              initialBarcode={createSeed.barcode}
              initialCategory={createSeed.category}
              onCancel={() => setStep('browse')}
              onCreate={handleCreateCustomFood}
            />
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={foodToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setFoodToDelete(null);
        }}
        title="Excluir alimento personalizado?"
        description={`Deseja excluir o alimento personalizado "${foodToDelete?.name ?? ''}"?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={() => {
          if (foodToDelete) {
            deleteCustomFood(foodToDelete.id);
            toast.success(`Alimento "${foodToDelete.name}" excluído.`);
            setFoodToDelete(null);
          }
        }}
      />
    </>
  );
}
