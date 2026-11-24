'use client';

import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  Check,
  Edit3,
  Plus,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
  MealSlot,
  SavedMeal,
} from '@/types/nutrition';
import { useNutritionStore } from '@/store/useNutritionStore';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface SavedMealsModalProps {
  isOpen: boolean;
  date: string;
  defaultSlot?: MealSlot;
  onClose: () => void;
  onLogged?: (mealName: string, count: number, slot: MealSlot) => void;
}

const fmt1 = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

export function SavedMealsModal({
  isOpen,
  date,
  defaultSlot = 'lunch',
  onClose,
  onLogged,
}: SavedMealsModalProps) {
  const savedMeals = useNutritionStore((s) => s.savedMeals);
  const logSavedMeal = useNutritionStore((s) => s.logSavedMeal);
  const renameSavedMeal = useNutritionStore((s) => s.renameSavedMeal);
  const deleteSavedMeal = useNutritionStore((s) => s.deleteSavedMeal);

  const [targetSlot, setTargetSlot] = useState<MealSlot>(defaultSlot);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [mealToDelete, setMealToDelete] = useState<SavedMeal | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTargetSlot(defaultSlot);
    }
  }, [isOpen, defaultSlot]);

  const getMealTotals = (meal: SavedMeal) => {
    let calories = 0;
    let proteinG = 0;
    let carbsG = 0;
    let fatG = 0;
    for (const item of meal.items) {
      calories += item.calories;
      proteinG += item.proteinG;
      carbsG += item.carbsG;
      fatG += item.fatG;
    }
    return { calories: Math.round(calories), proteinG, carbsG, fatG };
  };

  const handleLog = (meal: SavedMeal) => {
    const count = logSavedMeal(meal.id, date, targetSlot);
    if (count > 0) {
      if (onLogged) {
        onLogged(meal.name, count, targetSlot);
      } else {
        toast.success(
          `Combo "${meal.name}" (${count} itens) lançado em ${MEAL_SLOT_LABELS[targetSlot]}!`
        );
      }
      onClose();
    }
  };

  const handleSaveRename = (mealId: string) => {
    const trimmed = editingName.trim();
    if (trimmed) {
      renameSavedMeal(mealId, trimmed);
      toast.success(`Combo renomeado para "${trimmed}"!`);
    }
    setEditingId(null);
    setEditingName('');
  };

  return (
    <>
      <ResponsiveDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <ResponsiveDialogContent className="sm:max-w-xl">
          <ResponsiveDialogHeader className="shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-blue-600 dark:text-blue-400">
                <Bookmark className="size-5" />
              </div>
              <div className="min-w-0">
                <ResponsiveDialogTitle className="truncate">
                  Refeições Salvas &amp; Combos
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Lance suas combinações favoritas em 1 toque
                </ResponsiveDialogDescription>
              </div>
            </div>
          </ResponsiveDialogHeader>

          {/* Seletor de Refeição Destino */}
          <div className="shrink-0 space-y-1.5 border-b border-border bg-secondary/40 px-5 py-3">
            <Label htmlFor="saved-meals-target-slot">Lançar combo em:</Label>
            <Select
              value={targetSlot}
              onValueChange={(val) => setTargetSlot(val as MealSlot)}
            >
              <SelectTrigger
                id="saved-meals-target-slot"
                aria-label="Selecionar refeição destino"
              >
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

          {/* Lista de Combos */}
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {savedMeals.length === 0 ? (
              <Card className="space-y-3 border-dashed bg-secondary/40 px-4 py-10 text-center">
                <Utensils className="mx-auto size-9 text-muted-foreground" />
                <h3 className="text-sm font-bold text-foreground">
                  Nenhum combo salvo ainda
                </h3>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Adicione 2 ou mais alimentos em qualquer refeição do seu
                  diário e toque em{' '}
                  <strong className="text-foreground">
                    &ldquo;Salvar combo&rdquo;
                  </strong>{' '}
                  para reutilizar no dia seguinte em 1 toque.
                </p>
              </Card>
            ) : (
              savedMeals.map((meal) => {
                const totals = getMealTotals(meal);
                const isEditing = editingId === meal.id;

                return (
                  <Card
                    key={meal.id}
                    className="space-y-3 bg-secondary/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {isEditing ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveRename(meal.id);
                          }}
                          className="flex flex-1 items-center gap-2"
                        >
                          <Input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            autoFocus
                            aria-label="Novo nome do combo"
                            className="flex-1 border-primary bg-background font-bold"
                          />
                          <Button
                            type="submit"
                            size="icon"
                            aria-label="Confirmar nome"
                            className="shrink-0"
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Cancelar renomeação"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName('');
                            }}
                            className="shrink-0"
                          >
                            <X className="size-4" />
                          </Button>
                        </form>
                      ) : (
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-extrabold text-foreground">
                              {meal.name}
                            </h3>
                            <Badge variant="info" className="tabular-nums">
                              {totals.calories} kcal
                            </Badge>
                          </div>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            P: {fmt1(totals.proteinG)}g • C:{' '}
                            {fmt1(totals.carbsG)}g • G: {fmt1(totals.fatG)}g
                          </p>
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Renomear ${meal.name}`}
                            onClick={() => {
                              setEditingId(meal.id);
                              setEditingName(meal.name);
                            }}
                          >
                            <Edit3 className="size-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label={`Excluir ${meal.name}`}
                            onClick={() => setMealToDelete(meal)}
                            className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/15 hover:text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {meal.items.map((item, idx) => (
                        <li
                          key={`${meal.id}-item-${idx}`}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate text-foreground/90">
                            • {item.foodName}{' '}
                            <span className="text-muted-foreground">
                              (
                              {item.measureMode === 'unit' && item.unitLabel
                                ? `${fmt1(item.quantity)} × ${item.unitLabel}`
                                : `${fmt1(item.totalGrams)}g`}
                              )
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-foreground">
                            {item.calories} kcal
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleLog(meal)}
                      className="w-full text-xs"
                    >
                      <Plus className="size-4" />
                      Lançar em {MEAL_SLOT_LABELS[targetSlot]} (
                      {meal.items.length}{' '}
                      {meal.items.length === 1 ? 'item' : 'itens'})
                    </Button>
                  </Card>
                );
              })
            )}
          </div>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={mealToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setMealToDelete(null);
        }}
        title="Excluir refeição salva?"
        description={`Deseja excluir a refeição salva "${mealToDelete?.name ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={() => {
          if (mealToDelete) {
            deleteSavedMeal(mealToDelete.id);
            toast.success(`Combo "${mealToDelete.name}" excluído.`);
            setMealToDelete(null);
          }
        }}
      />
    </>
  );
}
