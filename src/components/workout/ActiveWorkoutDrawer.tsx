'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Award,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Disc,
  Dumbbell,
  Flame,
  Layers,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import {
  EQUIPMENT_LABELS,
  EquipmentType,
  Exercise,
  MUSCLE_LABELS,
  MuscleGroup,
  RPEValue,
  SetType,
} from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculate1RM,
  calculateMuscleDistribution,
  calculatePlates,
  formatDuration,
  formatTimerClock,
  generateWarmupSets,
  getPreviousExerciseSets,
} from '@/lib/calculations';
import { ExerciseDetailModal } from '@/components/exercises/ExerciseDetailModal';
import { BodyHeatmapSVG } from '@/components/analytics/BodyHeatmapSVG';

const SUPERSET_COLORS: Record<
  number,
  { border: string; badge: string; label: string }
> = {
  1: {
    border: 'border-l-4 border-l-purple-500',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    label: 'Superset A',
  },
  2: {
    border: 'border-l-4 border-l-emerald-500',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    label: 'Superset B',
  },
  3: {
    border: 'border-l-4 border-l-amber-500',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    label: 'Superset C',
  },
};

const RPE_OPTIONS: RPEValue[] = [null, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

function playTimerBeep() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const playTone = (freq: number, delay: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + delay + 0.25
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.26);
    };
    playTone(880, 0);
    playTone(880, 0.28);
    playTone(1174.66, 0.56);
  } catch {
    // Ignore autoplay errors
  }
}

