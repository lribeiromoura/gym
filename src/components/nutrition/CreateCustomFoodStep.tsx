'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import {
  FOOD_CATEGORY_LABELS,
  FoodCategory,
  FoodUnit,
} from '@/types/nutrition';
import { DecimalInput } from '@/components/ui/NumericInputs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResponsiveDialogFooter } from '@/components/ui/responsive-dialog';

export interface CreateCustomFoodPayload {
  name: string;
  brand?: string;
  barcode?: string;
  category: FoodCategory;
  caloriesPer100: number;
  proteinPer100: number;
  carbsPer100: number;
  fatPer100: number;
  fiberPer100?: number;
  defaultUnit: FoodUnit;
  gramsPerUnit?: number;
  unitLabel?: string;
}

export interface CreateCustomFoodStepProps {
  initialName?: string;
  initialBarcode?: string;
  initialCategory?: FoodCategory;
  onCancel: () => void;
  onCreate: (payload: CreateCustomFoodPayload) => void;
}

const NUMERIC_INPUT_CLASS =
  'min-h-11 h-11 w-full rounded-xl border border-input bg-secondary/70 px-3 text-base font-bold text-foreground placeholder:text-muted-foreground';

export function CreateCustomFoodStep({
  initialName = '',
  initialBarcode = '',
  initialCategory = 'outros',
  onCancel,
  onCreate,
}: CreateCustomFoodStepProps) {
  const [cName, setCName] = useState(initialName);
  const [cBrand, setCBrand] = useState('');
  const [cBarcode, setCBarcode] = useState(initialBarcode);
  const [cCategory, setCCategory] = useState<FoodCategory>(initialCategory);
  const [cUnit, setCUnit] = useState<'g' | 'ml'>('g');
  const [cKcal, setCKcal] = useState<number | null>(null);
  const [cProtein, setCProtein] = useState<number | null>(null);
  const [cCarbs, setCCarbs] = useState<number | null>(null);
  const [cFat, setCFat] = useState<number | null>(null);
  const [cFiber, setCFiber] = useState<number | null>(null);
  const [cGramsPerUnit, setCGramsPerUnit] = useState<number | null>(null);
  const [cUnitLabel, setCUnitLabel] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
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

    onCreate({
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
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
        {createError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 p-3 text-xs font-semibold text-red-700 dark:text-red-400">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{createError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="custom-food-name">Nome do alimento *</Label>
            <Input
              id="custom-food-name"
              type="text"
              required
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="Ex: Crepioca caseira, Whey Growth Chocolate..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-food-brand">Marca (opcional)</Label>
            <Input
              id="custom-food-brand"
              type="text"
              value={cBrand}
              onChange={(e) => setCBrand(e.target.value)}
              placeholder="Ex: Growth, Italac..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-food-barcode">
              Código de barras (opcional)
            </Label>
            <Input
              id="custom-food-barcode"
              type="text"
              inputMode="numeric"
              value={cBarcode}
              onChange={(e) =>
                setCBarcode(e.target.value.replace(/\D/g, '').slice(0, 14))
              }
              placeholder="Ex: 789..."
              className="tabular-nums"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-food-category">Categoria</Label>
            <Select
              value={cCategory}
              onValueChange={(val) => setCCategory(val as FoodCategory)}
            >
              <SelectTrigger id="custom-food-category" aria-label="Categoria">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FOOD_CATEGORY_LABELS) as FoodCategory[]).map(
                  (cat) => (
                    <SelectItem key={cat} value={cat}>
                      {FOOD_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="custom-food-unit">Base nutricional</Label>
            <Select
              value={cUnit}
              onValueChange={(val) => setCUnit(val === 'ml' ? 'ml' : 'g')}
            >
              <SelectTrigger
                id="custom-food-unit"
                aria-label="Base nutricional"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="g">Por 100 gramas (g)</SelectItem>
                <SelectItem value="ml">Por 100 mililitros (ml)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Informação Nutricional por 100{cUnit}
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <div className="space-y-1">
              <Label className="normal-case tracking-normal">Calorias *</Label>
              <DecimalInput
                value={cKcal}
                onChange={setCKcal}
                placeholder="kcal"
                ariaLabel="Calorias por 100g"
                className={NUMERIC_INPUT_CLASS}
              />
            </div>
            <div className="space-y-1">
              <Label className="normal-case tracking-normal text-emerald-700 dark:text-emerald-400">
                Prot (g)
              </Label>
              <DecimalInput
                value={cProtein}
                onChange={setCProtein}
                placeholder="0"
                ariaLabel="Proteína por 100g"
                className={NUMERIC_INPUT_CLASS}
              />
            </div>
            <div className="space-y-1">
              <Label className="normal-case tracking-normal text-amber-700 dark:text-amber-400">
                Carb (g)
              </Label>
              <DecimalInput
                value={cCarbs}
                onChange={setCCarbs}
                placeholder="0"
                ariaLabel="Carboidratos por 100g"
                className={NUMERIC_INPUT_CLASS}
              />
            </div>
            <div className="space-y-1">
              <Label className="normal-case tracking-normal text-purple-700 dark:text-purple-400">
                Gord (g)
              </Label>
              <DecimalInput
                value={cFat}
                onChange={setCFat}
                placeholder="0"
                ariaLabel="Gorduras por 100g"
                className={NUMERIC_INPUT_CLASS}
              />
            </div>
            <div className="space-y-1">
              <Label className="normal-case tracking-normal">Fibra (g)</Label>
              <DecimalInput
                value={cFiber}
                onChange={setCFiber}
                placeholder="opc."
                ariaLabel="Fibras por 100g"
                className={NUMERIC_INPUT_CLASS}
              />
            </div>
          </div>
        </div>

        <div className="space-y-2.5 border-t border-border pt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Medida Caseira / Prática (Opcional)
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="space-y-1">
              <Label
                htmlFor="custom-food-unit-label"
                className="normal-case tracking-normal"
              >
                Nome da medida (ex: scoop, fatia, unidade)
              </Label>
              <Input
                id="custom-food-unit-label"
                type="text"
                value={cUnitLabel}
                onChange={(e) => setCUnitLabel(e.target.value)}
                placeholder="Ex: scoop"
              />
            </div>
            <div className="space-y-1">
              <Label className="normal-case tracking-normal">
                Peso de 1 medida ({cUnit})
              </Label>
              <DecimalInput
                value={cGramsPerUnit}
                onChange={setCGramsPerUnit}
                placeholder="Ex: 30"
                ariaLabel="Gramas por unidade prática"
                className={NUMERIC_INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      </div>

      <ResponsiveDialogFooter className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid sm:grid-cols-2">
        <Button variant="secondary" size="lg" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg">
          <Check className="size-4" /> Salvar &amp; Lançar
        </Button>
      </ResponsiveDialogFooter>
    </form>
  );
}
