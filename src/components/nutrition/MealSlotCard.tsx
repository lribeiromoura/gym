'use client';

import React, { useState } from 'react';
import {
  Apple,
  Bookmark,
  Check,
  Coffee,
  Copy,
  Moon,
  MoreVertical,
  Plus,
  ScanBarcode,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import {
  FoodItem,
  FoodLogEntry,
  MEAL_SLOT_LABELS,
  MealSlot,
} from '@/types/nutrition';
import { MealSlotSummary } from '@/lib/nutrition-calculations';
import { DecimalInput } from '@/components/ui/NumericInputs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

const MEAL_SLOT_ICONS: Record<
  MealSlot,
  React.ComponentType<{ className?: string }>
> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snacks: Apple,
};

export interface MealSlotCardProps {
  slot: MealSlot;
  bucket: MealSlotSummary;
  yesterdayCount: number;
  foodCatalogMap: Map<string, FoodItem>;
  onOpenSearch: (slot: MealSlot) => void;
  onOpenScanner: (slot: MealSlot) => void;
  onCopyYesterday: (slot: MealSlot) => void;
  onSaveCombo: (name: string, slot: MealSlot) => boolean;
  onUpdateEntryQuantity: (
    entryId: string,
    quantity: number,
    mode: 'grams' | 'unit'
  ) => void;
  onDeleteEntry: (entryId: string) => void;
}

