'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { PendingWorkoutReplace } from '@/store/useWorkoutStore';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

export interface PendingReplaceDialogProps {
  pending: PendingWorkoutReplace | null;
  activeWorkoutTitle?: string;
  onResumeCurrent: () => void;
  onConfirmReplace: () => void;
  onCancel: () => void;
}

export function PendingReplaceDialog({
  pending,
  activeWorkoutTitle,
  onResumeCurrent,
  onConfirmReplace,
  onCancel,
}: PendingReplaceDialogProps) {
  if (!pending) return null;

  if (typeof window === 'undefined') {
    return (
      <div role="alertdialog" aria-modal="true" className="hidden">
        <h2>Treino em andamento</h2>
        <p>
          Você já possui o treino &ldquo;{activeWorkoutTitle}&rdquo; aberto.
        </p>
      </div>
    );
  }

  return (
    <AlertDialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent className="space-y-2">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <AlertDialogTitle>Treino em andamento</AlertDialogTitle>
              <AlertDialogDescription className="text-xs sm:text-sm">
                Você já possui o treino{' '}
                <strong className="text-foreground">
                  &ldquo;{activeWorkoutTitle}&rdquo;
                </strong>{' '}
                aberto. Se iniciar{' '}
                <strong className="text-foreground">
                  &ldquo;{pending.targetTitle}&rdquo;
                </strong>
                , o progresso atual não salvo será descartado.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-2 pt-1">
          <Button
            variant="default"
            onClick={onResumeCurrent}
            className="w-full text-xs sm:text-sm"
          >
            Retomar treino atual
          </Button>
          <Button
            variant="destructive-outline"
            onClick={onConfirmReplace}
            className="w-full text-xs sm:text-sm"
          >
            Descartar atual e iniciar novo
          </Button>
          <Button
            variant="secondary"
            onClick={onCancel}
            className="w-full text-xs font-semibold"
          >
            Cancelar
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
