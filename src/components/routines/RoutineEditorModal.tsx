'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Dumbbell,
  Layers,
  Plus,
  Search,
  Timer,
  Trash2,
  X,
} from 'lucide-react';
import {
  EQUIPMENT_LABELS,
  EquipmentType,
  Exercise,
  MUSCLE_LABELS,
  MuscleGroup,
  RoutineFolder,
  SetType,
  WorkoutExercise,
} from '@/types/workout';
import {
  convertWeightFromKg,
  convertWeightToKg,
  createDefaultSetValues,
  getWeightUnitLabel,
} from '@/lib/calculations';
import { searchExerciseDB } from '@/lib/exercisedb';
import {
  DecimalInput,
  IntegerInput,
} from '@/components/ui/NumericInputs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

const uid = (p = 'id') =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];
const REST_TIMER_PRESETS = [0, 30, 45, 60, 90, 120, 180, 240, 300];

const NO_FOLDER_VALUE = '__none__';
const NO_SUPERSET_VALUE = '__none__';

export interface RoutineDraft {
  id?: string;
  title: string;
  folderId: string | null;
  description: string;
  exercises: WorkoutExercise[];
}

export interface RoutineEditorModalProps {
  initialRoutine: RoutineDraft | null;
  folders: RoutineFolder[];
  exercises: Exercise[];
  weightUnit: 'kg' | 'lbs';
  defaultRestSeconds: number;
  onClose: () => void;
  onSave: (routine: RoutineDraft) => void;
  onCreateCustomExercise: (
    exercise: Omit<Exercise, 'id' | 'isCustom'>
  ) => Exercise;
  onImportExercisesBatch: (incoming: Exercise[]) => number;
}

