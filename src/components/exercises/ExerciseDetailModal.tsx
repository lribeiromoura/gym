'use client';

import React, { useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  Dumbbell,
  History,
  Info,
  TrendingUp,
  Trophy,
  X,
} from 'lucide-react';
import { EQUIPMENT_LABELS, Exercise, MUSCLE_LABELS } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculate1RM,
  getExerciseRecords,
  getRepMaxTable,
} from '@/lib/calculations';
import { BodyHeatmapSVG } from '@/components/analytics/BodyHeatmapSVG';

interface ExerciseDetailModalProps {
  exercise: Exercise | null;
  onClose: () => void;
}

export function ExerciseDetailModal({ exercise, onClose }: ExerciseDetailModalProps) {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const [activeTab, setActiveTab] = useState<'summary' | 'history' | 'howto'>(
    'summary'
  );
  const [metric, setMetric] = useState<'heaviest' | '1rm' | 'volume'>('1rm');

  const records = useMemo(() => {
    if (!exercise) return null;
    return getExerciseRecords(exercise.id, workoutHistory);
  }, [exercise, workoutHistory]);

  const exerciseSessions = useMemo(() => {
    if (!exercise) return [];
    return workoutHistory
      .map((session) => {
        const found = session.exercises.find((e) => e.exerciseId === exercise.id);
        if (!found) return null;
        const completedSets = found.sets.filter((s) => s.completed);
        if (completedSets.length === 0) return null;

        let maxWeight = 0;
        let max1RM = 0;
        let sessionVolume = 0;

        for (const s of completedSets) {
          if (s.type === 'warmup') continue;
          const w = s.weightKg ?? 0;
          const r = s.reps ?? 0;
          if (w > maxWeight) maxWeight = w;
          const e1rm = calculate1RM(w, r);
          if (e1rm > max1RM) max1RM = e1rm;
          sessionVolume += w * r;
        }

        return {
          sessionId: session.id,
          workoutTitle: session.title,
          date: session.startTime,
          notes: found.notes,
          sets: completedSets,
          maxWeight,
          max1RM,
          sessionVolume,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .reverse();
  }, [exercise, workoutHistory]);

  if (!exercise || !records) return null;

  const chartPoints = exerciseSessions.map((s) => ({
    dateLabel: new Date(s.date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
    value:
      metric === 'heaviest'
        ? s.maxWeight
        : metric === '1rm'
        ? s.max1RM
        : s.sessionVolume,
  }));

  const maxChartVal = Math.max(...chartPoints.map((p) => p.value), 10);
  const minChartVal = Math.max(
    0,
    Math.min(...chartPoints.map((p) => p.value)) * 0.85
  );
  const repMaxRows = getRepMaxTable(records.best1RM?.value || 100);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {exercise.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Primário:{' '}
              <span className="text-[#0084FF] font-semibold">
                {MUSCLE_LABELS[exercise.primaryMuscle]}
              </span>{' '}
              • Equipamento:{' '}
              <span className="text-slate-700 font-medium">
                {EQUIPMENT_LABELS[exercise.equipment]}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'summary'
                ? 'border-[#0084FF] text-[#0084FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Resumo & PRs
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-[#0084FF] text-[#0084FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico ({exerciseSessions.length})
          </button>
          <button
            onClick={() => setActiveTab('howto')}
            className={`py-3 text-xs sm:text-sm font-semibold border-b-2 transition flex items-center justify-center gap-1.5 ${
              activeTab === 'howto'
                ? 'border-[#0084FF] text-[#0084FF]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Como Fazer & 1RM
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'summary' && (
            <>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Anatomia Recrutada
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-[#0084FF] border border-blue-200">
                      Primário: {MUSCLE_LABELS[exercise.primaryMuscle]}
                    </span>
                    {exercise.secondaryMuscles.map((sec) => (
                      <span
                        key={sec}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-200/70 text-slate-700"
                      >
                        Secundário: {MUSCLE_LABELS[sec]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="w-44 shrink-0">
                  <BodyHeatmapSVG
                    highlightPrimary={exercise.primaryMuscle}
                    highlightSecondary={exercise.secondaryMuscles}
                    compact
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#0084FF]" />
                    Evolução do Exercício
                  </h3>
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      onClick={() => setMetric('1rm')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        metric === '1rm'
                          ? 'bg-[#0084FF] text-white'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      1RM Estimado
                    </button>
                    <button
                      onClick={() => setMetric('heaviest')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        metric === 'heaviest'
                          ? 'bg-[#0084FF] text-white'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Maior Peso
                    </button>
                    <button
                      onClick={() => setMetric('volume')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition ${
                        metric === 'volume'
                          ? 'bg-[#0084FF] text-white'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Volume Sessão
                    </button>
                  </div>
                </div>

                {chartPoints.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Ainda não há sessões registradas para este exercício.
                  </p>
                ) : (
                  <div className="pt-2">
                    <svg viewBox="0 0 500 160" className="w-full h-40 overflow-visible">
                      {[0, 0.5, 1].map((t, idx) => {
                        const y = 20 + t * 110;
                        const val = Math.round(
                          maxChartVal - t * (maxChartVal - minChartVal)
                        );
                        return (
                          <g key={idx}>
                            <line
                              x1="40"
                              y1={y}
                              x2="485"
                              y2={y}
                              stroke="#CBD5E1"
                              strokeDasharray="4 4"
                            />
                            <text x="5" y={y + 4} fill="#64748B" fontSize="10">
                              {val}kg
                            </text>
                          </g>
                        );
                      })}

                      {chartPoints.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="#0084FF"
                          strokeWidth="3"
                          points={chartPoints
                            .map((pt, i) => {
                              const x =
                                50 + (i / (chartPoints.length - 1)) * 420;
                              const ratio =
                                maxChartVal === minChartVal
                                  ? 0.5
                                  : (pt.value - minChartVal) /
                                    (maxChartVal - minChartVal);
                              const y = 130 - ratio * 110;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}

                      {chartPoints.map((pt, i) => {
                        const x =
                          chartPoints.length === 1
                            ? 260
                            : 50 + (i / (chartPoints.length - 1)) * 420;
                        const ratio =
                          maxChartVal === minChartVal
                            ? 0.5
                            : (pt.value - minChartVal) / (maxChartVal - minChartVal);
                        const y = 130 - ratio * 110;
                        return (
                          <g key={i}>
                            <circle
                              cx={x}
                              cy={y}
                              r="5"
                              fill="#0084FF"
                              stroke="#FFFFFF"
                              strokeWidth="2"
                            />
                            <text
                              x={x}
                              y={y - 10}
                              textAnchor="middle"
                              fill="#0F172A"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              {pt.value}kg
                            </text>
                            <text
                              x={x}
                              y={150}
                              textAnchor="middle"
                              fill="#64748B"
                              fontSize="10"
                            >
                              {pt.dateLabel}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Recordes Pessoais (PRs)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[11px] text-slate-500">1RM Estimado</span>
                    <p className="text-lg font-extrabold text-amber-600 mt-1">
                      {records.best1RM ? `${records.best1RM.value} kg` : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[11px] text-slate-500">Maior Peso</span>
                    <p className="text-lg font-extrabold text-slate-900 mt-1">
                      {records.heaviestWeight
                        ? `${records.heaviestWeight.value} kg`
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[11px] text-slate-500">
                      Melhor Série (Vol)
                    </span>
                    <p className="text-lg font-extrabold text-[#0084FF] mt-1">
                      {records.bestSetVolume
                        ? `${records.bestSetVolume.value} kg`
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <span className="text-[11px] text-slate-500">
                      Volume Máx Sessão
                    </span>
                    <p className="text-lg font-extrabold text-emerald-600 mt-1">
                      {records.bestSessionVolume
                        ? `${records.bestSessionVolume.value} kg`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {exerciseSessions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Nenhum histórico encontrado para este exercício.
                </div>
              ) : (
                [...exerciseSessions].reverse().map((sess) => (
                  <div
                    key={sess.sessionId}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {sess.workoutTitle}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(sess.date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        <span className="text-slate-500">1RM da Sessão: </span>
                        <span className="font-bold text-[#0084FF]">
                          {sess.max1RM} kg
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {sess.sets.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-white border border-slate-200/70"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] bg-slate-100 text-slate-700">
                              {s.type === 'warmup'
                                ? 'W'
                                : s.type === 'dropset'
                                ? 'D'
                                : s.type === 'failure'
                                ? 'F'
                                : idx + 1}
                            </span>
                            <span className="text-slate-900 font-semibold">
                              {s.weightKg ?? 0} kg × {s.reps ?? 0} reps
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {s.prs && s.prs.length > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 font-bold text-[10px] flex items-center gap-1">
                                <Award className="w-3 h-3" /> PR
                              </span>
                            )}
                            <span className="text-slate-500">
                              1RM: {calculate1RM(s.weightKg, s.reps)}kg
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'howto' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-[#0084FF]" />
                  Instruções Passo a Passo
                </h3>
                {exercise.instructions.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Nenhuma instrução cadastrada para este exercício.
                  </p>
                ) : (
                  <ol className="space-y-2.5 text-xs sm:text-sm text-slate-700 list-decimal list-inside">
                    {exercise.instructions.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                )}
                {exercise.tips && (
                  <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-700 flex items-start gap-2">
                    <Info className="w-4 h-4 text-[#0084FF] shrink-0 mt-0.5" />
                    <span>{exercise.tips}</span>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Tabela de Equivalência 1RM
                  </h3>
                  <span className="text-xs text-slate-500">
                    Baseada no 1RM de{' '}
                    <strong className="text-amber-600">
                      {records.best1RM?.value || 100} kg
                    </strong>
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs">
                  {repMaxRows.map((row) => (
                    <div
                      key={row.reps}
                      className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between"
                    >
                      <span className="text-slate-500 font-medium">
                        {row.reps} {row.reps === 1 ? 'rep' : 'reps'} ({row.pct}%)
                      </span>
                      <span className="font-bold text-slate-900">
                        {row.weight}kg
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
