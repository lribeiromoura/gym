'use client';

import React, { useState } from 'react';
import {
  ArrowUpDown,
  Calculator,
  Flame,
  Gauge,
  Info,
  Layers,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Exercise, WorkoutExercise } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

export interface ExerciseMenuSheetProps {
  workoutExercise: WorkoutExercise | null;
  exerciseMeta?: Exercise;
  showRpeColumn: boolean;
  onClose: () => void;
  onInspectExercise: (exercise: Exercise) => void;
  onGenerateWarmup: (workoutExerciseId: string) => void;
  onOpenPlateCalculator: (workoutExercise: WorkoutExercise) => void;
  onToggleRpeColumn: () => void;
  onOpenReorder: () => void;
  onReplaceExercise: (workoutExerciseId: string) => void;
  onSetSuperset: (workoutExerciseId: string, supersetId: number | null) => void;
  onRemoveExercise: (workoutExerciseId: string) => void;
}

const SUPERSET_GROUPS = [1, 2, 3, 4] as const;

export function ExerciseMenuSheet({
  workoutExercise,
  exerciseMeta,
  showRpeColumn,
  onClose,
  onInspectExercise,
  onGenerateWarmup,
  onOpenPlateCalculator,
  onToggleRpeColumn,
  onOpenReorder,
  onReplaceExercise,
  onSetSuperset,
  onRemoveExercise,
}: ExerciseMenuSheetProps) {
  const [pendingRemove, setPendingRemove] = useState<{
    id: string;
    title: string;
  } | null>(null);

  return (
    <>
      <ResponsiveDialog
        open={Boolean(workoutExercise)}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <ResponsiveDialogContent>
          {workoutExercise && (
            <>
              <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>
                  {exerciseMeta?.title || 'Opções do Exercício'}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                  Gerencie séries, superset, ordem ou detalhes do exercício
                </ResponsiveDialogDescription>
              </ResponsiveDialogHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {/* Bloco de Superset rápido */}
                <div className="rounded-2xl border border-border bg-secondary/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-bold text-foreground">
                        Superset
                      </span>
                    </div>
                    {workoutExercise.supersetId ? (
                      <Badge variant="purple">
                        Grupo {workoutExercise.supersetId}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Nenhum
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    <Button
                      variant={
                        workoutExercise.supersetId === null
                          ? 'default'
                          : 'outline'
                      }
                      className="min-h-11 h-11 px-2 text-xs font-bold"
                      onClick={() => {
                        onSetSuperset(workoutExercise.id, null);
                        toast.info('Removido do superset.');
                        onClose();
                      }}
                    >
                      Nenhum
                    </Button>
                    {SUPERSET_GROUPS.map((groupNum) => (
                      <Button
                        key={groupNum}
                        variant={
                          workoutExercise.supersetId === groupNum
                            ? 'default'
                            : 'outline'
                        }
                        className="min-h-11 h-11 px-2 text-xs font-bold"
                        onClick={() => {
                          onSetSuperset(workoutExercise.id, groupNum);
                          toast.success(`Adicionado ao Superset ${groupNum}!`);
                          onClose();
                        }}
                      >
                        #{groupNum}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Lista de Ações */}
                <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                  {exerciseMeta && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onInspectExercise(exerciseMeta);
                      }}
                      className="w-full min-h-12 px-4 py-3.5 text-left flex items-center gap-3.5 hover:bg-secondary/70 transition-colors cursor-pointer"
                    >
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="text-[15px] font-medium text-foreground">
                        Informações do exercício
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onGenerateWarmup(workoutExercise.id);
                      toast.success('2 séries de aquecimento geradas!');
                      onClose();
                    }}
                    className="w-full min-h-12 px-4 py-3.5 text-left flex items-center gap-3.5 hover:bg-secondary/70 transition-colors cursor-pointer"
                  >
                    <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="text-[15px] font-medium text-foreground">
                      Gerar 2 séries de aquecimento (50% e 75%)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const target = workoutExercise;
                      onClose();
                      onOpenPlateCalculator(target);
                    }}
                    className="w-full min-h-12 px-4 py-3.5 text-left flex items-center gap-3.5 hover:bg-secondary/70 transition-colors cursor-pointer"
                  >
                    <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="text-[15px] font-medium text-foreground">
                      Calculadora de anilhas por lado
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onToggleRpeColumn();
                      toast.info(
                        showRpeColumn
                          ? 'Coluna RPE ocultada.'
                          : 'Coluna RPE exibida.'
                      );
                      onClose();
                    }}
                    className="w-full min-h-12 px-4 py-3.5 text-left flex items-center gap-3.5 hover:bg-secondary/70 transition-colors cursor-pointer"
                  >
                    <Gauge className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-[15px] font-medium text-foreground">
                      {showRpeColumn
                        ? 'Ocultar coluna RPE na tabela'
                        : 'Exibir coluna RPE na tabela'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenReorder();
                    }}
                    className="w-full min-h-12 px-4 py-3.5 text-left flex items-center gap-3.5 hover:bg-secondary/70 transition-colors cursor-pointer"
                  >
                    <ArrowUpDown className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-[15px] font-medium text-foreground">
                      Reordenar exercícios
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const targetId = workoutExercise.id;
                      onClose();
                      onReplaceExercise(targetId);
                    }}
                    className="w-full min-h-12 px-4 py-3.5 text-left flex items-center gap-3.5 hover:bg-secondary/70 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-5 h-5 text-muted-foreground shrink-0" />
                    <span className="text-[15px] font-medium text-foreground">
                      Substituir exercício
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const targetId = workoutExercise.id;
                      const title = exerciseMeta?.title || 'este exercício';
                      onClose();
                      setPendingRemove({ id: targetId, title });
                    }}
                    className={cn(
                      'w-full min-h-12 px-4 py-3.5 text-left flex items-center gap-3.5 hover:bg-destructive/10 transition-colors cursor-pointer text-destructive'
                    )}
                  >
                    <Trash2 className="w-5 h-5 shrink-0" />
                    <span className="text-[15px] font-semibold">
                      Remover exercício
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
        title="Remover exercício do treino?"
        description={
          pendingRemove
            ? `Tem certeza que deseja remover "${pendingRemove.title}" e todas as suas séries registradas neste treino?`
            : undefined
        }
        confirmLabel="Remover exercício"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={() => {
          if (pendingRemove) {
            onRemoveExercise(pendingRemove.id);
            toast.info(`"${pendingRemove.title}" removido do treino.`);
            setPendingRemove(null);
          }
        }}
      />
    </>
  );
}
