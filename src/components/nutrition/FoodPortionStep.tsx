'use client';

import React, { useMemo } from 'react';
import { Check, Globe } from 'lucide-react';
import {
  FoodItem,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
  MealSlot,
} from '@/types/nutrition';
import { calculateFoodEntryMacros } from '@/lib/nutrition-calculations';
import { DecimalInput } from '@/components/ui/NumericInputs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';

const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

export interface FoodPortionStepProps {
  food: FoodItem;
  selectedSlot: MealSlot;
  onSelectSlot: (slot: MealSlot) => void;
  measureMode: 'grams' | 'unit';
  onChangeMeasureMode: (mode: 'grams' | 'unit') => void;
  quantity: number | null;
  onChangeQuantity: (qty: number | null) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function FoodSourceBadge({ source }: { source: FoodItem['source'] }) {
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
}

export function FoodPortionStep({
  food,
  selectedSlot,
  onSelectSlot,
  measureMode,
  onChangeMeasureMode,
  quantity,
  onChangeQuantity,
  onBack,
  onSubmit,
}: FoodPortionStepProps) {
  const portionPreview = useMemo(
    () => calculateFoodEntryMacros(food, quantity ?? 0, measureMode),
    [food, quantity, measureMode]
  );

  const hasPracticalUnit = Boolean(
    food.gramsPerUnit && food.gramsPerUnit > 0 && food.unitLabel
  );
  const baseUnit = food.defaultUnit === 'ml' ? 'ml' : 'g';

  const handleMeasureModeChange = (nextMode: string) => {
    if (nextMode === 'grams') {
      onChangeMeasureMode('grams');
      onChangeQuantity(
        Math.round((quantity ?? 1) * (food.gramsPerUnit || 100)) || 100
      );
    } else if (nextMode === 'unit') {
      onChangeMeasureMode('unit');
      onChangeQuantity(1);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {/* Resumo do Alimento */}
        <Card className="space-y-1.5 bg-secondary/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-extrabold text-foreground">
              {food.name}
            </h3>
            <FoodSourceBadge source={food.source} />
          </div>
          {food.brand && (
            <p className="text-xs font-semibold text-muted-foreground">
              {food.brand}
            </p>
          )}
          <p className="text-xs tabular-nums text-muted-foreground">
            Referência (100{baseUnit}): {food.caloriesPer100} kcal • P:{' '}
            {fmt1(food.proteinPer100)}g • C: {fmt1(food.carbsPer100)}g • G:{' '}
            {fmt1(food.fatPer100)}g
          </p>
        </Card>

        {/* Refeição destino */}
        <div className="space-y-1.5">
          <Label htmlFor="portion-meal-slot">Refeição</Label>
          <Select
            value={selectedSlot}
            onValueChange={(val) => onSelectSlot(val as MealSlot)}
          >
            <SelectTrigger id="portion-meal-slot" aria-label="Refeição destino">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_SLOTS_ORDER.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {MEAL_SLOT_LABELS[slot]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Alternância Gramas vs Unidade Prática */}
        {hasPracticalUnit && food.unitLabel && (
          <div className="space-y-1.5">
            <Label>Tipo de Medida</Label>
            <Tabs value={measureMode} onValueChange={handleMeasureModeChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="grams">
                  {food.defaultUnit === 'ml' ? 'Mililitros (ml)' : 'Gramas (g)'}
                </TabsTrigger>
                <TabsTrigger value="unit" className="truncate">
                  {food.unitLabel}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* Quantidade + Atalhos Rápidos */}
        <div className="space-y-2">
          <Label>
            Quantidade (
            {measureMode === 'unit' && food.unitLabel
              ? food.unitLabel
              : baseUnit}
            )
          </Label>
          <DecimalInput
            value={quantity}
            onChange={onChangeQuantity}
            ariaLabel="Quantidade do alimento"
            className="min-h-12 h-12 w-full rounded-xl border-2 border-primary bg-secondary/70 px-4 text-lg font-extrabold text-foreground"
          />

          <div className="flex flex-wrap gap-1.5">
            {(measureMode === 'unit'
              ? [0.5, 1, 1.5, 2, 3, 4]
              : [30, 50, 100, 150, 200, 250]
            ).map((preset) => (
              <Button
                key={preset}
                variant={quantity === preset ? 'default' : 'outline'}
                onClick={() => onChangeQuantity(preset)}
                className="min-h-11 h-11 px-3 text-xs tabular-nums"
              >
                {String(preset).replace('.', ',')}
                {measureMode === 'grams' ? baseUnit : '×'}
              </Button>
            ))}
          </div>
        </div>

        {/* Prévia em Tempo Real dos Macros */}
        <Card className="space-y-3 border-primary/30 bg-primary/10 p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Prévia Nutricional ({fmt1(portionPreview.totalGrams)}
              {baseUnit})
            </span>
            <span className="text-2xl font-black tabular-nums text-foreground">
              {portionPreview.calories}{' '}
              <span className="text-xs font-bold text-muted-foreground">
                kcal
              </span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-border bg-card p-2.5">
              <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                Proteína
              </span>
              <span className="text-base font-extrabold tabular-nums text-foreground">
                {fmt1(portionPreview.proteinG)}g
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-2.5">
              <span className="block text-[11px] font-bold text-amber-700 dark:text-amber-400">
                Carboidrato
              </span>
              <span className="text-base font-extrabold tabular-nums text-foreground">
                {fmt1(portionPreview.carbsG)}g
              </span>
            </div>
            <div className="rounded-xl border border-border bg-card p-2.5">
              <span className="block text-[11px] font-bold text-purple-700 dark:text-purple-400">
                Gordura
              </span>
              <span className="text-base font-extrabold tabular-nums text-foreground">
                {fmt1(portionPreview.fatG)}g
              </span>
            </div>
          </div>
        </Card>
      </div>

      <ResponsiveDialogFooter className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid sm:grid-cols-2">
        <Button variant="secondary" size="lg" onClick={onBack}>
          Voltar
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={!quantity || quantity <= 0}
        >
          <Check className="size-4" /> Adicionar ao Diário
        </Button>
      </ResponsiveDialogFooter>
    </form>
  );
}
