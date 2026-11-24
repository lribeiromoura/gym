'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, WifiOff, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  EQUIPMENT_LABELS,
  EquipmentType,
  Exercise,
  MUSCLE_LABELS,
  MuscleGroup,
} from '@/types/workout';
import { searchExerciseDBWithStatus } from '@/lib/exercisedb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExerciseIllustrationBadge } from '@/components/workout/MiniAnatomyFigures';

const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

export interface ExercisePickerState {
  mode: 'add' | 'replace';
  targetWorkoutExerciseId?: string;
}

export interface ExercisePickerDialogProps {
  pickerState: ExercisePickerState | null;
  exercises: Exercise[];
  onClose: () => void;
  onSelectExercise: (
    exerciseId: string,
    pickerState: ExercisePickerState
  ) => void;
  onCreateAndSelectExercise: (
    data: {
      title: string;
      primaryMuscle: MuscleGroup;
      equipment: EquipmentType;
    },
    pickerState: ExercisePickerState
  ) => void;
  onImportExercisesBatch: (results: Exercise[]) => void;
}

export function ExercisePickerDialog({
  pickerState,
  exercises,
  onClose,
  onSelectExercise,
  onCreateAndSelectExercise,
  onImportExercisesBatch,
}: ExercisePickerDialogProps) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [quickExMuscle, setQuickExMuscle] = useState<MuscleGroup>('chest');
  const [quickExEquip, setQuickExEquip] = useState<EquipmentType>('barbell');

  const isOpen = Boolean(pickerState);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setMuscleFilter('all');
      setEquipmentFilter('all');
      setIsSearchingOnline(false);
      setIsOffline(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = search.trim();
    if (!isOpen || q.length < 3) {
      setIsSearchingOnline(false);
      return;
    }
    let cancelled = false;
    setIsSearchingOnline(true);
    const timer = setTimeout(async () => {
      try {
        const { exercises: results, isOffline: offline } =
          await searchExerciseDBWithStatus(q);
        if (!cancelled) {
          setIsOffline(offline);
          if (results.length > 0) {
            onImportExercisesBatch(results);
          }
        }
      } finally {
        if (!cancelled) {
          setIsSearchingOnline(false);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, isOpen, onImportExercisesBatch]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return exercises.filter((e) => {
      if (muscleFilter !== 'all' && e.primaryMuscle !== muscleFilter) {
        return false;
      }
      if (equipmentFilter !== 'all' && e.equipment !== equipmentFilter) {
        return false;
      }
      if (!query) return true;
      return (
        e.title.toLowerCase().includes(query) ||
        Boolean(e.englishTitle && e.englishTitle.toLowerCase().includes(query)) ||
        MUSCLE_LABELS[e.primaryMuscle].toLowerCase().includes(query) ||
        EQUIPMENT_LABELS[e.equipment].toLowerCase().includes(query)
      );
    });
  }, [exercises, search, muscleFilter, equipmentFilter]);

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-lg h-[88vh] sm:h-auto sm:max-h-[85vh]">
        {pickerState && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                {pickerState.mode === 'replace'
                  ? 'Substituir Exercício'
                  : 'Adicionar Exercício'}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Busque na biblioteca local ou online, filtre por músculo ou crie
                um exercício rápido
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            {/* Barra de busca e filtros fixos no topo do modal */}
            <div className="px-5 py-3 border-b border-border space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar exercício..."
                  aria-label="Buscar exercício"
                  className="pl-10 pr-12"
                />
                {search.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Limpar busca"
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={muscleFilter} onValueChange={setMuscleFilter}>
                  <SelectTrigger aria-label="Filtrar por músculo">
                    <SelectValue placeholder="Músculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os músculos</SelectItem>
                    {MUSCLE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MUSCLE_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={equipmentFilter}
                  onValueChange={setEquipmentFilter}
                >
                  <SelectTrigger aria-label="Filtrar por equipamento">
                    <SelectValue placeholder="Equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os equipamentos</SelectItem>
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <SelectItem key={eq} value={eq}>
                        {EQUIPMENT_LABELS[eq]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isSearchingOnline && (
                <div className="px-3 py-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-700 dark:text-sky-400 text-xs font-semibold flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Buscando na biblioteca online ExerciseDB...</span>
                </div>
              )}

              {isOffline && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  <span>
                    Modo Offline: exibindo exercícios do catálogo local salvo no
                    aparelho.
                  </span>
                </div>
              )}
            </div>

            {/* Lista rolável + criação rápida */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {search.trim().length > 0 && (
                <div className="bg-secondary/50 border border-border rounded-2xl p-3.5 space-y-2.5 mb-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Criar &ldquo;{search.trim()}&rdquo; como novo exercício:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={quickExMuscle}
                      onValueChange={(v) => setQuickExMuscle(v as MuscleGroup)}
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
                      onValueChange={(v) =>
                        setQuickExEquip(v as EquipmentType)
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
                    className="w-full text-xs"
                    onClick={() => {
                      const title = search.trim();
                      onCreateAndSelectExercise(
                        {
                          title,
                          primaryMuscle: quickExMuscle,
                          equipment: quickExEquip,
                        },
                        pickerState
                      );
                      toast.success(`"${title}" criado e adicionado!`);
                      onClose();
                    }}
                  >
                    <Plus className="w-4 h-4" /> Criar e Adicionar
                  </Button>
                </div>
              )}

              {filteredExercises.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Nenhum exercício encontrado com esses filtros.
                </div>
              ) : (
                filteredExercises.map((ex) => (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      onSelectExercise(ex.id, pickerState);
                      onClose();
                    }}
                    className="w-full min-h-11 text-left p-3 rounded-2xl hover:bg-secondary flex items-center justify-between gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ExerciseIllustrationBadge
                        muscle={ex.primaryMuscle}
                        gifUrl={ex.gifUrl}
                        title={ex.title}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {ex.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {MUSCLE_LABELS[ex.primaryMuscle]} •{' '}
                          {EQUIPMENT_LABELS[ex.equipment]}
                        </p>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
