'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight,
  DownloadCloud,
  Dumbbell,
  Filter,
  Loader2,
  Plus,
  Search,
  Trophy,
  WifiOff,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EQUIPMENT_LABELS,
  EquipmentType,
  Exercise,
  MUSCLE_LABELS,
  MuscleGroup,
} from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { calculate1RM, formatWeightWithUnit } from '@/lib/calculations';
import {
  fetchExerciseDBCatalog,
  searchExerciseDBWithStatus,
} from '@/lib/exercisedb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ExerciseDetailModal } from './ExerciseDetailModal';
import { CreateExerciseDialog } from './CreateExerciseDialog';

const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

export function ExercisesView() {
  const exercises = useWorkoutStore((s) => s.exercises);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const settings = useWorkoutStore((s) => s.settings);
  const addExerciseToActiveWorkout = useWorkoutStore(
    (s) => s.addExerciseToActiveWorkout
  );
  const addCustomExercise = useWorkoutStore((s) => s.addCustomExercise);
  const importExercisesBatch = useWorkoutStore((s) => s.importExercisesBatch);
  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  // Memoiza o melhor 1RM de cada exercício em uma única passagem pelo histórico (O(H*S))
  const best1RMByExerciseId = useMemo(() => {
    const map = new Map<string, number>();
    for (const session of workoutHistory) {
      for (const ex of session.exercises) {
        for (const s of ex.sets) {
          if (!s.completed || s.type === 'warmup') continue;
          const est = calculate1RM(s.weightKg, s.reps);
          if (est > (map.get(ex.exerciseId) ?? 0)) {
            map.set(ex.exerciseId, est);
          }
        }
      }
    }
    return map;
  }, [workoutHistory]);

  const [failedGifIds, setFailedGifIds] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    'all'
  );
  const [selectedEquipment, setSelectedEquipment] = useState<
    EquipmentType | 'all'
  >('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [isOfflineSearch, setIsOfflineSearch] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [catalogOffset, setCatalogOffset] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOfflineSearch(!navigator.onLine);
    };
    if (typeof window !== 'undefined') {
      updateOnlineStatus();
      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, []);

  // Busca automática na API ExerciseDB (traduzindo pt-BR <-> EN) ao digitar na busca
  useEffect(() => {
    const q = search.trim();
    if (q.length < 3) {
      setIsSearchingApi(false);
      return;
    }

    let cancelled = false;
    setIsSearchingApi(true);
    const timer = setTimeout(async () => {
      const { exercises: results, isOffline } =
        await searchExerciseDBWithStatus(q);
      if (!cancelled) {
        setIsOfflineSearch(isOffline);
        if (results.length > 0) {
          importExercisesBatch(results);
        }
        setIsSearchingApi(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, importExercisesBatch]);

  const handleSyncFromExerciseDB = async () => {
    if (isSyncingCatalog) return;
    setIsSyncingCatalog(true);
    try {
      const { exercises: batch, hasNextPage } = await fetchExerciseDBCatalog(
        catalogOffset,
        25
      );
      if (batch.length > 0) {
        const added = importExercisesBatch(batch);
        setCatalogOffset((prev) => (hasNextPage ? prev + 25 : 0));
        if (added > 0) {
          toast.success(`+${added} exercícios c/ GIF importados em pt-BR!`);
        } else {
          toast.info('Lote sincronizado (GIFs atualizados)!');
        }
      } else {
        toast.error('Não foi possível conectar à ExerciseDB no momento.');
      }
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      const matchesSearch =
        !q ||
        ex.title.toLowerCase().includes(q) ||
        (ex.englishTitle && ex.englishTitle.toLowerCase().includes(q)) ||
        MUSCLE_LABELS[ex.primaryMuscle].toLowerCase().includes(q);
      const matchesMuscle =
        selectedMuscle === 'all' ||
        ex.primaryMuscle === selectedMuscle ||
        ex.secondaryMuscles.includes(selectedMuscle);
      const matchesEquip =
        selectedEquipment === 'all' || ex.equipment === selectedEquipment;
      return matchesSearch && matchesMuscle && matchesEquip;
    });
  }, [exercises, search, selectedMuscle, selectedEquipment]);

  const handleCreateCustomExercise = (
    payload: Omit<Exercise, 'id' | 'isCustom'>
  ) => {
    const created = addCustomExercise(payload);
    toast.success(`Exercício "${created.title}" adicionado à biblioteca!`);
  };

  const handleAddToActiveWorkout = (ex: Exercise) => {
    addExerciseToActiveWorkout(ex.id);
    toast.success(`"${ex.title}" adicionado ao treino ativo!`);
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Biblioteca de Exercícios
          </h1>
          <p className="text-sm text-muted-foreground">
            {exercises.length}{' '}
            {exercises.length === 1
              ? 'exercício disponível em pt-BR'
              : 'exercícios disponíveis em pt-BR (integrado à ExerciseDB)'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleSyncFromExerciseDB}
            disabled={isSyncingCatalog}
            className="rounded-full bg-primary/15 border-primary/30 text-blue-700 dark:text-blue-400 hover:bg-primary/25 text-xs sm:text-sm"
          >
            {isSyncingCatalog ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <DownloadCloud className="size-4" />
            )}
            <span>Importar + da ExerciseDB (pt-BR)</span>
          </Button>
          <Button
            onClick={() => setShowCustomModal(true)}
            className="rounded-full text-xs sm:text-sm"
          >
            <Plus className="size-4" />
            Novo Exercício
          </Button>
        </div>
      </div>

      {/* Barra de Busca e Filtros */}
      <Card className="p-4 space-y-3.5">
        <div className="relative">
          <Search className="size-4 text-muted-foreground pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar exercício (PT ou EN)..."
            className="pl-10 pr-20"
          />
          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearchingApi && (
              <Loader2 className="size-4 text-primary animate-spin mr-1" />
            )}
            {search && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {isOfflineSearch && (
          <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs font-semibold flex items-center gap-2">
            <WifiOff className="size-4 shrink-0" />
            <span>
              Modo Offline: exibindo resultados do catálogo local salvo no
              aparelho (ExerciseDB online indisponível).
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="exercise-filter-muscle"
              className="text-[11px] gap-1"
            >
              <Filter className="size-3 text-primary" />
              Grupo Muscular
            </Label>
            <Select
              value={selectedMuscle}
              onValueChange={(value) =>
                setSelectedMuscle(value as MuscleGroup | 'all')
              }
            >
              <SelectTrigger id="exercise-filter-muscle">
                <SelectValue placeholder="Todos os Músculos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Músculos</SelectItem>
                {MUSCLE_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MUSCLE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="exercise-filter-equipment"
              className="text-[11px] gap-1"
            >
              <Dumbbell className="size-3 text-primary" />
              Equipamento
            </Label>
            <Select
              value={selectedEquipment}
              onValueChange={(value) =>
                setSelectedEquipment(value as EquipmentType | 'all')
              }
            >
              <SelectTrigger id="exercise-filter-equipment">
                <SelectValue placeholder="Todos os Equipamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Equipamentos</SelectItem>
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <SelectItem key={eq} value={eq}>
                    {EQUIPMENT_LABELS[eq]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Lista de Exercícios ou Estado Vazio */}
      {exercises.length === 0 ? (
        <Card className="border-dashed p-10 text-center space-y-4">
          <Dumbbell className="size-10 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Nenhum exercício cadastrado ainda
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Seu banco de exercícios está limpo. Clique em &ldquo;Novo
              Exercício&rdquo; para cadastrar seus exercícios.
            </p>
          </div>
          <Button
            onClick={() => setShowCustomModal(true)}
            className="rounded-full"
          >
            <Plus className="size-4" /> Cadastrar Primeiro Exercício
          </Button>
        </Card>
      ) : filteredExercises.length === 0 ? (
        <Card className="p-8 text-center text-xs text-muted-foreground">
          Nenhum exercício encontrado para os filtros aplicados.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {filteredExercises.map((ex) => {
            const best1RM = best1RMByExerciseId.get(ex.id);
            return (
              <Card
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className="group hover:bg-secondary/50 hover:border-primary/40 p-3.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-12 rounded-full bg-secondary border border-border flex items-center justify-center text-primary shrink-0 overflow-hidden">
                    {ex.gifUrl && !failedGifIds[ex.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={ex.gifUrl}
                        alt={ex.title}
                        loading="lazy"
                        onError={() =>
                          setFailedGifIds((prev) => ({
                            ...prev,
                            [ex.id]: true,
                          }))
                        }
                        className="size-full object-cover"
                      />
                    ) : (
                      <Dumbbell className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground text-[15px] leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {ex.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <Badge variant="info" className="text-[11px] px-2 py-0.5">
                        {MUSCLE_LABELS[ex.primaryMuscle]}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[11px] px-2 py-0.5 font-medium"
                      >
                        {EQUIPMENT_LABELS[ex.equipment]}
                      </Badge>
                      {best1RM && best1RM > 0 && (
                        <Badge
                          variant="warning"
                          className="text-[11px] px-2 py-0.5 tabular-nums"
                        >
                          <Trophy className="size-3 shrink-0" /> 1RM:{' '}
                          {formatWeightWithUnit(best1RM, weightUnit)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeWorkout && (
                    <Button
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToActiveWorkout(ex);
                      }}
                      title="Adicionar ao Treino Ativo"
                      className="px-3.5 text-xs bg-primary/15 border-primary/30 text-blue-700 dark:text-blue-400 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    >
                      + Treino
                    </Button>
                  )}
                  <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Exercício */}
      <ExerciseDetailModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />

      {/* Modal Criar Exercício */}
      <CreateExerciseDialog
        open={showCustomModal}
        onOpenChange={setShowCustomModal}
        onCreate={handleCreateCustomExercise}
      />
    </div>
  );
}
