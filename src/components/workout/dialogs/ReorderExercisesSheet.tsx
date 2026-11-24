'use client';

import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Exercise, WorkoutExercise } from '@/types/workout';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

export interface ReorderExercisesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercises: WorkoutExercise[];
  exerciseMap: Map<string, Exercise>;
  onMove: (workoutExerciseId: string, direction: 'up' | 'down') => void;
}

export function ReorderExercisesSheet({
  open,
  onOpenChange,
  exercises,
  exerciseMap,
  onMove,
}: ReorderExercisesSheetProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Reordenar Exercícios</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Use as setas para ajustar a ordem dos exercícios no treino atual
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {exercises.map((ex, idx) => {
            const meta = exerciseMap.get(ex.exerciseId);
            return (
              <div
                key={ex.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/50 border border-border"
              >
                <span className="text-sm font-semibold text-foreground truncate">
                  {idx + 1}. {meta?.title || 'Exercício'}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={idx === 0}
                    aria-label="Mover exercício para cima"
                    onClick={() => onMove(ex.id, 'up')}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={idx === exercises.length - 1}
                    aria-label="Mover exercício para baixo"
                    onClick={() => onMove(ex.id, 'down')}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <ResponsiveDialogFooter>
          <Button className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Concluído
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
