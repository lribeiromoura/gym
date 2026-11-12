'use client';

import React, { useMemo, useState } from 'react';
import {
  Check,
  Download,
  Dumbbell,
  Folder,
  Play,
  Share2,
  X,
} from 'lucide-react';
import { MUSCLE_LABELS } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { SharePayload } from '@/lib/share';

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

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
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
    importSharedPayload(payload, {
      startImmediately,
      targetFolderId: isFolder ? null : selectedFolderId || null,
    });
    setImportedSuccess(true);
    setTimeout(() => {
      setImportedSuccess(false);
      onImported();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Topo do Modal */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0084FF] flex items-center justify-center shrink-0">
              {isFolder ? (
                <Folder className="w-5 h-5" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0084FF] block">
                {isFolder
                  ? 'Pasta de Treinos Compartilhada'
                  : 'Treino Compartilhado'}
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">
                {isFolder ? payload.fn : payload.r[0]?.t || 'Treino'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Prévia dos Exercícios e Séries */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {payload.by && (
            <p className="text-xs text-slate-500">
              Compartilhado por{' '}
              <strong className="text-slate-800">{payload.by}</strong>
            </p>
          )}

          {/* Resumo Rápido */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <div>
              <span className="text-[11px] text-slate-500 block">
                {isFolder ? 'Rotinas' : 'Exercícios'}
              </span>
              <span className="text-base font-extrabold text-slate-900">
                {isFolder ? totalRoutines : totalExercises}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">
                Total de Séries
              </span>
              <span className="text-base font-extrabold text-[#0084FF]">
                {totalSets}
              </span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 block">
                Exercícios Novos
              </span>
              <span className="text-base font-extrabold text-slate-900">
                {payload.ce?.length || 0}
              </span>
            </div>
          </div>

          {/* Lista detalhada de cada rotina compartilhada */}
          <div className="space-y-4">
            {payload.r.map((routine, rIdx) => (
              <div
                key={rIdx}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
              >
                {isFolder && (
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {routine.t}
                    </h3>
                    {routine.d && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {routine.d}
                      </p>
                    )}
                  </div>
                )}

                {!isFolder && routine.d && (
                  <p className="text-xs text-slate-600">{routine.d}</p>
                )}

                <div className="space-y-2">
                  {routine.ex.map((ex, exIdx) => {
                    const meta = exerciseMap.get(ex.e);
                    return (
                      <div
                        key={exIdx}
                        className="bg-white border border-slate-200/80 rounded-xl p-3 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Dumbbell className="w-4 h-4 text-[#0084FF] shrink-0" />
                            <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                              {meta?.title || 'Exercício'}
                            </span>
                          </div>
                          {meta && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0084FF] text-[10px] font-semibold shrink-0">
                              {MUSCLE_LABELS[meta.primaryMuscle]}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {ex.s.map((st, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium"
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
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Se for uma única rotina e o usuário já tiver pastas, permite escolher onde salvar */}
          {!isFolder && folders.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Salvar em qual pasta? (Opcional)
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-900 font-medium"
              >
                <option value="">Sem Pasta (Minhas Rotinas)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Rodapé com Botões de Ação */}
        <div className="p-4 border-t border-slate-100 bg-white space-y-2">
          {importedSuccess ? (
            <div className="w-full py-3.5 rounded-2xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Importado com Sucesso!
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => handleImport(false)}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#0084FF] hover:bg-blue-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isFolder
                    ? `Adicionar Pasta (${totalRoutines} rotinas)`
                    : 'Adicionar às Minhas Rotinas'}
                </span>
              </button>

              {!isFolder && (
                <button
                  type="button"
                  onClick={() => handleImport(true)}
                  className="py-3.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-sm flex items-center justify-center gap-1.5 transition"
                >
                  <Play className="w-4 h-4 fill-current" /> Treinar Agora
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