function formatRestOptionLabel(seconds: number): string {
  if (seconds <= 0) return 'Sem descanso';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${mins}min` : `${mins}min ${rem}s`;
}

export function RoutineEditorModal({
  initialRoutine,
  folders,
  exercises,
  weightUnit,
  defaultRestSeconds,
  onClose,
  onSave,
  onCreateCustomExercise,
  onImportExercisesBatch,
}: RoutineEditorModalProps) {
  const [draft, setDraft] = useState<RoutineDraft | null>(initialRoutine);
  const [showExSearch, setShowExSearch] = useState(false);
  const [exQuery, setExQuery] = useState('');
  const [quickExMuscle, setQuickExMuscle] = useState<MuscleGroup>('chest');
  const [quickExEquip, setQuickExEquip] = useState<EquipmentType>('barbell');

  const unitLabel = getWeightUnitLabel(weightUnit);

  useEffect(() => {
    setDraft(initialRoutine);
    setShowExSearch(false);
    setExQuery('');
    setQuickExMuscle('chest');
    setQuickExEquip('barbell');
  }, [initialRoutine]);

  useEffect(() => {
    const q = exQuery.trim();
    if (!showExSearch || q.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await searchExerciseDB(q);
      if (!cancelled && results.length > 0) {
        onImportExercisesBatch(results);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exQuery, showExSearch, onImportExercisesBatch]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );

  const filteredCatalog = useMemo(() => {
    const q = exQuery.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.englishTitle && e.englishTitle.toLowerCase().includes(q)) ||
        MUSCLE_LABELS[e.primaryMuscle].toLowerCase().includes(q)
    );
  }, [exercises, exQuery]);

  if (!draft) return null;

  const addExerciseToDraft = (exerciseId: string) => {
    const meta = exerciseMap.get(exerciseId);
    const defaults = createDefaultSetValues(meta?.measurementType);
    const nextEx: WorkoutExercise = {
      id: uid('re'),
      exerciseId,
      supersetId: null,
      restTimerSeconds: defaultRestSeconds || 90,
      notes: '',
      sets: [
        { id: uid('s'), type: 'normal', ...defaults, completed: false },
        { id: uid('s'), type: 'normal', ...defaults, completed: false },
        { id: uid('s'), type: 'normal', ...defaults, completed: false },
      ],
    };
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            exercises: [...prev.exercises, nextEx],
          }
        : null
    );
    setShowExSearch(false);
    setExQuery('');
  };

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    setDraft((prev) => {
      if (!prev) return null;
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.exercises.length) return prev;
      const next = [...prev.exercises];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return { ...prev, exercises: next };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    onSave({
      id: draft.id,
      title: draft.title.trim(),
      folderId: draft.folderId,
      description: draft.description.trim(),
      exercises: draft.exercises,
    });
  };

  return (
    <ResponsiveDialog
      open={Boolean(draft)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-3xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {draft.id ? 'Editar Rotina' : 'Criar Nova Rotina'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Defina exercícios, ordem, supersets, descanso e metas de carga ou
            repetições.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="routine-editor-title">Título da Rotina *</Label>
                <Input
                  id="routine-editor-title"
                  type="text"
                  required
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      title: e.target.value,
                    })
                  }
                  placeholder="Ex: Treino A — Superiores"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="routine-editor-folder">Pasta</Label>
                <Select
                  value={draft.folderId ?? NO_FOLDER_VALUE}
                  onValueChange={(value) =>
                    setDraft({
                      ...draft,
                      folderId: value === NO_FOLDER_VALUE ? null : value,
                    })
                  }
                >
                  <SelectTrigger id="routine-editor-folder">
                    <SelectValue placeholder="Sem Pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FOLDER_VALUE}>Sem Pasta</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="routine-editor-description">
                Descrição / Observações da Rotina
              </Label>
              <Input
                id="routine-editor-description"
                type="text"
                value={draft.description}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    description: e.target.value,
                  })
                }
                placeholder="Observações..."
              />
            </div>

            <div className="space-y-4">
              {draft.exercises.map((ex, exIdx) => {
                const meta = exerciseMap.get(ex.exerciseId);
                const restOptions = REST_TIMER_PRESETS.includes(
                  ex.restTimerSeconds
                )
                  ? REST_TIMER_PRESETS
                  : [...REST_TIMER_PRESETS, ex.restTimerSeconds].sort(
                      (a, b) => a - b
                    );

                return (
                  <Card
                    key={ex.id}
                    className="bg-secondary/40 p-4 space-y-3 shadow-none"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Dumbbell className="size-4 text-primary shrink-0" />
                          <span className="font-bold text-sm text-foreground leading-snug">
                            {meta?.title || 'Exercício'}
                          </span>
                          {ex.supersetId && (
                            <Badge variant="purple" className="text-[10px]">
                              Superset {ex.supersetId === 1 ? 'A' : 'B'}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={exIdx === 0}
                            onClick={() => moveExercise(exIdx, 'up')}
                            aria-label="Mover exercício para cima"
                            title="Mover para cima"
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={exIdx === draft.exercises.length - 1}
                            onClick={() => moveExercise(exIdx, 'down')}
                            aria-label="Mover exercício para baixo"
                            title="Mover para baixo"
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setDraft({
                                ...draft,
                                exercises: draft.exercises.filter(
                                  (_, i) => i !== exIdx
                                ),
                              })
                            }
                            aria-label="Remover exercício"
                            title="Remover exercício"
                            className="hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Select
                          value={
                            ex.supersetId
                              ? String(ex.supersetId)
                              : NO_SUPERSET_VALUE
                          }
                          onValueChange={(value) => {
                            const updated = [...draft.exercises];
                            updated[exIdx] = {
                              ...ex,
                              supersetId:
                                value === NO_SUPERSET_VALUE
                                  ? null
                                  : Number(value),
                            };
                            setDraft({
                              ...draft,
                              exercises: updated,
                            });
                          }}
                        >
                          <SelectTrigger
                            aria-label="Superset"
                            className="bg-card"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Layers className="size-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_SUPERSET_VALUE}>
                              Sem Superset
                            </SelectItem>
                            <SelectItem value="1">Superset A</SelectItem>
                            <SelectItem value="2">Superset B</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select
                          value={String(ex.restTimerSeconds)}
                          onValueChange={(value) => {
                            const updated = [...draft.exercises];
                            updated[exIdx] = {
                              ...ex,
                              restTimerSeconds: Number(value),
                            };
                            setDraft({
                              ...draft,
                              exercises: updated,
                            });
                          }}
                        >
                          <SelectTrigger
                            aria-label="Descanso entre séries"
                            className="bg-card"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Timer className="size-3.5 text-primary shrink-0" />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {restOptions.map((secs) => (
                              <SelectItem key={secs} value={String(secs)}>
                                Descanso: {formatRestOptionLabel(secs)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {ex.sets.map((s, sIdx) => (
                        <div
                          key={s.id}
                          className="bg-card border border-border p-2.5 rounded-xl space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center"
                        >
                          <div className="flex items-center gap-2 sm:col-span-4">
                            <Select
                              value={s.type}
                              onValueChange={(value) => {
                                const nextType = value as SetType;
                                setDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        exercises: prev.exercises.map(
                                          (item, i) =>
                                            i === exIdx
                                              ? {
                                                  ...item,
                                                  sets: item.sets.map(
                                                    (st, j) =>
                                                      j === sIdx
                                                        ? {
                                                            ...st,
                                                            type: nextType,
                                                          }
                                                        : st
                                                  ),
                                                }
                                              : item
                                        ),
                                      }
                                    : null
                                );
                              }}
                            >
                              <SelectTrigger aria-label={`Tipo da série ${sIdx + 1}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="normal">
                                  Série {sIdx + 1}
                                </SelectItem>
                                <SelectItem value="warmup">
                                  W (Aquecimento)
                                </SelectItem>
                                <SelectItem value="dropset">
                                  D (Dropset)
                                </SelectItem>
                                <SelectItem value="failure">
                                  F (Falha)
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remover série"
                              onClick={() => {
                                setDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        exercises: prev.exercises.map(
                                          (item, i) =>
                                            i === exIdx
                                              ? {
                                                  ...item,
                                                  sets: item.sets.filter(
                                                    (_, j) => j !== sIdx
                                                  ),
                                                }
                                              : item
                                        ),
                                      }
                                    : null
                                );
                              }}
                              className="sm:hidden shrink-0 hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 sm:col-span-7">
                            <div className="flex items-center gap-1.5">
                              {meta?.measurementType ===
                              'distance_duration' ? (
                                <>
                                  <DecimalInput
                                    value={s.distanceKm ?? 0}
                                    ariaLabel="Distância (km)"
                                    onChange={(val) => {
                                      setDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              exercises: prev.exercises.map(
                                                (item, i) =>
                                                  i === exIdx
                                                    ? {
                                                        ...item,
                                                        sets: item.sets.map(
                                                          (st, j) =>
                                                            j === sIdx
                                                              ? {
                                                                  ...st,
                                                                  distanceKm:
                                                                    val ?? 0,
                                                                }
                                                              : st
                                                        ),
                                                      }
                                                    : item
                                              ),
                                            }
                                          : null
                                      );
                                    }}
                                    className="w-full h-11 text-center rounded-xl border border-input bg-secondary/70 px-2 text-foreground font-bold"
                                  />
                                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                                    km
                                  </span>
                                </>
                              ) : (
                                <>
                                  <DecimalInput
                                    value={
                                      convertWeightFromKg(
                                        s.weightKg ?? 0,
                                        weightUnit
                                      ) ?? 0
                                    }
                                    ariaLabel={`Peso (${unitLabel})`}
                                    onChange={(val) => {
                                      const kgVal =
                                        convertWeightToKg(
                                          val ?? 0,
                                          weightUnit
                                        ) ?? 0;
                                      setDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              exercises: prev.exercises.map(
                                                (item, i) =>
                                                  i === exIdx
                                                    ? {
                                                        ...item,
                                                        sets: item.sets.map(
                                                          (st, j) =>
                                                            j === sIdx
                                                              ? {
                                                                  ...st,
                                                                  weightKg:
                                                                    kgVal,
                                                                }
                                                              : st
                                                        ),
                                                      }
                                                    : item
                                              ),
                                            }
                                          : null
                                      );
                                    }}
                                    className="w-full h-11 text-center rounded-xl border border-input bg-secondary/70 px-2 text-foreground font-bold"
                                  />
                                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                                    {unitLabel}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {meta?.measurementType === 'duration' ||
                              meta?.measurementType ===
                                'distance_duration' ? (
                                <>
                                  <IntegerInput
                                    value={s.durationSeconds ?? 30}
                                    ariaLabel="Duração (segundos)"
                                    onChange={(val) => {
                                      setDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              exercises: prev.exercises.map(
                                                (item, i) =>
                                                  i === exIdx
                                                    ? {
                                                        ...item,
                                                        sets: item.sets.map(
                                                          (st, j) =>
                                                            j === sIdx
                                                              ? {
                                                                  ...st,
                                                                  durationSeconds:
                                                                    val ?? 0,
                                                                }
                                                              : st
                                                        ),
                                                      }
                                                    : item
                                              ),
                                            }
                                          : null
                                      );
                                    }}
                                    className="w-full h-11 text-center rounded-xl border border-input bg-secondary/70 px-2 text-foreground font-bold"
                                  />
                                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                                    seg
                                  </span>
                                </>
                              ) : (
                                <>
                                  <IntegerInput
                                    value={s.reps ?? 10}
                                    ariaLabel="Repetições"
                                    onChange={(val) => {
                                      setDraft((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              exercises: prev.exercises.map(
                                                (item, i) =>
                                                  i === exIdx
                                                    ? {
                                                        ...item,
                                                        sets: item.sets.map(
                                                          (st, j) =>
                                                            j === sIdx
                                                              ? {
                                                                  ...st,
                                                                  reps:
                                                                    val ?? 0,
                                                                }
                                                              : st
                                                        ),
                                                      }
                                                    : item
                                              ),
                                            }
                                          : null
                                      );
                                    }}
                                    className="w-full h-11 text-center rounded-xl border border-input bg-secondary/70 px-2 text-foreground font-bold"
                                  />
                                  <span className="text-xs font-semibold text-muted-foreground shrink-0">
                                    reps
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="hidden sm:flex sm:col-span-1 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remover série"
                              onClick={() => {
                                setDraft((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        exercises: prev.exercises.map(
                                          (item, i) =>
                                            i === exIdx
                                              ? {
                                                  ...item,
                                                  sets: item.sets.filter(
                                                    (_, j) => j !== sIdx
                                                  ),
                                                }
                                              : item
                                        ),
                                      }
                                    : null
                                );
                              }}
                              className="hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => {
                        setDraft((prev) =>
                          prev
                            ? {
                                ...prev,
                                exercises: prev.exercises.map((item, i) => {
                                  if (i !== exIdx) return item;
                                  const last =
                                    item.sets[item.sets.length - 1];
                                  const defaults = createDefaultSetValues(
                                    meta?.measurementType,
                                    last
                                  );
                                  return {
                                    ...item,
                                    sets: [
                                      ...item.sets,
                                      {
                                        id: uid('s'),
                                        type: 'normal',
                                        ...defaults,
                                        completed: false,
                                      },
                                    ],
                                  };
                                }),
                              }
                            : null
                        );
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2"
                    >
                      <Plus className="size-4" /> Adicionar Série
                    </Button>
                  </Card>
                );
              })}

              {showExSearch ? (
                <Card className="bg-secondary/40 p-3.5 space-y-3 shadow-none">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="size-4 text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        type="text"
                        autoFocus
                        value={exQuery}
                        onChange={(e) => setExQuery(e.target.value)}
                        placeholder="Digite o nome do exercício para buscar ou criar..."
                        className="pl-10 bg-card"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Fechar busca de exercício"
                      onClick={() => setShowExSearch(false)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>

                  {exQuery.trim().length > 0 && (
                    <Card className="p-3 space-y-2.5 shadow-none">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Select
                          value={quickExMuscle}
                          onValueChange={(value) =>
                            setQuickExMuscle(value as MuscleGroup)
                          }
                        >
                          <SelectTrigger aria-label="Músculo do novo exercício">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MUSCLE_OPTIONS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {MUSCLE_LABELS[m]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={quickExEquip}
                          onValueChange={(value) =>
                            setQuickExEquip(value as EquipmentType)
                          }
                        >
                          <SelectTrigger aria-label="Equipamento do novo exercício">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {EQUIPMENT_OPTIONS.map((eq) => (
                              <SelectItem key={eq} value={eq}>
                                {EQUIPMENT_LABELS[eq]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        onClick={() => {
                          const created = onCreateCustomExercise({
                            title: exQuery.trim(),
                            primaryMuscle: quickExMuscle,
                            secondaryMuscles: [],
                            equipment: quickExEquip,
                            measurementType: 'weight_reps',
                            instructions: [],
                          });
                          addExerciseToDraft(created.id);
                        }}
                        className="w-full text-xs"
                      >
                        + Criar &ldquo;{exQuery.trim()}&rdquo; e Adicionar
                      </Button>
                    </Card>
                  )}

                  <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                    {filteredCatalog.map((e) => (
                      <button
                        type="button"
                        key={e.id}
                        onClick={() => addExerciseToDraft(e.id)}
                        className="w-full min-h-11 text-left px-3 py-2 rounded-xl hover:bg-secondary text-xs text-foreground flex items-center justify-between gap-2 transition-colors cursor-pointer"
                      >
                        <span className="font-semibold truncate">
                          {e.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-medium shrink-0"
                        >
                          {MUSCLE_LABELS[e.primaryMuscle]} •{' '}
                          {EQUIPMENT_LABELS[e.equipment]}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowExSearch(true)}
                  className="w-full border-dashed border-primary/50 text-blue-600 dark:text-blue-400 hover:bg-primary/10 hover:text-blue-700 dark:hover:text-blue-300 text-xs"
                >
                  <Plus className="size-4" /> Adicionar Exercício à Rotina
                </Button>
              )}
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar Rotina</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
