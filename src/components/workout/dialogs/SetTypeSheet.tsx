'use client';

import React from 'react';
import { Check, Flame, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SetType } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

export interface ActiveSetSheetState {
  workoutExerciseId: string;
  setId: string;
  setNumberLabel: string;
  currentType: SetType;
}

export interface SetTypeSheetProps {
  activeSet: ActiveSetSheetState | null;
  onClose: () => void;
  onSelectType: (
    workoutExerciseId: string,
    setId: string,
    type: SetType
  ) => void;
  onGenerateWarmup: (workoutExerciseId: string) => void;
  onRemoveSet: (workoutExerciseId: string, setId: string) => void;
}

const SET_TYPE_OPTIONS = [
  {
    type: 'normal' as SetType,
    badge: '1',
    badgeClass: 'bg-secondary border-border text-foreground',
    title: 'Normal',
    desc: 'Série principal de trabalho (conta no volume e PRs)',
  },
  {
    type: 'warmup' as SetType,
    badge: 'W',
    badgeClass:
      'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-400',
    title: 'W — Aquecimento (não conta em PRs)',
    desc: 'Prepara articulações e músculos sem contar em recordes',
  },
  {
    type: 'dropset' as SetType,
    badge: 'D',
    badgeClass:
      'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-400',
    title: 'D — Drop-set',
    desc: 'Redução imediata de carga sem descanso após a série anterior',
  },
  {
    type: 'failure' as SetType,
    badge: 'F',
    badgeClass:
      'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400',
    title: 'F — Até a Falha',
    desc: 'Série levada até a falha concêntrica máxima',
  },
] as const;

export function SetTypeSheet({
  activeSet,
  onClose,
  onSelectType,
  onGenerateWarmup,
  onRemoveSet,
}: SetTypeSheetProps) {
  return (
    <ResponsiveDialog
      open={Boolean(activeSet)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent>
        {activeSet && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                Configurar Série ({activeSet.setNumberLabel})
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Escolha o tipo da série, gere aquecimento ou exclua a linha
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="space-y-2">
                {SET_TYPE_OPTIONS.map((item) => {
                  const isSelected = activeSet.currentType === item.type;
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        onSelectType(
                          activeSet.workoutExerciseId,
                          activeSet.setId,
                          item.type
                        );
                        onClose();
                      }}
                      className={cn(
                        'w-full min-h-[54px] p-3 rounded-2xl border text-left flex items-center gap-3.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-secondary/50 hover:bg-secondary'
                      )}
                    >
                      <span
                        className={cn(
                          'w-10 h-10 rounded-xl border font-bold text-sm flex items-center justify-center shrink-0',
                          item.badgeClass
                        )}
                      >
                        {item.badge}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.desc}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    onGenerateWarmup(activeSet.workoutExerciseId);
                    toast.success('2 séries de aquecimento geradas!');
                    onClose();
                  }}
                  className="min-h-12 h-auto py-3 px-4 rounded-2xl bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-400 hover:bg-amber-500/25 hover:text-amber-900 dark:hover:text-amber-300 font-bold text-xs sm:text-sm whitespace-normal text-center"
                >
                  <Flame className="w-4 h-4 shrink-0" />
                  <span>Gerar 2 Séries de Aquecimento</span>
                </Button>

                <Button
                  variant="destructive-outline"
                  onClick={() => {
                    onRemoveSet(activeSet.workoutExerciseId, activeSet.setId);
                    toast.info('Série excluída.');
                    onClose();
                  }}
                  className="min-h-12 h-auto py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Excluir esta Série</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
