'use client';

import React, { useMemo, useState } from 'react';
import {
  Award,
  BookmarkPlus,
  Calendar,
  Check,
  Clock,
  Dumbbell,
  Edit3,
  Play,
  Trash2,
  Trophy,
} from 'lucide-react';
import { MUSCLE_LABELS } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { calculate1RM, formatDuration } from '@/lib/calculations';

export function SocialFeedView() {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const exercises = useWorkoutStore((s) => s.exercises);
  const settings = useWorkoutStore((s) => s.settings);
  const startEmptyWorkout = useWorkoutStore((s) => s.startEmptyWorkout);
  const startWorkoutFromExercises = useWorkoutStore(
    (s) => s.startWorkoutFromExercises
  );
  const startEditWorkoutSession = useWorkoutStore(
    (s) => s.startEditWorkoutSession
  );
  const deleteWorkoutSession = useWorkoutStore((s) => s.deleteWorkoutSession);
  const saveWorkoutSessionAsRoutine = useWorkoutStore(
    (s) => s.saveWorkoutSessionAsRoutine
  );

  const [expandedSessionIds, setExpandedSessionIds] = useState<
    Record<string, boolean>
  >({});
  const [savedToastId, setSavedToastId] = useState<string | null>(null);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );

  const toggleExpand = (id: string) => {
    setExpandedSessionIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Meus Treinos
          </h1>
          <p className="text-sm text-slate-400">
            Histórico das suas sessões concluídas ({workoutHistory.length})
          </p>
        </div>
      </div>

      {/* Estado Vazio ou Lista de Treinos do Usuário */}
      {workoutHistory.length === 0 ? (
        <div className="bg-[#12151F] border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <Dumbbell className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Nenhum treino registrado ainda
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Assim que você finalizar seu primeiro treino, ele aparecerá aqui com todas as séries, volume, tempo e recordes pessoais.
            </p>
          </div>
          <button
            onClick={() => startEmptyWorkout('Treino Livre')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold transition"
          >
            <Play className="w-4 h-4 fill-current" /> Iniciar Primeiro Treino
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {workoutHistory.map((w) => {
            const isExpanded = !!expandedSessionIds[w.id];
            const musclesTrained = Array.from(
              new Set(
                w.exercises
                  .map((e) => exerciseMap.get(e.exerciseId)?.primaryMuscle)
                  .filter(Boolean)
              )
            );

            return (
              <div
                key={w.id}
                className="bg-[#12151F] border border-slate-800/90 rounded-2xl p-5 space-y-4 shadow-lg"
              >
                {/* Topo do Card: Usuário, Data e Ações (Editar, Salvar Rotina, Excluir) */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1D8FE1] to-blue-700 flex items-center justify-center font-extrabold text-sm text-white">
                      {(settings.name || 'U')
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm">
                        {settings.name || 'Usuário'}
                      </span>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {new Date(w.startTime).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => startEditWorkoutSession(w.id)}
                      title="Alterar / Editar este treino"
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-[#1D8FE1]/20 border border-slate-700 hover:border-[#1D8FE1]/40 text-xs font-bold text-slate-200 hover:text-[#38BDF8] flex items-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Editar
                    </button>

                    <button
                      onClick={() => {
                        saveWorkoutSessionAsRoutine(w.id);
                        setSavedToastId(w.id);
                        setTimeout(() => setSavedToastId(null), 2500);
                      }}
                      title="Salvar como Rotina"
                      className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-[#1D8FE1]/20 border border-slate-700 hover:border-[#1D8FE1]/40 text-xs font-bold text-slate-200 hover:text-[#38BDF8] flex items-center gap-1.5 transition"
                    >
                      {savedToastId === w.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />{' '}
                          Salvo!
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5" /> Virar Rotina
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        if (
                          confirm(
                            'Tem certeza que deseja excluir este treino do histórico?'
                          )
                        ) {
                          deleteWorkoutSession(w.id);
                        }
                      }}
                      title="Excluir Treino"
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-red-500/20 border border-slate-700 hover:border-red-500/40 text-slate-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Título e Descrição */}
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-white">
                    {w.title}
                  </h2>
                  {w.description && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {w.description}
                    </p>
                  )}
                </div>

                {/* Métricas da Sessão */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 bg-[#0B0D14] border border-slate-800/80 rounded-xl p-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#38BDF8]" /> Tempo
                    </span>
                    <p className="text-sm font-extrabold text-white mt-0.5">
                      {formatDuration(w.durationSeconds)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Dumbbell className="w-3 h-3 text-[#38BDF8]" /> Volume
                    </span>
                    <p className="text-sm font-extrabold text-white mt-0.5">
                      {w.totalVolumeKg.toLocaleString('pt-BR')} kg
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      Séries
                    </span>
                    <p className="text-sm font-extrabold text-white mt-0.5">
                      {w.totalSets} séries
                    </p>
                  </div>
                  <div className="col-span-3 sm:col-span-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-amber-400" /> Recordes
                    </span>
                    <p className="text-sm font-extrabold text-amber-400 mt-0.5">
                      {w.prCount} PRs
                    </p>
                  </div>
                </div>

                {/* Tags Musculares */}
                {musclesTrained.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {musclesTrained.map((m) =>
                      m ? (
                        <span
                          key={m}
                          className="px-2.5 py-0.5 rounded-md bg-[#1D8FE1]/15 text-[#38BDF8] text-[11px] font-semibold"
                        >
                          {MUSCLE_LABELS[m]}
                        </span>
                      ) : null
                    )}
                  </div>
                )}

                {/* Lista de Exercícios e Séries */}
                <div className="space-y-2 border-t border-slate-800/80 pt-3">
                  {w.exercises.map((ex) => {
                    const meta = exerciseMap.get(ex.exerciseId);
                    const bestSet = ex.sets.reduce((best, cur) => {
                      const cur1RM = calculate1RM(cur.weightKg, cur.reps);
                      const best1RM = calculate1RM(best?.weightKg, best?.reps);
                      return cur1RM > best1RM ? cur : best;
                    }, ex.sets[0]);
                    const hasPR = ex.sets.some(
                      (s) => s.prs && s.prs.length > 0
                    );

                    return (
                      <div
                        key={ex.id}
                        className="bg-[#161A26] border border-slate-800/60 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 font-bold text-white">
                            <span className="text-[#38BDF8]">
                              {ex.sets.length} séries
                            </span>
                            <span>•</span>
                            <span>{meta?.title || 'Exercício'}</span>
                            {hasPR && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold flex items-center gap-1">
                                <Award className="w-3 h-3" /> PR
                              </span>
                            )}
                          </div>
                          {bestSet && (
                            <span className="text-slate-300 font-semibold">
                              Melhor: {bestSet.weightKg ?? 0}kg ×{' '}
                              {bestSet.reps ?? 0}
                            </span>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="space-y-1 pt-2 border-t border-slate-800/70">
                            {ex.sets.map((s, sIdx) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between text-[11px] text-slate-300 px-2 py-1 rounded bg-[#0D0F17]"
                              >
                                <span>
                                  Série{' '}
                                  {s.type === 'warmup'
                                    ? 'W'
                                    : s.type === 'dropset'
                                    ? 'D'
                                    : s.type === 'failure'
                                    ? 'F'
                                    : sIdx + 1}
                                  :{' '}
                                  <strong>
                                    {s.weightKg ?? 0}kg × {s.reps ?? 0} reps
                                  </strong>
                                </span>
                                <span className="text-slate-500">
                                  1RM: {calculate1RM(s.weightKg, s.reps)}kg
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => toggleExpand(w.id)}
                      className="text-xs font-bold text-[#38BDF8] hover:underline"
                    >
                      {isExpanded
                        ? 'Ocultar detalhes das séries'
                        : 'Ver todas as séries detalhadas'}
                    </button>

                    <button
                      onClick={() =>
                        startWorkoutFromExercises(w.title, w.exercises)
                      }
                      className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-current" /> Repetir Treino
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
