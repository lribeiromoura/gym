'use client';

import React, { useState } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { BackupFile, RestoreMode } from '@/lib/backup';
import { summarizeBackup } from '@/lib/backup';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';

interface Props {
  file: BackupFile;
  onCancel: () => void;
  onConfirm: (mode: RestoreMode) => void;
}

export function RestoreBackupModal({ file, onCancel, onConfirm }: Props) {
  const [mode, setMode] = useState<RestoreMode>('replace');
  const summary = summarizeBackup(file);

  const exportedLabel = summary.exportedAt
    ? new Date(summary.exportedAt).toLocaleString('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : 'data desconhecida';

  const rows: [string, number][] = [
    ['Treinos no histórico', summary.workouts],
    ['Rotinas', summary.routines],
    ['Pastas', summary.folders],
    ['Medidas corporais', summary.measurements],
    ['Fotos de progresso', summary.photos],
    ['Exercícios personalizados', summary.customExercises],
    ...(file.data.nutrition
      ? ([
          ['Registros no diário alimentar', summary.foodLogs],
          ['Refeições salvas / combos', summary.savedMeals],
          ['Alimentos personalizados', summary.customFoods],
        ] as [string, number][])
      : []),
  ];

  return (
    <ResponsiveDialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Restaurar Backup</span>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Criado em {exportedLabel}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <ul className="rounded-xl border border-border bg-secondary/40 divide-y divide-border text-sm">
            {rows.map(([label, count]) => (
              <li key={label} className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-bold text-foreground tabular-nums">
                  {count}
                </span>
              </li>
            ))}
          </ul>

          {!file.includesPhotos && (
            <p className="text-xs text-muted-foreground">
              Este backup foi criado sem fotos.
            </p>
          )}

          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as RestoreMode)}
            className="gap-2"
          >
            {(
              [
                [
                  'replace',
                  'Substituir tudo',
                  'Troca os dados atuais pelos do backup.',
                ],
                [
                  'merge',
                  'Mesclar',
                  'Mantém os dados atuais e adiciona só o que não existe.',
                ],
              ] as const
            ).map(([value, title, desc]) => (
              <label
                key={value}
                htmlFor={`restore-mode-${value}`}
                className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition min-h-11 ${
                  mode === value
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-secondary/50'
                }`}
              >
                <RadioGroupItem
                  id={`restore-mode-${value}`}
                  value={value}
                  className="mt-0.5"
                />
                <span className="space-y-0.5">
                  <span className="block text-sm font-bold text-foreground">
                    {title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {desc}
                  </span>
                </span>
              </label>
            ))}
          </RadioGroup>

          {mode === 'replace' && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-xs flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Os dados atuais serão substituídos. Você poderá desfazer logo
                após a restauração.
              </span>
            </div>
          )}
        </div>

        <ResponsiveDialogFooter className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            size="lg"
            onClick={onCancel}
            className="w-full text-sm"
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            size="lg"
            onClick={() => onConfirm(mode)}
            className="w-full text-sm"
          >
            Restaurar
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