export function MealSlotCard({
  slot,
  bucket,
  yesterdayCount,
  foodCatalogMap,
  onOpenSearch,
  onOpenScanner,
  onCopyYesterday,
  onSaveCombo,
  onUpdateEntryQuantity,
  onDeleteEntry,
}: MealSlotCardProps) {
  const SlotIcon = MEAL_SLOT_ICONS[slot];

  // Edição inline de item lançado
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number | null>(null);
  const [editingMode, setEditingMode] = useState<'grams' | 'unit'>('grams');

  // Mini-form inline "Salvar Combo"
  const [isSavingCombo, setIsSavingCombo] = useState(false);
  const [comboNameInput, setComboNameInput] = useState('');

  const handleStartEditEntry = (entry: FoodLogEntry) => {
    setEditingEntryId(entry.id);
    setEditingQty(entry.quantity);
    setEditingMode(entry.measureMode);
  };

  const handleSaveEditEntry = (entryId: string) => {
    if (editingQty && editingQty > 0) {
      onUpdateEntryQuantity(entryId, editingQty, editingMode);
    }
    setEditingEntryId(null);
    setEditingQty(null);
  };

  const handleComboSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onSaveCombo(comboNameInput, slot);
    if (ok) {
      setIsSavingCombo(false);
      setComboNameInput('');
    }
  };

  return (
    <section aria-label={MEAL_SLOT_LABELS[slot]}>
      <Card className="overflow-hidden">
        {/* Cabeçalho da Refeição */}
        <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-blue-600 dark:text-blue-400">
              <SlotIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-extrabold text-foreground">
                  {MEAL_SLOT_LABELS[slot]}
                </h2>
                <Badge variant="secondary" className="tabular-nums">
                  {bucket.calories} kcal
                </Badge>
              </div>
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                P: {fmt1(bucket.proteinG)}g • C: {fmt1(bucket.carbsG)}g • G:{' '}
                {fmt1(bucket.fatG)}g
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={`Mais opções para ${MEAL_SLOT_LABELS[slot]}`}
                >
                  <MoreVertical className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onOpenScanner(slot)}>
                  <ScanBarcode className="text-blue-600 dark:text-blue-400" />
                  <span>Ler código de barras</span>
                </DropdownMenuItem>
                {yesterdayCount > 0 && (
                  <DropdownMenuItem onSelect={() => onCopyYesterday(slot)}>
                    <Copy />
                    <span>Copiar de ontem ({yesterdayCount})</span>
                  </DropdownMenuItem>
                )}
                {bucket.entries.length >= 2 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => {
                        setIsSavingCombo(true);
                        setComboNameInput(`${MEAL_SLOT_LABELS[slot]} Padrão`);
                      }}
                    >
                      <Bookmark className="text-blue-600 dark:text-blue-400" />
                      <span>Salvar combo</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={() => onOpenSearch(slot)}
              className="flex-1 text-xs sm:flex-initial"
            >
              <Plus className="size-4" />
              <span>Adicionar</span>
            </Button>
          </div>
        </div>

        {/* Mini-form inline para Salvar Combo */}
        {isSavingCombo && (
          <form
            onSubmit={handleComboSubmit}
            className="flex flex-col gap-2 border-b border-primary/30 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center"
          >
            <Input
              type="text"
              required
              autoFocus
              value={comboNameInput}
              onChange={(e) => setComboNameInput(e.target.value)}
              placeholder="Nome do combo (ex: Café Proteico)..."
              aria-label="Nome do combo para salvar"
              className="flex-1 bg-background"
            />
            <div className="flex gap-2">
              <Button type="submit" className="text-xs">
                <Check className="size-4" /> Salvar
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Cancelar salvar combo"
                onClick={() => setIsSavingCombo(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </form>
        )}

        {/* Lista de Alimentos Lançados */}
        {bucket.entries.length === 0 ? (
          <div className="flex items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground">
            <span>Nenhum alimento registrado nesta refeição.</span>
            <Button
              variant="secondary"
              onClick={() => onOpenScanner(slot)}
              aria-label={`Escanear código de barras para ${MEAL_SLOT_LABELS[slot]}`}
              className="shrink-0 px-3 text-xs"
            >
              <ScanBarcode className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Escanear</span>
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {bucket.entries.map((entry) => {
              const isEditing = editingEntryId === entry.id;
              const catalogFood = foodCatalogMap.get(entry.foodId);
              const supportsUnitMode = Boolean(
                catalogFood?.gramsPerUnit &&
                  catalogFood.gramsPerUnit > 0 &&
                  catalogFood.unitLabel
              );

              return (
                <li key={entry.id} className="px-4 py-3">
                  {isEditing ? (
                    <div className="space-y-2.5 rounded-xl border border-primary/40 bg-secondary/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-foreground">
                          {entry.foodName}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Cancelar edição da porção"
                          onClick={() => setEditingEntryId(null)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>

                      {supportsUnitMode && catalogFood && (
                        <div className="grid grid-cols-2 gap-1.5">
                          <Button
                            variant={
                              editingMode === 'grams' ? 'default' : 'outline'
                            }
                            onClick={() => {
                              setEditingMode('grams');
                              setEditingQty(Math.round(entry.totalGrams));
                            }}
                            className="text-xs"
                          >
                            {catalogFood.defaultUnit === 'ml'
                              ? 'ml'
                              : 'Gramas (g)'}
                          </Button>
                          <Button
                            variant={
                              editingMode === 'unit' ? 'default' : 'outline'
                            }
                            onClick={() => {
                              setEditingMode('unit');
                              setEditingQty(1);
                            }}
                            className="truncate px-2 text-xs"
                          >
                            {catalogFood.unitLabel}
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <DecimalInput
                          value={editingQty}
                          onChange={setEditingQty}
                          ariaLabel={`Editar quantidade de ${entry.foodName}`}
                          className="min-h-11 h-11 flex-1 rounded-xl border border-primary bg-background px-3 text-base font-extrabold text-foreground"
                        />
                        <Button
                          onClick={() => handleSaveEditEntry(entry.id)}
                          className="text-xs"
                        >
                          <Check className="size-4" /> Salvar
                        </Button>
                        <Button
                          variant="destructive-outline"
                          size="icon"
                          aria-label={`Remover ${entry.foodName}`}
                          onClick={() => {
                            onDeleteEntry(entry.id);
                            setEditingEntryId(null);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEditEntry(entry)}
                        className="group min-h-11 min-w-0 flex-1 cursor-pointer py-1 text-left"
                      >
                        <p className="truncate text-sm font-bold text-foreground transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {entry.foodName}
                          {entry.foodBrand && (
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              • {entry.foodBrand}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {entry.measureMode === 'unit' && entry.unitLabel
                            ? `${fmt1(entry.quantity)} × ${entry.unitLabel} (${fmt1(entry.totalGrams)}g)`
                            : `${fmt1(entry.totalGrams)}g`}{' '}
                          • P {fmt1(entry.proteinG)}g • C {fmt1(entry.carbsG)}g
                          • G {fmt1(entry.fatG)}g
                        </p>
                      </button>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="mr-1 text-sm font-extrabold tabular-nums text-foreground">
                          {entry.calories}{' '}
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            kcal
                          </span>
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Excluir ${entry.foodName}`}
                          onClick={() => onDeleteEntry(entry.id)}
                          className="text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
