'use client';

import React from 'react';
import { RPEValue } from '@/types/workout';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

export interface ActiveRpePickerState {
  workoutExerciseId: string;
  setId: string;
  currentRpe: RPEValue;
}

export interface RpePickerSheetProps {
  activeRpe: ActiveRpePickerState | null;
  onClose: () => void;
  onSelectRpe: (
    workoutExerciseId: string,
    setId: string,
    rpe: RPEValue
  ) => void;
}

const RPE_OPTIONS: RPEValue[] = [null, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];

const RPE_DESCRIPTIONS = [
  { range: '6 – 7', desc: 'Moderado • 3 a 4 repetições na reserva' },
  { range: '8 – 8.5', desc: 'Pesado • 1 a 2 repetições na reserva' },
  { range: '9 – 9.5', desc: 'Muito pesado • 0 a 1 repetição na reserva' },
  { range: '10', desc: 'Esforço máximo • Falha concêntrica total' },
] as const;

export function RpePickerSheet({
  activeRpe,
  onClose,
  onSelectRpe,
}: RpePickerSheetProps) {
  return (
    <ResponsiveDialog
      open={Boolean(activeRpe)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        {activeRpe && (
          <>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                RPE (Esforço Percebido da Série)
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                10 = Falha máxima • 9 = 1 repetição na reserva • 8 = 2
                repetições na reserva
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {RPE_OPTIONS.map((val) => {
                  const isSelected = activeRpe.currentRpe === val;
                  return (
                    <Button
                      key={String(val)}
                      variant={isSelected ? 'default' : 'secondary'}
                      onClick={() => {
                        onSelectRpe(
                          activeRpe.workoutExerciseId,
                          activeRpe.setId,
                          val
                        );
                        onClose();
                      }}
                      className="min-h-11 h-12 px-1 text-sm font-bold"
                    >
                      {val === null ? 'Limpar' : val}
                    </Button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-border bg-secondary/40 p-3.5 space-y-1.5">
                {RPE_DESCRIPTIONS.map((item) => (
                  <div
                    key={item.range}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="font-extrabold text-foreground tabular-nums">
                      RPE {item.range}
                    </span>
                    <span className="text-muted-foreground text-right">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
