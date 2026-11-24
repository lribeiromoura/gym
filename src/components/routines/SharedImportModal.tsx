'use client';

import React, { useMemo, useState } from 'react';
import { Check, Download, Dumbbell, Folder, Play, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { MUSCLE_LABELS } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { SharePayload } from '@/lib/share';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ROOT_FOLDER_VALUE = '__root__';

interface SharedImportModalProps {
  payload: SharePayload | null;
  onClose: () => void;
  onImported: () => void;
}

export function SharedImportModal({
  payload,
  onClose,
  onImported,
}: SharedImportModalProps) {
  const exercises = useWorkoutStore((s) => s.exercises);
  const folders = useWorkoutStore((s) => s.folders);
  const importSharedPayload = useWorkoutStore((s) => s.importSharedPayload);

  const [selectedFolderId, setSelectedFolderId] =
    useState<string>(ROOT_FOLDER_VALUE);
  const [importedSuccess, setImportedSuccess] = useState(false);

  const exerciseMap = useMemo(() => {
    const map = new Map(exercises.map((e) => [e.id, e]));
    if (payload?.ce) {
      for (const ce of payload.ce) {
        if (!map.has(ce.id)) {
          map.set(ce.id, {
            id: ce.id,
            title: ce.t,
            primaryMuscle: ce.pm,
            secondaryMuscles: ce.sm || [],
            equipment: ce.eq,
            measurementType: ce.mt,
            instructions: ce.in || [],
            isCustom: true,
          });
        }
      }
    }
    return map;
  }, [exercises, payload]);

  if (!payload) return null;

  const isFolder = payload.k === 'folder';
  const totalRoutines = payload.r.length;
  const totalExercises = payload.r.reduce((acc, r) => acc + r.ex.length, 0);
  const totalSets = payload.r.reduce(
    (acc, r) => acc + r.ex.reduce((sAcc, e) => sAcc + e.s.length, 0),
    0
  );

  const handleImport = (startImmediately = false) => {
    const targetFolderId =
      isFolder || selectedFolderId === ROOT_FOLDER_VALUE
        ? null
        : selectedFolderId;

    importSharedPayload(payload, {
      startImmediately,
      targetFolderId,
    });
    setImportedSuccess(true);
    toast.success(
      isFolder
        ? `Pasta "${payload.fn || 'Compartilhada'}" importada com ${totalRoutines} rotinas!`
        : startImmediately
        ? 'Treino importado e iniciado!'
        : 'Rotina adicionada às suas rotinas!'
    );
    setTimeout(() => {
      setImportedSuccess(false);
      onImported();
    }, 600);
  };

  return (
    <ResponsiveDialog
      open={Boolean(payload)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-xl">
        {/* Topo do Modal */}
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              {isFolder ? (
                <Folder className="w-5 h-5" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                {isFolder
                  ? 'Pasta de Treinos Compartilhada'
                  : 'Treino Compartilhado'}
              </span>
              <ResponsiveDialogTitle className="text-lg truncate">
                {isFolder ? payload.fn : payload.r[0]?.t || 'Treino'}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription
                className={payload.by ? undefined : 'sr-only'}
              >
                {payload.by ? (
                  <>
                    Compartilhado por{' '}
                    <strong className="text-foreground">{payload.by}</strong>
                  </>
                ) : isFolder ? (
                  'Prévia e importação de pasta de treinos compartilhada'
                ) : (
                  'Prévia e importação de treino compartilhado'
                )}
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        {/* Corpo com Prévia dos Exercícios e Séries */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Resumo Rápido */}
          <Card className="bg-secondary/60 shadow-none">
            <CardContent className="p-3 grid grid-cols-3 gap-2.5 text-center">
              <div>
                <span className="text-[11px] text-muted-foreground block">
                  {isFolder ? 'Rotinas' : 'Exercícios'}
                </span>
                <span className="text-base font-extrabold text-foreground tabular-nums">
                  {isFolder ? totalRoutines : totalExercises}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">
                  Total de Séries
                </span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
                  {totalSets}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-muted-foreground block">
                  Exercícios Novos
                </span>
                <span className="text-base font-extrabold text-foreground tabular-nums">
                  {payload.ce?.length || 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Lista detalhada de cada rotina compartilhada */}
          <div className="space-y-4">
            {payload.r.map((routine, rIdx) => (
              <Card key={rIdx} className="bg-secondary/40 shadow-none">
                <CardContent className="p-4 space-y-3">
                  {isFolder && (
                    <div className="border-b border-border pb-2">
                      <h3 className="text-sm font-extrabold text-foreground">
                        {routine.t}
                      </h3>
                      {routine.d && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {routine.d}
                        </p>
                      )}
                    </div>
                  )}

                  {!isFolder && routine.d && (
                    <p className="text-xs text-muted-foreground">{routine.d}</p>
                  )}

                  <div className="space-y-2">
                    {routine.ex.map((ex, exIdx) => {
                      const meta = exerciseMap.get(ex.e);
                      return (
                        <div
                          key={exIdx}
                          className="bg-card border border-border rounded-xl p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <Dumbbell className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                              <span className="text-xs sm:text-sm font-bold text-foreground truncate">
                                {meta?.title || 'Exercício'}
                              </span>
                            </div>
                            {meta && (
                              <Badge
                                variant="info"
                                className="rounded-md px-2 py-0.5 text-[10px] font-semibold shrink-0"
                              >
                                {MUSCLE_LABELS[meta.primaryMuscle]}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {ex.s.map((st, sIdx) => (
                              <Badge
                                key={sIdx}
                                variant="secondary"
                                className="rounded-lg px-2 py-0.5 text-[11px] font-medium tabular-nums"
                              >
                                {st.t === 'warmup'
                                  ? 'W'
                                  : st.t === 'dropset'
                                  ? 'D'
                                  : st.t === 'failure'
                                  ? 'F'
                                  : `${sIdx + 1}ª`}
                                : {st.w ? `${st.w}kg × ` : ''}
                                {st.r ?? 0} reps
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Se for uma única rotina e o usuário já tiver pastas, permite escolher onde salvar */}
          {!isFolder && folders.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="shared-import-folder">
                Salvar em qual pasta? (Opcional)
              </Label>
              <Select
                value={selectedFolderId}
                onValueChange={setSelectedFolderId}
              >
                <SelectTrigger id="shared-import-folder">
                  <SelectValue placeholder="Sem Pasta (Minhas Rotinas)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROOT_FOLDER_VALUE}>
                    Sem Pasta (Minhas Rotinas)
                  </SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <ResponsiveDialogFooter className="sm:flex-row">
          {importedSuccess ? (
            <div className="w-full min-h-12 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Importado com Sucesso!
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                variant="default"
                size="lg"
                onClick={() => handleImport(false)}
                className="flex-1 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isFolder
                    ? `Adicionar Pasta (${totalRoutines} rotinas)`
                    : 'Adicionar às Minhas Rotinas'}
                </span>
              </Button>

              {!isFolder && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleImport(true)}
                  className="bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm"
                >
                  <Play className="w-4 h-4 fill-current" /> Treinar Agora
                </Button>
              )}
            </div>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
