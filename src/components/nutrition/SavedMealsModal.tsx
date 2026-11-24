'use client';

import React, { useState } from 'react';
import {
  Bookmark,
  Check,
  Edit3,
  Plus,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import {
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
  MealSlot,
  SavedMeal,
} from '@/types/nutrition';
import { useNutritionStore } from '@/store/useNutritionStore';

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

  if (!isOpen) return null;

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
      onLogged?.(meal.name, count, targetSlot);
      onClose();
    }
  };

  const handleSaveRename = (mealId: string) => {
    if (editingName.trim()) {
      renameSavedMeal(mealId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
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
        aria-labelledby="saved-meals-modal-title"
        className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-[#3B82F6] flex items-center justify-center shrink-0">
              <Bookmark className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="saved-meals-modal-title"
                className="text-base sm:text-lg font-extrabold text-slate-900 truncate"
              >
                Refeições Salvas & Combos
              </h2>
              <p className="text-xs text-slate-500">
                Lance suas combinações favoritas em 1 toque
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar refeições salvas"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de Refeição Destino */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 space-y-1.5 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Lançar combo em:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {MEAL_SLOTS_ORDER.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setTargetSlot(slot)}
                className={`min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  targetSlot === slot
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {MEAL_SLOT_LABELS[slot]}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de Combos */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {savedMeals.length === 0 ? (
            <div className="py-10 px-4 text-center space-y-3 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
              <Utensils className="w-9 h-9 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                Nenhum combo salvo ainda
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Adicione 2 ou mais alimentos em qualquer refeição do seu diário e
                toque em <strong>&ldquo;Salvar combo&rdquo;</strong> para
                reutilizar no dia seguinte em 1 toque.
              </p>
            </div>
          ) : (
            savedMeals.map((meal) => {
              const totals = getMealTotals(meal);
              const isEditing = editingId === meal.id;

              return (
                <div
                  key={meal.id}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    {isEditing ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSaveRename(meal.id);
                        }}
                        className="flex-1 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          autoFocus
                          aria-label="Novo nome do combo"
                          className="flex-1 h-11 px-3 rounded-xl bg-white border border-[#3B82F6] text-base font-bold text-slate-900 focus:outline-none"
                        />
                        <button
                          type="submit"
                          aria-label="Confirmar nome"
                          className="w-11 h-11 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                          {meal.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                          <strong className="text-slate-900">
                            {totals.calories} kcal
                          </strong>{' '}
                          • P: {fmt1(totals.proteinG)}g • C:{' '}
                          {fmt1(totals.carbsG)}g • G: {fmt1(totals.fatG)}g
                        </p>
                      </div>
                    )}

                    {!isEditing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Renomear ${meal.name}`}
                          onClick={() => {
                            setEditingId(meal.id);
                            setEditingName(meal.name);
                          }}
                          className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Excluir ${meal.name}`}
                          onClick={() => {
                            if (
                              confirm(
                                `Deseja excluir a refeição salva "${meal.name}"?`
                              )
                            ) {
                              deleteSavedMeal(meal.id);
                            }
                          }}
                          className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-500 flex items-center justify-center transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-1 text-xs text-slate-600">
                    {meal.items.map((item, idx) => (
                      <li
                        key={`${meal.id}-item-${idx}`}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          • {item.foodName}{' '}
                          <span className="text-slate-400">
                            (
                            {item.measureMode === 'unit' && item.unitLabel
                              ? `${fmt1(item.quantity)} × ${item.unitLabel}`
                              : `${fmt1(item.totalGrams)}g`}
                            )
                          </span>
                        </span>
                        <span className="font-semibold text-slate-700 shrink-0 tabular-nums">
                          {item.calories} kcal
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => handleLog(meal)}
                    className="w-full h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    Lançar em {MEAL_SLOT_LABELS[targetSlot]} ({meal.items.length}{' '}
                    {meal.items.length === 1 ? 'item' : 'itens'})
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
