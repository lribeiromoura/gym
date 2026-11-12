'use client';

import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import type { BackupFile, RestoreMode } from '@/lib/backup';
import { summarizeBackup } from '@/lib/backup';

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
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#0084FF]" /> Restaurar Backup
            </h3>
            <p className="text-xs text-slate-500 mt-1">Criado em {exportedLabel}</p>
          </div>
          <button
            onClick={onCancel}
            aria-label="Fechar"
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
          {rows.map(([label, count]) => (
            <li key={label} className="flex justify-between px-4 py-2.5">
              <span className="text-slate-600">{label}</span>
              <span className="font-bold text-slate-900">{count}</span>
            </li>
          ))}
        </ul>
        {!file.includesPhotos && (
          <p className="text-xs text-slate-500">Este backup foi criado sem fotos.</p>
        )}

        <div className="space-y-2">
          {(
            [
              ['replace', 'Substituir tudo', 'Troca os dados atuais pelos do backup.'],
              ['merge', 'Mesclar', 'Mantém os dados atuais e adiciona só o que não existe.'],
            ] as const
          ).map(([value, title, desc]) => (
            <label
              key={value}
              className={`flex gap-3 items-start p-3 rounded-xl border cursor-pointer transition ${
                mode === value
                  ? 'border-[#0084FF] bg-blue-50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="restore-mode"
                className="mt-1 accent-[#0084FF]"
                checked={mode === value}
                onChange={() => setMode(value)}
              />
              <span>
                <span className="block text-sm font-bold text-slate-900">{title}</span>
                <span className="block text-xs text-slate-500">{desc}</span>
              </span>
            </label>
          ))}
        </div>

        {mode === 'replace' && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Os dados atuais serão substituídos. Você poderá desfazer logo após a restauração.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(mode)}
            className="h-12 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white text-sm font-bold"
          >
            Restaurar
          </button>
        </div>
      </div>
    </div>
  );
}
