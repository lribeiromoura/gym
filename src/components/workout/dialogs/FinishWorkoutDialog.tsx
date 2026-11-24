'use client';

import React from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { convertVolumeFromKg, getWeightUnitLabel } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

export interface FinishWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedSets: number;
  unmarkedFilledSetsCount: number;
  volumeKg: number;
  weightUnit: 'kg' | 'lbs';
  hasRoutineId: boolean;
  onFinish: (updateRoutine: boolean, autoCompleteFilled: boolean) => void;
  onDiscard: () => void;
}

export function FinishWorkoutDialog({
  open,
  onOpenChange,
  completedSets,
  unmarkedFilledSetsCount,
  volumeKg,
  weightUnit,
  hasRoutineId,
  onFinish,
  onDiscard,
}: FinishWorkoutDialogProps) {
  const unitLabel = getWeightUnitLabel(weightUnit);
  const hasAnySavableSet = completedSets > 0 || unmarkedFilledSetsCount > 0;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {hasAnySavableSet ? 'Concluir Treino?' : 'Nenhuma série concluída'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {hasAnySavableSet
              ? 'Revise o resumo antes de salvar a sessão no seu histórico.'
              : 'Marque séries concluídas ou descarte este treino vazio.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!hasAnySavableSet ? (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Treino vazio não pode ser salvo</span>
              </div>
              <p className="text-xs leading-relaxed">
                Marque ao menos uma série como concluída (✓) antes de salvar no
                histórico, ou descarte o treino caso não deseje registrá-lo.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Você marcou{' '}
              <strong className="text-foreground">
                {completedSets} séries concluídas
              </strong>{' '}
              com um volume total de{' '}
              <strong className="text-foreground">
                {convertVolumeFromKg(volumeKg, weightUnit).toLocaleString(
                  'pt-BR'
                )}{' '}
                {unitLabel}
              </strong>
              .
            </p>
          )}

          {unmarkedFilledSetsCount > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 space-y-1.5">
              <div className="flex items-center gap-2 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {unmarkedFilledSetsCount}{' '}
                  {unmarkedFilledSetsCount === 1
                    ? 'série preenchida não marcada!'
                    : 'séries preenchidas não marcadas!'}
                </span>
              </div>
              <p className="text-xs leading-relaxed">
                Encontramos {unmarkedFilledSetsCount}{' '}
                {unmarkedFilledSetsCount === 1 ? 'série' : 'séries'} com
                valores preenchidos sem o check <strong>✓</strong>. Deseja
                marcá-las automaticamente para não perder seu registro?
              </p>
            </div>
          )}

          <div className="space-y-2.5 pt-1">
            {unmarkedFilledSetsCount > 0 && (
              <Button
                variant="success"
                onClick={() => {
                  onOpenChange(false);
                  onFinish(hasRoutineId, true);
                }}
                className="w-full min-h-12 h-auto py-3 px-4 text-xs sm:text-sm whitespace-normal text-center"
              >
                <Check className="w-4 h-4 stroke-[2.5] shrink-0" />
                <span>
                  Marcar todas as {unmarkedFilledSetsCount} séries preenchidas e
                  Concluir
                </span>
              </Button>
            )}

            {completedSets > 0 &&
              (hasRoutineId ? (
                <>
                  <Button
                    variant="default"
                    onClick={() => {
                      onOpenChange(false);
                      onFinish(true, false);
                    }}
                    className="w-full min-h-11 h-auto py-3 px-4 text-xs sm:text-sm whitespace-normal text-center"
                  >
                    {unmarkedFilledSetsCount > 0
                      ? `Concluir apenas com as séries marcadas (${completedSets}) e Atualizar Rotina`
                      : 'Concluir e Atualizar Rotina'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      onOpenChange(false);
                      onFinish(false, false);
                    }}
                    className="w-full min-h-11 h-auto py-3 px-4 text-xs sm:text-sm whitespace-normal text-center"
                  >
                    Concluir (Manter Rotina Original)
                  </Button>
                </>
              ) : (
                <Button
                  variant={
                    unmarkedFilledSetsCount > 0 ? 'secondary' : 'default'
                  }
                  onClick={() => {
                    onOpenChange(false);
                    onFinish(false, false);
                  }}
                  className="w-full min-h-11 h-auto py-3 px-4 text-xs sm:text-sm whitespace-normal text-center"
                >
                  {unmarkedFilledSetsCount > 0
                    ? `Concluir apenas com as séries marcadas (${completedSets})`
                    : 'Confirmar e Salvar Treino'}
                </Button>
              ))}

            {!hasAnySavableSet && (
              <Button
                variant="destructive-outline"
                onClick={() => {
                  onOpenChange(false);
                  onDiscard();
                }}
                className="w-full min-h-11 text-xs sm:text-sm"
              >
                Descartar Treino Vazio
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full min-h-11 text-xs font-semibold"
            >
              Voltar ao Treino
            </Button>
          </div>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