export function ActiveWorkoutDrawer() {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const exercises = useWorkoutStore((s) => s.exercises);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const settings = useWorkoutStore((s) => s.settings);
  const lastFinishedWorkout = useWorkoutStore((s) => s.lastFinishedWorkout);

  const toggleMinimizeWorkout = useWorkoutStore((s) => s.toggleMinimizeWorkout);
  const updateActiveWorkoutMeta = useWorkoutStore(
    (s) => s.updateActiveWorkoutMeta
  );
  const addExerciseToActiveWorkout = useWorkoutStore(
    (s) => s.addExerciseToActiveWorkout
  );
  const replaceExerciseInActiveWorkout = useWorkoutStore(
    (s) => s.replaceExerciseInActiveWorkout
  );
  const removeExerciseFromActiveWorkout = useWorkoutStore(
    (s) => s.removeExerciseFromActiveWorkout
  );
  const moveExerciseInActiveWorkout = useWorkoutStore(
    (s) => s.moveExerciseInActiveWorkout
  );
  const updateExerciseNotesOrRest = useWorkoutStore(
    (s) => s.updateExerciseNotesOrRest
  );
  const addSetToActiveExercise = useWorkoutStore(
    (s) => s.addSetToActiveExercise
  );
  const removeSetFromActiveExercise = useWorkoutStore(
    (s) => s.removeSetFromActiveExercise
  );
  const updateActiveSet = useWorkoutStore((s) => s.updateActiveSet);
  const toggleCompleteSet = useWorkoutStore((s) => s.toggleCompleteSet);
  const finishActiveWorkout = useWorkoutStore((s) => s.finishActiveWorkout);
  const discardActiveWorkout = useWorkoutStore((s) => s.discardActiveWorkout);
  const clearLastFinishedWorkout = useWorkoutStore(
    (s) => s.clearLastFinishedWorkout
  );
  const addCustomExercise = useWorkoutStore((s) => s.addCustomExercise);

  const tickRestTimer = useWorkoutStore((s) => s.tickRestTimer);
  const adjustRestTimer = useWorkoutStore((s) => s.adjustRestTimer);
  const stopRestTimer = useWorkoutStore((s) => s.stopRestTimer);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExercisePicker, setShowExercisePicker] = useState<{
    mode: 'add' | 'replace';
    targetWorkoutExerciseId?: string;
  } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [quickExMuscle, setQuickExMuscle] = useState<MuscleGroup>('chest');
  const [quickExEquip, setQuickExEquip] = useState<EquipmentType>('barbell');

  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);
  const [plateCalcModal, setPlateCalcModal] = useState<{
    weightKg: number;
    workoutExerciseId?: string;
  } | null>(null);
  const [barWeightKg, setBarWeightKg] = useState(
    settings.defaultBarWeightKg || 20
  );
  const [showFinishModal, setShowFinishModal] = useState(false);

  const isEditingSession = !!activeWorkout?.editingSessionId;

  useEffect(() => {
    if (!activeWorkout) {
      setElapsedSeconds(0);
      return;
    }
    if (activeWorkout.durationSecondsOverride) {
      setElapsedSeconds(activeWorkout.durationSecondsOverride);
      return;
    }
    const updateClock = () => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - activeWorkout.startTime) / 1000))
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [activeWorkout]);

  useEffect(() => {
    if (!restTimer.isActive) return;
    const interval = setInterval(() => {
      if (restTimer.remainingSeconds === 1 && settings.soundEnabled) {
        playTimerBeep();
      }
      tickRestTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [
    restTimer.isActive,
    restTimer.remainingSeconds,
    settings.soundEnabled,
    tickRestTimer,
  ]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );

  const liveStats = useMemo(() => {
    if (!activeWorkout) return { volumeKg: 0, completedSets: 0, totalSets: 0 };
    let volumeKg = 0;
    let completedSets = 0;
    let totalSets = 0;
    for (const ex of activeWorkout.exercises) {
      for (const s of ex.sets) {
        totalSets += 1;
        if (s.completed) {
          completedSets += 1;
          if (s.type !== 'warmup') {
            volumeKg += (s.weightKg ?? 0) * (s.reps ?? 0);
          }
        }
      }
    }
    return { volumeKg: Math.round(volumeKg), completedSets, totalSets };
  }, [activeWorkout]);

  const cycleSetType = (current: SetType): SetType => {
    const order: SetType[] = ['normal', 'warmup', 'dropset', 'failure'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    return order[nextIdx];
  };

  if (!activeWorkout && lastFinishedWorkout) {
    const finishedMuscleDist = calculateMuscleDistribution(
      [lastFinishedWorkout],
      exercises
    );
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
        <div className="bg-[#12151F] border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Trophy className="w-9 h-9" />
            </div>
            <span className="px-3 py-1 rounded-full bg-[#1D8FE1]/20 text-[#38BDF8] text-xs font-bold uppercase tracking-wider inline-block">
              Treino #{workoutHistory.length} Concluído!
            </span>
            <h2 className="text-2xl font-extrabold text-white">
              {lastFinishedWorkout.title}
            </h2>
            <p className="text-xs text-slate-400">
              Excelente trabalho! Seu treino foi salvo no seu histórico.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#0B0D14] border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[11px] text-slate-400">Volume Total</span>
              <p className="text-base font-extrabold text-white mt-0.5">
                {lastFinishedWorkout.totalVolumeKg.toLocaleString('pt-BR')} kg
              </p>
            </div>
            <div className="bg-[#0B0D14] border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[11px] text-slate-400">Duração</span>
              <p className="text-base font-extrabold text-[#38BDF8] mt-0.5">
                {formatDuration(lastFinishedWorkout.durationSeconds)}
              </p>
            </div>
            <div className="bg-[#0B0D14] border border-slate-800 rounded-2xl p-3 text-center">
              <span className="text-[11px] text-slate-400">Recordes (PRs)</span>
              <p className="text-base font-extrabold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                <Award className="w-4 h-4" /> {lastFinishedWorkout.prCount}
              </p>
            </div>
          </div>

          {lastFinishedWorkout.prCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Trophy className="w-4 h-4" /> Novos Recordes Pessoais Batidos
              </h3>
              <div className="space-y-1.5">
                {lastFinishedWorkout.exercises.map((ex) => {
                  const meta = exerciseMap.get(ex.exerciseId);
                  return ex.sets
                    .filter((s) => s.prs && s.prs.length > 0)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs bg-[#0B0D14]/80 px-3 py-2 rounded-xl"
                      >
                        <span className="font-bold text-white">
                          {meta?.title}
                        </span>
                        <span className="text-amber-300 font-semibold">
                          {s.weightKg}kg × {s.reps} reps (1RM:{' '}
                          {calculate1RM(s.weightKg, s.reps)}kg)
                        </span>
                      </div>
                    ));
                })}
              </div>
            </div>
          )}

          <div className="bg-[#0B0D14] border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center mb-2">
              Músculos Trabalhados na Sessão
            </h3>
            <BodyHeatmapSVG muscleScores={finishedMuscleDist} compact />
          </div>

          <button
            onClick={clearLastFinishedWorkout}
            className="w-full py-3.5 rounded-2xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-extrabold text-sm shadow-lg shadow-[#1D8FE1]/25 transition"
          >
            Fechar Resumo
          </button>
        </div>
      </div>
    );
  }

  if (!activeWorkout) return null;

  if (activeWorkout.isMinimized) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-2 right-2 md:left-72 md:right-6 z-40">
        <div className="bg-[#141926]/95 backdrop-blur-md border border-[#1D8FE1]/50 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div
            onClick={() => toggleMinimizeWorkout(false)}
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1D8FE1] text-white flex items-center justify-center shrink-0 animate-pulse">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#38BDF8]">
                  {isEditingSession ? 'Editando Treino' : 'Treino em Andamento'}
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {formatTimerClock(elapsedSeconds)}
                </span>
              </div>
              <p className="text-sm font-bold text-white truncate">
                {activeWorkout.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {restTimer.isActive && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                {formatTimerClock(restTimer.remainingSeconds)}
              </div>
            )}
            <button
              onClick={() => toggleMinimizeWorkout(false)}
              className="px-3.5 py-2 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold flex items-center gap-1"
            >
              <ChevronUp className="w-4 h-4" /> Abrir
            </button>
          </div>
        </div>
      </div>
    );
  }

  const plateBreakdown = plateCalcModal
    ? calculatePlates(plateCalcModal.weightKg, barWeightKg)
    : null;
  const warmupSuggestions = plateCalcModal
    ? generateWarmupSets(plateCalcModal.weightKg, barWeightKg)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-[#090A0F] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Top Bar Fixa do Logger */}
      <div className="bg-[#12151F] border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2 shrink-0">
        <button
          onClick={() => toggleMinimizeWorkout(true)}
          className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="hidden sm:inline">Minimizar</span>
        </button>

        <div className="flex items-center gap-4 sm:gap-6 text-xs">
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
              {isEditingSession ? 'Modo Edição' : 'Duração'}
            </span>
            <span className="font-mono font-extrabold text-sm text-[#38BDF8]">
              {formatTimerClock(elapsedSeconds)}
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
              Volume
            </span>
            <span className="font-extrabold text-sm text-white">
              {liveStats.volumeKg.toLocaleString('pt-BR')} kg
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
              Séries
            </span>
            <span className="font-extrabold text-sm text-emerald-400">
              {liveStats.completedSets}/{liveStats.totalSets}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditingSession && (
            <button
              onClick={() =>
                startRestTimer(settings.defaultRestSeconds, 'Descanso Manual')
              }
              title="Iniciar Timer de Descanso"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#38BDF8] transition"
            >
              <Timer className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() =>
              isEditingSession ? finishActiveWorkout(false) : setShowFinishModal(true)
            }
            className="px-4 py-2 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-[#1D8FE1]/25 transition"
          >
            {isEditingSession ? 'Salvar Alterações' : 'Finalizar'}
          </button>
        </div>
      </div>

      {/* Banner de Timer de Descanso Ativo */}
      {restTimer.isActive && (
        <div className="bg-[#161E2E] border-b border-[#1D8FE1]/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-[#38BDF8] animate-bounce" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">
                  Descanso: {formatTimerClock(restTimer.remainingSeconds)}
                </span>
                {restTimer.exerciseTitle && (
                  <span className="text-[11px] text-slate-400">
                    ({restTimer.exerciseTitle})
                  </span>
                )}
              </div>
              <div className="w-44 sm:w-64 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#1D8FE1] transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (restTimer.remainingSeconds /
                        Math.max(1, restTimer.totalSeconds)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => adjustRestTimer(-15)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              -15s
            </button>
            <button
              onClick={() => adjustRestTimer(15)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              +15s
            </button>
            <button
              onClick={stopRestTimer}
              className="px-3 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold"
            >
              Pular
            </button>
          </div>
        </div>
      )}

      {/* Corpo Rolável do Treino */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-5 pb-32">
        <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-4 space-y-3">
          <input
            type="text"
            value={activeWorkout.title}
            onChange={(e) =>
              updateActiveWorkoutMeta(e.target.value, activeWorkout.description)
            }
            placeholder="Nome do Treino"
            className="w-full bg-transparent text-lg sm:text-xl font-extrabold text-white focus:outline-none border-b border-transparent focus:border-slate-700 pb-1"
          />
          <input
            type="text"
            value={activeWorkout.description}
            onChange={(e) =>
              updateActiveWorkoutMeta(activeWorkout.title, e.target.value)
            }
            placeholder="Notas da sessão..."
            className="w-full bg-[#0B0D14] border border-slate-800/80 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#1D8FE1]"
          />
        </div>

        {activeWorkout.exercises.length === 0 ? (
          <div className="bg-[#12151F] border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-3">
            <Dumbbell className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">
              Nenhum exercício adicionado ainda
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Clique em &ldquo;+ Adicionar Exercício&rdquo; abaixo para selecionar ou criar um exercício.
            </p>
          </div>
        ) : (
          activeWorkout.exercises.map((workoutEx, exIdx) => {
            const meta = exerciseMap.get(workoutEx.exerciseId);
            const prevSets = getPreviousExerciseSets(
              workoutEx.exerciseId,
              workoutHistory,
              activeWorkout.editingSessionId
            );
            const supersetStyle = workoutEx.supersetId
              ? SUPERSET_COLORS[workoutEx.supersetId]
              : null;

            let normalSetCounter = 0;

            return (
              <div
                key={workoutEx.id}
                className={`bg-[#12151F] border border-slate-800 rounded-2xl p-4 space-y-4 ${
                  supersetStyle ? supersetStyle.border : ''
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => meta && setInspectExercise(meta)}
                        className="text-base font-extrabold text-[#38BDF8] hover:underline text-left flex items-center gap-1.5"
                      >
                        {meta?.title || 'Exercício'}
                      </button>
                      {supersetStyle && (
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${supersetStyle.badge}`}
                        >
                          {supersetStyle.label}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {meta ? MUSCLE_LABELS[meta.primaryMuscle] : ''} •{' '}
                      {meta ? EQUIPMENT_LABELS[meta.equipment] : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center bg-[#0B0D14] border border-slate-800 rounded-lg px-2 py-1 text-[11px]">
                      <Layers className="w-3 h-3 text-purple-400 mr-1" />
                      <select
                        value={workoutEx.supersetId ?? ''}
                        onChange={(e) =>
                          updateExerciseNotesOrRest(workoutEx.id, {
                            supersetId: e.target.value
                              ? Number(e.target.value)
                              : null,
                          })
                        }
                        className="bg-transparent text-slate-300 focus:outline-none"
                      >
                        <option value="">Sem Superset</option>
                        <option value="1">Superset A (Roxo)</option>
                        <option value="2">Superset B (Verde)</option>
                        <option value="3">Superset C (Âmbar)</option>
                      </select>
                    </div>

                    <div className="flex items-center bg-[#0B0D14] border border-slate-800 rounded-lg px-2 py-1 text-[11px]">
                      <Clock className="w-3 h-3 text-[#38BDF8] mr-1" />
                      <select
                        value={workoutEx.restTimerSeconds}
                        onChange={(e) =>
                          updateExerciseNotesOrRest(workoutEx.id, {
                            restTimerSeconds: Number(e.target.value),
                          })
                        }
                        className="bg-transparent text-slate-300 focus:outline-none"
                      >
                        <option value={0}>Timer Off</option>
                        <option value={45}>45s</option>
                        <option value={60}>1m 00s</option>
                        <option value={90}>1m 30s</option>
                        <option value={120}>2m 00s</option>
                        <option value={150}>2m 30s</option>
                        <option value={180}>3m 00s</option>
                      </select>
                    </div>

                    <button
                      onClick={() =>
                        setPlateCalcModal({
                          weightKg: workoutEx.sets[0]?.weightKg || 60,
                          workoutExerciseId: workoutEx.id,
                        })
                      }
                      title="Calculadora de Anilhas e Séries de Aquecimento"
                      className="p-1.5 rounded-lg bg-[#0B0D14] border border-slate-800 text-slate-300 hover:text-[#38BDF8]"
                    >
                      <Disc className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        setShowExercisePicker({
                          mode: 'replace',
                          targetWorkoutExerciseId: workoutEx.id,
                        })
                      }
                      title="Substituir Exercício"
                      className="p-1.5 rounded-lg bg-[#0B0D14] border border-slate-800 text-slate-300 hover:text-amber-400"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      disabled={exIdx === 0}
                      onClick={() =>
                        moveExerciseInActiveWorkout(workoutEx.id, 'up')
                      }
                      className="p-1.5 rounded-lg bg-[#0B0D14] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={exIdx === activeWorkout.exercises.length - 1}
                      onClick={() =>
                        moveExerciseInActiveWorkout(workoutEx.id, 'down')
                      }
                      className="p-1.5 rounded-lg bg-[#0B0D14] border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() =>
                        removeExerciseFromActiveWorkout(workoutEx.id)
                      }
                      title="Remover Exercício"
                      className="p-1.5 rounded-lg bg-[#0B0D14] border border-slate-800 text-slate-400 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={workoutEx.notes}
                  onChange={(e) =>
                    updateExerciseNotesOrRest(workoutEx.id, {
                      notes: e.target.value,
                    })
                  }
                  placeholder="Adicionar nota ao exercício..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0B0D14] border border-slate-800/70 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-[#1D8FE1]"
                />

                <div className="space-y-1.5">
                  <div className="grid grid-cols-12 gap-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <div className="col-span-1 text-center">Série</div>
                    <div className="col-span-3">Anterior</div>
                    <div className="col-span-2 text-center">
                      {meta?.measurementType === 'distance_duration'
                        ? 'KM'
                        : 'KG'}
                    </div>
                    <div className="col-span-2 text-center">
                      {meta?.measurementType === 'duration' ||
                      meta?.measurementType === 'distance_duration'
                        ? 'SEG'
                        : 'REPS'}
                    </div>
                    <div className="col-span-2 text-center">RPE</div>
                    <div className="col-span-2 text-right pr-1">✓</div>
                  </div>

                  {workoutEx.sets.map((s, setIdx) => {
                    if (s.type === 'normal') normalSetCounter += 1;
                    const prevSet = prevSets[setIdx];

                    return (
                      <div
                        key={s.id}
                        className={`grid grid-cols-12 gap-1.5 items-center px-2 py-1.5 rounded-xl transition ${
                          s.completed
                            ? 'bg-emerald-500/15 border border-emerald-500/30'
                            : 'bg-[#0B0D14] border border-slate-800/70'
                        }`}
                      >
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveSet(workoutEx.id, s.id, {
                                type: cycleSetType(s.type),
                              })
                            }
                            className={`w-6 h-6 rounded-lg font-extrabold text-xs flex items-center justify-center transition ${
                              s.type === 'warmup'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : s.type === 'dropset'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : s.type === 'failure'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : 'bg-slate-800 text-white'
                            }`}
                          >
                            {s.type === 'warmup'
                              ? 'W'
                              : s.type === 'dropset'
                              ? 'D'
                              : s.type === 'failure'
                              ? 'F'
                              : normalSetCounter}
                          </button>
                        </div>

                        <div className="col-span-3">
                          {prevSet ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateActiveSet(workoutEx.id, s.id, {
                                  weightKg: prevSet.weightKg,
                                  reps: prevSet.reps,
                                })
                              }
                              className="text-xs text-slate-400 hover:text-[#38BDF8] font-medium truncate block"
                            >
                              {prevSet.weightKg ?? 0}kg × {prevSet.reps ?? 0}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </div>

                        <div className="col-span-2">
                          {meta?.measurementType === 'distance_duration' ? (
                            <input
                              type="number"
                              step="0.1"
                              value={s.distanceKm ?? ''}
                              onChange={(e) =>
                                updateActiveSet(workoutEx.id, s.id, {
                                  distanceKm:
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value),
                                })
                              }
                              className="w-full text-center py-1 rounded-lg bg-[#141824] border border-slate-700/70 text-xs font-bold text-white focus:outline-none focus:border-[#1D8FE1]"
                            />
                          ) : (
                            <input
                              type="number"
                              step="0.5"
                              value={s.weightKg ?? ''}
                              onChange={(e) =>
                                updateActiveSet(workoutEx.id, s.id, {
                                  weightKg:
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value),
                                })
                              }
                              className="w-full text-center py-1 rounded-lg bg-[#141824] border border-slate-700/70 text-xs font-bold text-white focus:outline-none focus:border-[#1D8FE1]"
                            />
                          )}
                        </div>

                        <div className="col-span-2">
                          {meta?.measurementType === 'duration' ||
                          meta?.measurementType === 'distance_duration' ? (
                            <input
                              type="number"
                              value={s.durationSeconds ?? ''}
                              onChange={(e) =>
                                updateActiveSet(workoutEx.id, s.id, {
                                  durationSeconds:
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value),
                                })
                              }
                              className="w-full text-center py-1 rounded-lg bg-[#141824] border border-slate-700/70 text-xs font-bold text-white focus:outline-none focus:border-[#1D8FE1]"
                            />
                          ) : (
                            <input
                              type="number"
                              value={s.reps ?? ''}
                              onChange={(e) =>
                                updateActiveSet(workoutEx.id, s.id, {
                                  reps:
                                    e.target.value === ''
                                      ? null
                                      : Number(e.target.value),
                                })
                              }
                              className="w-full text-center py-1 rounded-lg bg-[#141824] border border-slate-700/70 text-xs font-bold text-white focus:outline-none focus:border-[#1D8FE1]"
                            />
                          )}
                        </div>

                        <div className="col-span-2">
                          <select
                            value={s.rpe ?? ''}
                            onChange={(e) =>
                              updateActiveSet(workoutEx.id, s.id, {
                                rpe:
                                  e.target.value === ''
                                    ? null
                                    : (Number(e.target.value) as RPEValue),
                              })
                            }
                            className="w-full text-center py-1 rounded-lg bg-[#141824] border border-slate-700/70 text-[11px] font-semibold text-slate-300 focus:outline-none"
                          >
                            {RPE_OPTIONS.map((rpeOpt) => (
                              <option key={String(rpeOpt)} value={rpeOpt ?? ''}>
                                {rpeOpt === null ? '—' : rpeOpt}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-2 flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => toggleCompleteSet(workoutEx.id, s.id)}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                              s.completed
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/25'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              removeSetFromActiveExercise(workoutEx.id, s.id)
                            }
                            className="p-1 text-slate-600 hover:text-red-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => addSetToActiveExercise(workoutEx.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar Série
                  </button>

                  <div className="text-[11px] text-slate-400">
                    Melhor 1RM na sessão:{' '}
                    <strong className="text-[#38BDF8]">
                      {Math.max(
                        0,
                        ...workoutEx.sets.map((s) =>
                          calculate1RM(s.weightKg, s.reps)
                        )
                      )}{' '}
                      kg
                    </strong>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowExercisePicker({ mode: 'add' })}
            className="py-3.5 rounded-2xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#1D8FE1]/20 transition"
          >
            <Plus className="w-5 h-5" /> Adicionar Exercício
          </button>

          <button
            type="button"
            onClick={() => {
              const msg = isEditingSession
                ? 'Deseja cancelar as alterações deste treino?'
                : 'Deseja descartar este treino em andamento?';
              if (confirm(msg)) {
                discardActiveWorkout();
              }
            }}
            className="py-3.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-sm flex items-center justify-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" />{' '}
            {isEditingSession ? 'Cancelar Edição' : 'Descartar Treino'}
          </button>
        </div>
      </div>

      {/* Modal Seletor + Criação Rápida de Exercício */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#12151F] border border-slate-800 rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {showExercisePicker.mode === 'replace'
                  ? 'Substituir Exercício'
                  : 'Adicionar Exercício ao Treino'}
              </h3>
              <button
                onClick={() => setShowExercisePicker(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Digite o nome do exercício para buscar ou criar..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0D14] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#1D8FE1]"
                />
              </div>

              {/* Criação Rápida Inline caso queira cadastrar na hora */}
              {pickerSearch.trim().length > 0 && (
                <div className="bg-[#0B0D14] border border-slate-800 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase">
                    Criar &ldquo;{pickerSearch.trim()}&rdquo; como novo exercício:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={quickExMuscle}
                      onChange={(e) =>
                        setQuickExMuscle(e.target.value as MuscleGroup)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#141824] border border-slate-800 text-xs text-white"
                    >
                      {MUSCLE_OPTIONS.map((m) => (
                        <option key={m} value={m}>
                          {MUSCLE_LABELS[m]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={quickExEquip}
                      onChange={(e) =>
                        setQuickExEquip(e.target.value as EquipmentType)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-[#141824] border border-slate-800 text-xs text-white"
                    >
                      {EQUIPMENT_OPTIONS.map((eq) => (
                        <option key={eq} value={eq}>
                          {EQUIPMENT_LABELS[eq]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const created = addCustomExercise({
                        title: pickerSearch.trim(),
                        primaryMuscle: quickExMuscle,
                        secondaryMuscles: [],
                        equipment: quickExEquip,
                        measurementType: 'weight_reps',
                        instructions: [],
                      });
                      if (
                        showExercisePicker.mode === 'replace' &&
                        showExercisePicker.targetWorkoutExerciseId
                      ) {
                        replaceExerciseInActiveWorkout(
                          showExercisePicker.targetWorkoutExerciseId,
                          created.id
                        );
                      } else {
                        addExerciseToActiveWorkout(created.id);
                      }
                      setShowExercisePicker(null);
                      setPickerSearch('');
                    }}
                    className="w-full py-2 rounded-lg bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Criar e Adicionar ao Treino
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {exercises.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Digite o nome do exercício no campo acima para criá-lo e adicioná-lo ao treino.
                </p>
              ) : (
                exercises
                  .filter(
                    (e) =>
                      e.title
                        .toLowerCase()
                        .includes(pickerSearch.toLowerCase()) ||
                      MUSCLE_LABELS[e.primaryMuscle]
                        .toLowerCase()
                        .includes(pickerSearch.toLowerCase())
                  )
                  .map((ex) => (
                    <button
                      key={ex.id}
                      onClick={() => {
                        if (
                          showExercisePicker.mode === 'replace' &&
                          showExercisePicker.targetWorkoutExerciseId
                        ) {
                          replaceExerciseInActiveWorkout(
                            showExercisePicker.targetWorkoutExerciseId,
                            ex.id
                          );
                        } else {
                          addExerciseToActiveWorkout(ex.id);
                        }
                        setShowExercisePicker(null);
                        setPickerSearch('');
                      }}
                      className="w-full text-left p-3 rounded-xl bg-[#171B26] hover:bg-[#1D8FE1]/20 border border-slate-800 hover:border-[#1D8FE1]/50 flex items-center justify-between transition"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">
                          {ex.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {MUSCLE_LABELS[ex.primaryMuscle]} •{' '}
                          {EQUIPMENT_LABELS[ex.equipment]}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-[#38BDF8]" />
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Calculadora de Anilhas & Séries de Aquecimento */}
      {plateCalcModal && plateBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#12151F] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#1D8FE1]" />
                Calculadora de Anilhas & Warm-up
              </h3>
              <button
                onClick={() => setPlateCalcModal(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Carga Total Alvo (kg)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setPlateCalcModal({
                          ...plateCalcModal,
                          weightKg: Math.max(
                            barWeightKg,
                            plateCalcModal.weightKg - 2.5
                          ),
                        })
                      }
                      className="p-2 rounded-lg bg-slate-800 text-white"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      step="2.5"
                      value={plateCalcModal.weightKg}
                      onChange={(e) =>
                        setPlateCalcModal({
                          ...plateCalcModal,
                          weightKg: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full text-center py-1.5 rounded-lg bg-[#0B0D14] border border-slate-800 text-sm font-extrabold text-white"
                    />
                    <button
                      onClick={() =>
                        setPlateCalcModal({
                          ...plateCalcModal,
                          weightKg: plateCalcModal.weightKg + 2.5,
                        })
                      }
                      className="p-2 rounded-lg bg-slate-800 text-white"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">
                    Peso da Barra
                  </label>
                  <select
                    value={barWeightKg}
                    onChange={(e) => setBarWeightKg(Number(e.target.value))}
                    className="w-full py-2 px-3 rounded-lg bg-[#0B0D14] border border-slate-800 text-xs font-bold text-white"
                  >
                    <option value={20}>20 kg (Olímpica Padrão)</option>
                    <option value={15}>15 kg (Olímpica Feminina)</option>
                    <option value={12}>12 kg (Barra Média)</option>
                    <option value={10}>10 kg (Barra W / Curta)</option>
                  </select>
                </div>
              </div>

              <div className="bg-[#0B0D14] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">
                    Anilhas por Lado da Barra:
                  </span>
                  <span className="text-[#38BDF8] font-bold">
                    {plateBreakdown.achievedWeight} kg total
                  </span>
                </div>

                <div className="flex items-center justify-center py-4 gap-1 min-h-[100px]">
                  <div className="w-12 h-3 bg-slate-500 rounded-l-md" />
                  <div className="w-2 h-8 bg-slate-400 rounded-sm" />
                  {plateBreakdown.platesPerSide.length === 0 ? (
                    <span className="text-xs text-slate-500 ml-3">
                      Apenas a barra ({barWeightKg}kg)
                    </span>
                  ) : (
                    plateBreakdown.platesPerSide.flatMap((p) =>
                      Array.from({ length: p.count }).map((_, idx) => {
                        const heightPx =
                          p.weight >= 20
                            ? 'h-20'
                            : p.weight >= 15
                            ? 'h-16'
                            : p.weight >= 10
                            ? 'h-14'
                            : p.weight >= 5
                            ? 'h-11'
                            : 'h-9';
                        return (
                          <div
                            key={`${p.weight}-${idx}`}
                            style={{ backgroundColor: p.color }}
                            className={`w-5 ${heightPx} rounded-sm flex items-center justify-center text-[9px] font-extrabold text-slate-950 shadow`}
                          >
                            {p.weight}
                          </div>
                        );
                      })
                    )
                  )}
                  <div className="w-8 h-3 bg-slate-500 rounded-r-md" />
                </div>

                {plateBreakdown.platesPerSide.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {plateBreakdown.platesPerSide.map((p) => (
                      <span
                        key={p.weight}
                        className="px-2.5 py-1 rounded-lg bg-[#151925] border border-slate-800 text-xs font-bold text-white"
                      >
                        {p.count}× {p.weight}kg
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#0B0D14] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> Sugestão de Aquecimento
                </h4>
                <div className="space-y-1.5">
                  {warmupSuggestions.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs bg-[#141824] px-3 py-1.5 rounded-lg"
                    >
                      <span className="text-slate-300">{w.label}</span>
                      <span className="font-bold text-amber-300">
                        {w.weightKg}kg × {w.reps} reps
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação ao Finalizar Treino */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#12151F] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-extrabold text-white">
              Finalizar Treino?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Você completou <strong>{liveStats.completedSets} séries</strong>{' '}
              com um volume total de{' '}
              <strong>{liveStats.volumeKg.toLocaleString('pt-BR')} kg</strong>.
            </p>

            {activeWorkout.routineId ? (
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => {
                    setShowFinishModal(false);
                    finishActiveWorkout(true);
                  }}
                  className="w-full py-3 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-bold text-xs sm:text-sm transition"
                >
                  Finalizar e Atualizar Rotina Original
                </button>
                <button
                  onClick={() => {
                    setShowFinishModal(false);
                    finishActiveWorkout(false);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition"
                >
                  Finalizar (Manter Rotina Original Intacta)
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowFinishModal(false);
                  finishActiveWorkout(false);
                }}
                className="w-full py-3 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-bold text-sm transition"
              >
                Confirmar e Salvar Treino
              </button>
            )}

            <button
              onClick={() => setShowFinishModal(false)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Voltar ao Treino
            </button>
          </div>
        </div>
      )}

      <ExerciseDetailModal
        exercise={inspectExercise}
        onClose={() => setInspectExercise(null)}
      />
    </div>
  );
}
