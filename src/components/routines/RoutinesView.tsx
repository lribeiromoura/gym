'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Dumbbell,
  Flame,
  Folder,
  FolderPlus,
  Play,
  Plus,
  Share2,
  Trash2,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Routine, RoutineFolder } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculateWeeklyStreakStats,
  getRoutineLastTrainedInfo,
} from '@/lib/calculations';
import {
  buildShareUrl,
  encodeFolderShareToken,
  encodeRoutineShareToken,
  shareOrCopyLink,
} from '@/lib/share';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { RoutineCard } from './RoutineCard';
import { CreateFolderDialog } from './CreateFolderDialog';
import { RoutineDraft, RoutineEditorModal } from './RoutineEditorModal';

export function RoutinesView() {
  const folders = useWorkoutStore((s) => s.folders);
  const routines = useWorkoutStore((s) => s.routines);
  const exercises = useWorkoutStore((s) => s.exercises);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const settings = useWorkoutStore((s) => s.settings);

  const startEmptyWorkout = useWorkoutStore((s) => s.startEmptyWorkout);
  const startRoutineWorkout = useWorkoutStore((s) => s.startRoutineWorkout);
  const createFolder = useWorkoutStore((s) => s.createFolder);
  const deleteFolder = useWorkoutStore((s) => s.deleteFolder);
  const saveRoutine = useWorkoutStore((s) => s.saveRoutine);
  const duplicateRoutine = useWorkoutStore((s) => s.duplicateRoutine);
  const deleteRoutine = useWorkoutStore((s) => s.deleteRoutine);
  const addCustomExercise = useWorkoutStore((s) => s.addCustomExercise);
  const importExercisesBatch = useWorkoutStore((s) => s.importExercisesBatch);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [sharedFeedbackId, setSharedFeedbackId] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineDraft | null>(
    null
  );
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<
    Record<string, boolean>
  >({});
  const [routineToDelete, setRoutineToDelete] = useState<Routine | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<RoutineFolder | null>(
    null
  );

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );
  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  const weeklyStats = useMemo(
    () =>
      calculateWeeklyStreakStats(
        workoutHistory,
        settings.weeklyWorkoutGoal || 4
      ),
    [workoutHistory, settings.weeklyWorkoutGoal]
  );

  const routineLastTrainedMap = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof getRoutineLastTrainedInfo>
    >();
    for (const r of routines) {
      map.set(r.id, getRoutineLastTrainedInfo(r, workoutHistory));
    }
    return map;
  }, [routines, workoutHistory]);

  const suggestedRoutineId = useMemo(() => {
    if (routines.length === 0) return null;
    let oldestId = routines[0].id;
    let oldestTime =
      routineLastTrainedMap.get(routines[0].id)?.timestamp ?? Infinity;

    for (const r of routines) {
      const info = routineLastTrainedMap.get(r.id);
      const t = info?.timestamp ?? 0;
      if (t < oldestTime) {
        oldestTime = t;
        oldestId = r.id;
      }
    }
    return oldestId;
  }, [routines, routineLastTrainedMap]);

  const toggleRoutineExpanded = (id: string) =>
    setExpandedRoutineIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const openNewRoutineEditor = (
    folderId: string | null = folders[0]?.id ?? null
  ) => {
    setEditingRoutine({
      title: '',
      folderId,
      description: '',
      exercises: [],
    });
  };

  const openEditRoutine = (r: Routine) => {
    setEditingRoutine({
      id: r.id,
      title: r.title,
      folderId: r.folderId,
      description: r.description,
      exercises: JSON.parse(JSON.stringify(r.exercises)),
    });
  };

  const handleSaveRoutine = (draft: RoutineDraft) => {
    const isEditing = Boolean(draft.id);
    saveRoutine({
      id: draft.id,
      title: draft.title,
      folderId: draft.folderId,
      description: draft.description,
      exercises: draft.exercises,
    });
    setEditingRoutine(null);
    toast.success(
      isEditing
        ? `Rotina "${draft.title}" atualizada!`
        : `Rotina "${draft.title}" criada!`
    );
  };

  const handleCreateFolder = (name: string) => {
    createFolder(name);
    toast.success(`Pasta "${name}" criada!`);
  };

  const handleDuplicateRoutine = (routine: Routine) => {
    duplicateRoutine(routine.id);
    toast.success(`Rotina "${routine.title}" duplicada!`);
  };

  const handleShareRoutine = async (routine: Routine) => {
    const token = encodeRoutineShareToken(routine, exercises, settings.name);
    const url = buildShareUrl(token);
    await shareOrCopyLink({
      title: `Treino: ${routine.title}`,
      text: `Confira e importe o treino "${routine.title}" no IronPulse:`,
      url,
    });
    setSharedFeedbackId(routine.id);
    toast.success(`Link da rotina "${routine.title}" copiado!`);
    setTimeout(() => setSharedFeedbackId(null), 2500);
  };

  const handleShareFolder = async (
    folder: RoutineFolder,
    folderRoutines: Routine[]
  ) => {
    const token = encodeFolderShareToken(
      folder,
      folderRoutines,
      exercises,
      settings.name
    );
    const url = buildShareUrl(token);
    await shareOrCopyLink({
      title: `Pasta de Treinos: ${folder.name}`,
      text: `Confira e importe a pasta "${folder.name}" (${folderRoutines.length} treinos) no IronPulse:`,
      url,
    });
    setSharedFeedbackId(folder.id);
    toast.success(`Link da pasta "${folder.name}" copiado!`);
    setTimeout(() => setSharedFeedbackId(null), 2500);
  };

  const handleConfirmDeleteRoutine = () => {
    if (!routineToDelete) return;
    const title = routineToDelete.title;
    deleteRoutine(routineToDelete.id);
    setRoutineToDelete(null);
    toast.success(`Rotina "${title}" excluída.`);
  };

  const handleConfirmDeleteFolder = () => {
    if (!folderToDelete) return;
    const name = folderToDelete.name;
    deleteFolder(folderToDelete.id);
    setFolderToDelete(null);
    toast.success(`Pasta "${name}" excluída.`);
  };

  const renderRoutineCard = (routine: Routine) => {
    const lastInfo = routineLastTrainedMap.get(routine.id);
    return (
      <RoutineCard
        key={routine.id}
        routine={routine}
        exerciseMap={exerciseMap}
        weightUnit={weightUnit}
        isExpanded={Boolean(expandedRoutineIds[routine.id])}
        isSuggested={suggestedRoutineId === routine.id}
        lastTrainedLabel={lastInfo?.label}
        isSharedFeedback={sharedFeedbackId === routine.id}
        onToggleExpand={() => toggleRoutineExpanded(routine.id)}
        onStart={() => startRoutineWorkout(routine.id)}
        onShare={() => handleShareRoutine(routine)}
        onEdit={() => openEditRoutine(routine)}
        onDuplicate={() => handleDuplicateRoutine(routine)}
        onDelete={() => setRoutineToDelete(routine)}
      />
    );
  };

  const unfiledRoutines = routines.filter((r) => !r.folderId);

  return (
    <div className="space-y-5 pb-28">
      {/* Widget Discreto de Meta Semanal e Ofensiva (Streak) */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-amber-500 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-foreground">
              Meta Semanal: {weeklyStats.workoutsThisWeek} de{' '}
              {weeklyStats.weeklyGoal} treinos
            </span>
          </div>
          <Badge variant="warning" className="py-1 px-2.5">
            <Trophy className="size-3.5 shrink-0" />
            <span>
              {weeklyStats.consecutiveWeeks}{' '}
              {weeklyStats.consecutiveWeeks === 1
                ? 'semana na meta'
                : 'semanas seguidas'}
            </span>
          </Badge>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weeklyStats.days.map((d) => (
            <div
              key={d.dateKey}
              className={cn(
                'py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-colors',
                d.trained
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                  : d.isToday
                  ? 'bg-primary/15 border-primary text-blue-700 dark:text-blue-400'
                  : 'bg-secondary border-border text-muted-foreground'
              )}
            >
              <span className="text-[11px] font-bold uppercase">{d.label}</span>
              <span className="size-5 rounded-full flex items-center justify-center text-xs font-extrabold">
                {d.trained ? (
                  <Check className="size-3.5 stroke-[3]" />
                ) : d.isToday ? (
                  '○'
                ) : (
                  '·'
                )}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Cabeçalho e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            Treino &amp; Rotinas
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha a próxima rotina sugerida ou inicie um treino livre
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFolderModal(true)}
            className="text-xs"
          >
            <FolderPlus className="size-4" /> Nova Pasta
          </Button>
          <Button
            onClick={() => openNewRoutineEditor()}
            className="text-xs"
          >
            <Plus className="size-4" /> Nova Rotina
          </Button>
        </div>
      </div>

      {/* Barra Compacta de Treino Livre (Em Branco) */}
      <Card className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-foreground leading-snug">
            Iniciar Treino Livre (Em Branco)
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Adicione exercícios na hora, com descanso e recordes automáticos
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => startEmptyWorkout('Treino Livre')}
          className="text-xs shrink-0"
        >
          <Play className="size-3.5 fill-current text-primary" /> Iniciar Vazio
        </Button>
      </Card>

      {/* Estado Vazio Inicial ou Listagem de Pastas e Rotinas */}
      {folders.length === 0 && routines.length === 0 ? (
        <Card className="border-dashed p-10 text-center space-y-4">
          <Dumbbell className="size-10 text-muted-foreground mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              Nenhuma rotina ou pasta cadastrada
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Crie sua primeira rotina ou pasta de treinos usando os botões
              acima, ou inicie um treino livre em branco.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowFolderModal(true)}
              className="text-xs"
            >
              + Criar Pasta
            </Button>
            <Button
              onClick={() => openNewRoutineEditor()}
              className="text-xs"
            >
              + Criar Rotina
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {folders.map((folder) => {
            const folderRoutines = routines.filter(
              (r) => r.folderId === folder.id
            );
            const isFolderCopied = sharedFeedbackId === folder.id;

            return (
              <div key={folder.id} className="space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <Folder className="size-5 text-primary shrink-0" />
                    <h3 className="text-[15px] font-extrabold uppercase tracking-wider text-foreground truncate">
                      {folder.name}
                    </h3>
                    <Badge variant="secondary" className="tabular-nums">
                      {folderRoutines.length}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {folderRoutines.length > 0 && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          handleShareFolder(folder, folderRoutines)
                        }
                        title="Compartilhar Link da Pasta"
                        className={cn(
                          'flex-1 text-[13px]',
                          isFolderCopied
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-primary/15 border-primary/30 text-blue-700 dark:text-blue-400 hover:bg-primary/25'
                        )}
                      >
                        {isFolderCopied ? (
                          <>
                            <Check className="size-4" />
                            <span>Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="size-4" />
                            <span>Compartilhar</span>
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => openNewRoutineEditor(folder.id)}
                      className="flex-1 text-[13px]"
                    >
                      <Plus className="size-4" /> Rotina
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setFolderToDelete(folder)}
                      title="Excluir Pasta"
                      aria-label="Excluir Pasta"
                      className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {folderRoutines.length === 0 ? (
                  <Card className="border-dashed p-6 text-center text-xs text-muted-foreground">
                    Nenhuma rotina nesta pasta. Clique em &ldquo;+ Rotina&rdquo;
                    para criar.
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {folderRoutines.map(renderRoutineCard)}
                  </div>
                )}
              </div>
            );
          })}

          {unfiledRoutines.length > 0 && (
            <div className="space-y-3">
              {folders.length > 0 && <Separator />}
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground">
                Minhas Rotinas
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {unfiledRoutines.map(renderRoutineCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Criar Nova Pasta */}
      <CreateFolderDialog
        open={showFolderModal}
        onOpenChange={setShowFolderModal}
        onCreate={handleCreateFolder}
      />

      {/* Modal Construtor / Editor de Rotina Completo */}
      <RoutineEditorModal
        initialRoutine={editingRoutine}
        folders={folders}
        exercises={exercises}
        weightUnit={weightUnit}
        defaultRestSeconds={settings.defaultRestSeconds || 90}
        onClose={() => setEditingRoutine(null)}
        onSave={handleSaveRoutine}
        onCreateCustomExercise={addCustomExercise}
        onImportExercisesBatch={importExercisesBatch}
      />

      {/* Confirmação de Exclusão de Rotina */}
      <ConfirmDialog
        open={Boolean(routineToDelete)}
        onOpenChange={(open) => {
          if (!open) setRoutineToDelete(null);
        }}
        title={`Excluir a rotina "${routineToDelete?.title ?? ''}"?`}
        description="Esta ação remove a rotina da sua lista, mas preserva todos os treinos já registrados no histórico."
        confirmLabel="Excluir Rotina"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDeleteRoutine}
      />

      {/* Confirmação de Exclusão de Pasta */}
      <ConfirmDialog
        open={Boolean(folderToDelete)}
        onOpenChange={(open) => {
          if (!open) setFolderToDelete(null);
        }}
        title={`Excluir a pasta "${folderToDelete?.name ?? ''}"?`}
        description="A pasta será removida e as rotinas vinculadas ficarão disponíveis em Minhas Rotinas."
        confirmLabel="Excluir Pasta"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleConfirmDeleteFolder}
      />
    </div>
  );
}
