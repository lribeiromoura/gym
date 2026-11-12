'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock,
  ArrowUpDown,
  Award,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Dumbbell,
  FilePlus2,
  Gauge,
  Plus,
  RefreshCw,
  Search,
  Timer,
  Trash2,
  Trophy,
  MoreVertical,
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
  formatDuration,
  formatTimerClock,
  getPreviousExerciseSets,
} from '@/lib/calculations';
import { ExerciseDetailModal } from '@/components/exercises/ExerciseDetailModal';
import { BodyHeatmapSVG } from '@/components/analytics/BodyHeatmapSVG';
import {
  enableRestTimerNotifications,
  getNotificationPermissionState,
} from '@/lib/notifications';

const RPE_OPTIONS: RPEValue[] = [null, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

function formatRestLabel(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Desligado';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0 && secs > 0) return `${mins}min ${secs}s`;
  if (mins > 0) return `${mins}min`;
  return `${secs}s`;
}

function formatShortElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins}min ${secs}s` : `${mins}min`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}min`;
}

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

/**
 * Mini silhueta anatômica (frente e costas) para a barra de estatísticas do treino
 */
function MiniAnatomyFigures({
  activeMuscles,
}: {
  activeMuscles: Set<MuscleGroup>;
}) {
  const isChest = activeMuscles.has('chest');
  const isShoulders = activeMuscles.has('shoulders');
  const isArms = activeMuscles.has('biceps') || activeMuscles.has('triceps');
  const isAbs = activeMuscles.has('abs');
  const isQuads = activeMuscles.has('quads');
  const isBack =
    activeMuscles.has('lats') ||
    activeMuscles.has('upper_back') ||
    activeMuscles.has('lower_back') ||
    activeMuscles.has('traps');
  const isGlutesHamstrings =
    activeMuscles.has('glutes') || activeMuscles.has('hamstrings');
  const isCalves = activeMuscles.has('calves');

  const hi = '#0084FF';
  const base = '#CBD5E1';

  return (
    <div className="flex items-center gap-1.5 select-none">
      {/* Frente */}
      <svg viewBox="0 0 60 120" className="w-6 h-11">
        <circle cx="30" cy="11" r="7" fill="#94A3B8" />
        {/* Ombros */}
        <rect
          x="11"
          y="21"
          width="8"
          height="13"
          rx="4"
          fill={isShoulders ? hi : base}
        />
        <rect
          x="41"
          y="21"
          width="8"
          height="13"
          rx="4"
          fill={isShoulders ? hi : base}
        />
        {/* Peito */}
        <rect
          x="19"
          y="20"
          width="22"
          height="14"
          rx="3"
          fill={isChest ? hi : base}
        />
        {/* Abdômen */}
        <rect
          x="21"
          y="36"
          width="18"
          height="20"
          rx="3"
          fill={isAbs ? hi : base}
        />
        {/* Braços */}
        <rect
          x="9"
          y="35"
          width="7"
          height="22"
          rx="3"
          fill={isArms ? hi : base}
        />
        <rect
          x="44"
          y="35"
          width="7"
          height="22"
          rx="3"
          fill={isArms ? hi : base}
        />
        {/* Quadríceps */}
        <rect
          x="19"
          y="58"
          width="9"
          height="27"
          rx="4"
          fill={isQuads ? hi : base}
        />
        <rect
          x="32"
          y="58"
          width="9"
          height="27"
          rx="4"
          fill={isQuads ? hi : base}
        />
        {/* Panturrilhas */}
        <rect
          x="20"
          y="87"
          width="7"
          height="24"
          rx="3"
          fill={isCalves ? hi : base}
        />
        <rect
          x="33"
          y="87"
          width="7"
          height="24"
          rx="3"
          fill={isCalves ? hi : base}
        />
      </svg>

      {/* Costas */}
      <svg viewBox="0 0 60 120" className="w-6 h-11">
        <circle cx="30" cy="11" r="7" fill="#94A3B8" />
        {/* Ombros post */}
        <rect
          x="11"
          y="21"
          width="8"
          height="13"
          rx="4"
          fill={isShoulders ? hi : base}
        />
        <rect
          x="41"
          y="21"
          width="8"
          height="13"
          rx="4"
          fill={isShoulders ? hi : base}
        />
        {/* Dorsais / Costas */}
        <rect
          x="19"
          y="20"
          width="22"
          height="34"
          rx="4"
          fill={isBack ? hi : base}
        />
        {/* Braços */}
        <rect
          x="9"
          y="35"
          width="7"
          height="22"
          rx="3"
          fill={isArms ? hi : base}
        />
        <rect
          x="44"
          y="35"
          width="7"
          height="22"
          rx="3"
          fill={isArms ? hi : base}
        />
        {/* Glúteos e Posterior */}
        <rect
          x="19"
          y="56"
          width="9"
          height="29"
          rx="4"
          fill={isGlutesHamstrings ? hi : base}
        />
        <rect
          x="32"
          y="56"
          width="9"
          height="29"
          rx="4"
          fill={isGlutesHamstrings ? hi : base}
        />
        {/* Panturrilhas */}
        <rect
          x="20"
          y="87"
          width="7"
          height="24"
          rx="3"
          fill={isCalves ? hi : base}
        />
        <rect
          x="33"
          y="87"
          width="7"
          height="24"
          rx="3"
          fill={isCalves ? hi : base}
        />
      </svg>
    </div>
  );
}

/**
 * Avatar ilustrativo do exercício no estilo circular limpo
 */
function ExerciseIllustrationBadge({ muscle }: { muscle?: MuscleGroup }) {
  return (
    <div className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        {/* Banco / Máquina estilizada */}
        <rect x="10" y="32" width="28" height="4" rx="2" fill="#64748B" />
        <rect x="14" y="12" width="4" height="22" rx="1.5" fill="#94A3B8" />
        {/* Silhueta com destaque laranja/azul no músculo */}
        <circle cx="26" cy="14" r="4" fill="#334155" />
        <rect
          x="22"
          y="19"
          width="9"
          height="12"
          rx="3"
          fill={muscle === 'chest' ? '#F97316' : '#0084FF'}
        />
        <line
          x1="18"
          y1="22"
          x2="36"
          y2="22"
          stroke="#0F172A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="17" cy="22" r="3.5" fill="#1E293B" />
        <circle cx="37" cy="22" r="3.5" fill="#1E293B" />
      </svg>
    </div>
  );
}

/**
 * Linha de série com suporte a arrastar para a esquerda (Swipe-to-Delete)
 * Revela fundo vermelho "Excluir" ao arrastar para a esquerda; arrastar bastante exclui direto,
 * ou arrastar parcialmente trava aberto o botão vermelho "Excluir".
 */
function SwipeableSetRow({
  setId,
  completed,
  onDelete,
  children,
}: {
  setId: string;
  completed: boolean;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const offsetXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const baseOffsetRef = useRef(0);
  const directionLockedRef = useRef<'horizontal' | 'vertical' | null>(null);

  const REVEAL_WIDTH = 92;
  const FULL_SWIPE_DELETE_THRESHOLD = 185;

  const updateOffset = (val: number) => {
    offsetXRef.current = val;
    setOffsetX(val);
  };

  const finishDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    directionLockedRef.current = null;

    const currentOffset = offsetXRef.current;
    if (currentOffset <= -FULL_SWIPE_DELETE_THRESHOLD) {
      updateOffset(-400);
      setTimeout(() => {
        onDelete();
      }, 150);
    } else if (currentOffset <= -40) {
      updateOffset(-REVEAL_WIDTH);
    } else {
      updateOffset(0);
    }
  };

  const beginDrag = (clientX: number, clientY: number) => {
    startXRef.current = clientX;
    startYRef.current = clientY;
    baseOffsetRef.current = offsetXRef.current;
    directionLockedRef.current = null;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const moveDrag = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;

    if (!directionLockedRef.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      directionLockedRef.current =
        Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }

    if (directionLockedRef.current === 'vertical') return;

    const next = Math.min(0, Math.max(-260, baseOffsetRef.current + dx));
    updateOffset(next);
  };

  // Touch Events (iPhone / Android / Mobile Webview)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    beginDrag(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    finishDrag();
  };

  // Pointer & Mouse Events (Desktop / Mobile / Touchpad)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // handled by touch events
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    beginDrag(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    moveDrag(e.clientX, e.clientY);
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    finishDrag();
  };

  return (
    <div
      data-testid={`set-row-${setId}`}
      className="relative overflow-hidden select-none touch-pan-y"
    >
      {/* Fundo Vermelho de Exclusão revelado ao arrastar para a esquerda */}
      <div
        className={`absolute inset-y-0 right-0 flex items-center justify-end bg-[#EF4444] text-white transition-opacity ${
          offsetX < 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ width: `${Math.max(REVEAL_WIDTH, Math.abs(offsetX))}px` }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Excluir série"
          className="h-full w-full px-4 flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider text-white"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>Excluir</span>
        </button>
      </div>

      {/* Conteúdo Principal da Série que desliza para a esquerda */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onClick={() => {
          if (offsetXRef.current < -10 && !isDraggingRef.current) {
            updateOffset(0);
          }
        }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={`relative z-10 grid grid-cols-12 gap-1.5 items-center px-4 py-1.5 transition-colors ${
          completed ? 'bg-[#DCFCE7]' : 'bg-white'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export function ActiveWorkoutDrawer() {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const exercises = useWorkoutStore((s) => s.exercises);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const settings = useWorkoutStore((s) => s.settings);
  const lastFinishedWorkout = useWorkoutStore((s) => s.lastFinishedWorkout);

  const toggleMinimizeWorkout = useWorkoutStore((s) => s.toggleMinimizeWorkout);
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
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default');
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);

  useEffect(() => {
    setNotifPermission(getNotificationPermissionState());
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        tickRestTimer();
        setNotifPermission(getNotificationPermissionState());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, [tickRestTimer]);
  const [showExercisePicker, setShowExercisePicker] = useState<{
    mode: 'add' | 'replace';
    targetWorkoutExerciseId?: string;
  } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [quickExMuscle, setQuickExMuscle] = useState<MuscleGroup>('chest');
  const [quickExEquip, setQuickExEquip] = useState<EquipmentType>('barbell');

  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Estado do Bottom Sheet de 3 pontinhos (⋮) idêntico à imagem 1
  const [menuWorkoutExerciseId, setMenuWorkoutExerciseId] = useState<
    string | null
  >(null);

  // Estado do Modal de Reordenação
  const [showReorderSheet, setShowReorderSheet] = useState(false);

  // Estado de quais exercícios estão com o campo de Nota aberto
  const [openNotesIds, setOpenNotesIds] = useState<Record<string, boolean>>({});

  // Estado de seletor de RPE ativo para uma série específica
  const [activeRpePicker, setActiveRpePicker] = useState<{
    workoutExerciseId: string;
    setId: string;
    currentRpe: RPEValue;
  } | null>(null);

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
      const rem = restTimer.endTime
        ? Math.max(0, Math.ceil((restTimer.endTime - Date.now()) / 1000))
        : restTimer.remainingSeconds;
      if (rem === 1 && settings.soundEnabled) {
        playTimerBeep();
      }
      tickRestTimer();
    }, 500);
    return () => clearInterval(interval);
  }, [
    restTimer.isActive,
    restTimer.endTime,
    restTimer.remainingSeconds,
    settings.soundEnabled,
    tickRestTimer,
  ]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );

  const liveStats = useMemo(() => {
    if (!activeWorkout)
      return {
        volumeKg: 0,
        completedSets: 0,
        totalSets: 0,
        activeMuscles: new Set<MuscleGroup>(),
      };
    let volumeKg = 0;
    let completedSets = 0;
    let totalSets = 0;
    const activeMuscles = new Set<MuscleGroup>();

    for (const ex of activeWorkout.exercises) {
      const meta = exerciseMap.get(ex.exerciseId);
      let hasCompletedInEx = false;
      for (const s of ex.sets) {
        totalSets += 1;
        if (s.completed) {
          completedSets += 1;
          hasCompletedInEx = true;
          if (s.type !== 'warmup') {
            volumeKg += (s.weightKg ?? 0) * (s.reps ?? 0);
          }
        }
      }
      if (meta && (hasCompletedInEx || activeWorkout.exercises.length > 0)) {
        if (hasCompletedInEx) {
          activeMuscles.add(meta.primaryMuscle);
          meta.secondaryMuscles.forEach((m) => activeMuscles.add(m));
        }
      }
    }
    return {
      volumeKg: Math.round(volumeKg),
      completedSets,
      totalSets,
      activeMuscles,
    };
  }, [activeWorkout, exerciseMap]);

  const cycleSetType = (current: SetType): SetType => {
    const order: SetType[] = ['normal', 'warmup', 'dropset', 'failure'];
    const nextIdx = (order.indexOf(current) + 1) % order.length;
    return order[nextIdx];
  };

  const cycleRestTime = (currentSeconds: number): number => {
    const options = [0, 45, 60, 90, 120, 150, 180];
    const idx = options.indexOf(currentSeconds);
    return options[(idx + 1) % options.length];
  };

  // Modal de celebração pós-treino
  if (!activeWorkout && lastFinishedWorkout) {
    const finishedMuscleDist = calculateMuscleDistribution(
      [lastFinishedWorkout],
      exercises
    );
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <div className="bg-white text-slate-900 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-500 flex items-center justify-center mx-auto">
              <Trophy className="w-9 h-9" />
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#0084FF] text-xs font-bold uppercase tracking-wider inline-block">
              Treino #{workoutHistory.length} Concluído!
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {lastFinishedWorkout.title}
            </h2>
            <p className="text-xs text-slate-500">
              Excelente trabalho! Seu treino foi salvo no seu histórico.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[11px] text-slate-500">Volume Total</span>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">
                {lastFinishedWorkout.totalVolumeKg.toLocaleString('pt-BR')} kg
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[11px] text-slate-500">Duração</span>
              <p className="text-base font-extrabold text-[#0084FF] mt-0.5">
                {formatDuration(lastFinishedWorkout.durationSeconds)}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-[11px] text-slate-500">Recordes (PRs)</span>
              <p className="text-base font-extrabold text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                <Award className="w-4 h-4" /> {lastFinishedWorkout.prCount}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center mb-2">
              Músculos Trabalhados na Sessão
            </h3>
            <BodyHeatmapSVG muscleScores={finishedMuscleDist} compact />
          </div>

          <button
            onClick={clearLastFinishedWorkout}
            className="w-full py-3.5 rounded-2xl bg-[#0084FF] hover:bg-blue-600 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition"
          >
            Fechar Resumo
          </button>
        </div>
      </div>
    );
  }

  if (!activeWorkout) return null;

  // Mini-Player quando minimizado
  if (activeWorkout.isMinimized) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-2 right-2 md:left-72 md:right-6 z-40">
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div
            onClick={() => toggleMinimizeWorkout(false)}
            className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          >
            <div className="w-10 h-10 rounded-full bg-[#0084FF] text-white flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0084FF]">
                  Treino em Andamento
                </span>
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {formatShortElapsed(elapsedSeconds)}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-900 truncate">
                {activeWorkout.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {restTimer.isActive && (
              <div className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#0084FF] text-xs font-mono font-bold flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                {formatTimerClock(restTimer.remainingSeconds)}
              </div>
            )}
            <button
              onClick={() => toggleMinimizeWorkout(false)}
              className="px-4 py-2 rounded-full bg-[#0084FF] text-white text-xs font-bold flex items-center gap-1"
            >
              <ChevronUp className="w-4 h-4" /> Abrir
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressRatio =
    liveStats.totalSets > 0
      ? Math.min(100, (liveStats.completedSets / liveStats.totalSets) * 100)
      : 8;

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* ================= TOP HEADER (Idêntico às imagens de referência) ================= */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleMinimizeWorkout(true)}
            aria-label="Minimizar treino"
            className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-slate-200 flex items-center justify-center text-slate-800 transition"
          >
            <ChevronDown className="w-5 h-5 stroke-[2.2]" />
          </button>
          <span className="text-[17px] font-medium text-slate-900">
            {isEditingSession ? 'Editar Treino' : 'Treino'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              if (notifPermission === 'default') {
                const res = await enableRestTimerNotifications();
                if (res.granted) setNotifPermission('granted');
              }
              startRestTimer(settings.defaultRestSeconds, 'Descanso');
            }}
            aria-label="Timer de descanso"
            className="w-10 h-10 rounded-full bg-[#F1F5F9] hover:bg-slate-200 flex items-center justify-center text-slate-800 transition"
          >
            <AlarmClock className="w-5 h-5 stroke-[2]" />
          </button>
          <button
            onClick={() =>
              isEditingSession
                ? finishActiveWorkout(false)
                : setShowFinishModal(true)
            }
            className="px-5 py-2.5 rounded-full bg-[#0084FF] hover:bg-blue-600 text-white font-semibold text-[15px] shadow-sm transition"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* Linha de progresso azul fina logo abaixo do header */}
      <div className="w-full h-[2px] bg-slate-100 shrink-0">
        <div
          className="h-full bg-[#0084FF] transition-all duration-300"
          style={{ width: `${Math.max(8, progressRatio)}%` }}
        />
      </div>

      {/* ================= SUB-BARRA DE MÉTRICAS (Duração | Volume | Séries | Silhueta) ================= */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="grid grid-cols-3 gap-6 flex-1">
          <div>
            <span className="text-xs text-slate-400 block">Duração</span>
            <span className="text-[15px] font-medium text-[#0084FF] mt-0.5 block">
              {formatShortElapsed(elapsedSeconds)}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Volume</span>
            <span className="text-[15px] font-medium text-slate-900 mt-0.5 block">
              {liveStats.volumeKg.toLocaleString('pt-BR')} kg
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 block">Séries</span>
            <span className="text-[15px] font-medium text-slate-900 mt-0.5 block">
              {liveStats.completedSets}
            </span>
          </div>
        </div>

        <MiniAnatomyFigures activeMuscles={liveStats.activeMuscles} />
      </div>

      {/* Banner discreto para ativar notificações em segundo plano no iPhone/Android */}
      {notifPermission === 'default' && !notifBannerDismissed && (
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
          <p className="text-xs text-slate-700">
            Receber alerta no iPhone quando o descanso acabar?
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const res = await enableRestTimerNotifications();
                setNotifPermission(
                  res.granted ? 'granted' : getNotificationPermissionState()
                );
              }}
              className="px-3 py-1 rounded-full bg-[#0084FF] text-white text-xs font-bold"
            >
              Ativar
            </button>
            <button
              type="button"
              onClick={() => setNotifBannerDismissed(true)}
              className="p-1 text-slate-400 hover:text-slate-600"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ================= CORPO ROLÁVEL DOS EXERCÍCIOS ================= */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pb-36 max-w-3xl w-full mx-auto">
        {activeWorkout.exercises.length === 0 ? (
          <div className="p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Dumbbell className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Comece seu treino
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Adicione um exercício da biblioteca para registrar suas séries, cargas e repetições.
              </p>
            </div>
          </div>
        ) : (
          activeWorkout.exercises.map((workoutEx) => {
            const meta = exerciseMap.get(workoutEx.exerciseId);
            const prevSets = getPreviousExerciseSets(
              workoutEx.exerciseId,
              workoutHistory,
              activeWorkout.editingSessionId
            );
            const isNoteOpen =
              !!openNotesIds[workoutEx.id] || Boolean(workoutEx.notes);

            let normalSetCounter = 0;

            return (
              <div key={workoutEx.id} className="py-5 space-y-3.5 bg-white">
                {/* Linha 1: Avatar Ilustrativo + Nome em Azul + Menu 3 Pontos (⋮) */}
                <div className="px-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ExerciseIllustrationBadge muscle={meta?.primaryMuscle} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => meta && setInspectExercise(meta)}
                        className="text-[17px] font-bold text-[#0084FF] hover:underline text-left truncate block"
                      >
                        {meta?.title || 'Exercício'}
                      </button>
                      {workoutEx.supersetId && (
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-bold uppercase">
                          Superset {workoutEx.supersetId}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Opções do exercício"
                    onClick={() => setMenuWorkoutExerciseId(workoutEx.id)}
                    className="p-2 rounded-full text-slate-700 hover:bg-slate-100 transition shrink-0"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                {/* Linha 2: Pílulas [⏱ Descanso: 1min 30s] e [📄+ Nota] */}
                <div className="px-4 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateExerciseNotesOrRest(workoutEx.id, {
                        restTimerSeconds: cycleRestTime(
                          workoutEx.restTimerSeconds
                        ),
                      })
                    }
                    className="px-3.5 py-2 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-slate-900 text-[14px] font-medium flex items-center gap-2 transition"
                  >
                    <Clock className="w-4 h-4 text-slate-700" />
                    <span>
                      Descanso: {formatRestLabel(workoutEx.restTimerSeconds)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenNotesIds((prev) => ({
                        ...prev,
                        [workoutEx.id]: !prev[workoutEx.id],
                      }))
                    }
                    className="px-3.5 py-2 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-slate-900 text-[14px] font-medium flex items-center gap-2 transition"
                  >
                    <FilePlus2 className="w-4 h-4 text-slate-700" />
                    <span>Nota</span>
                  </button>
                </div>

                {/* Campo de Nota quando ativo */}
                {isNoteOpen && (
                  <div className="px-4">
                    <input
                      type="text"
                      value={workoutEx.notes}
                      onChange={(e) =>
                        updateExerciseNotesOrRest(workoutEx.id, {
                          notes: e.target.value,
                        })
                      }
                      placeholder="Adicionar nota ao exercício (ex: ajuste do banco, pegada...)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0084FF]"
                    />
                  </div>
                )}

                {/* Tabela de Séries (SÉRIE | ANTERIOR | KG | REPS | RPE | ✓) */}
                <div className="space-y-1 pt-1">
                  <div className="grid grid-cols-12 gap-1.5 px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 items-center">
                    <div className="col-span-2 text-left">SÉRIE</div>
                    <div className="col-span-3 text-left">ANTERIOR</div>
                    <div className="col-span-2 text-center flex items-center justify-center gap-1">
                      <Dumbbell className="w-3 h-3" />
                      <span>
                        {meta?.measurementType === 'distance_duration'
                          ? 'KM'
                          : 'KG'}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      {meta?.measurementType === 'duration' ||
                      meta?.measurementType === 'distance_duration'
                        ? 'SEG'
                        : 'REPS'}
                    </div>
                    <div className="col-span-2 text-center">RPE</div>
                    <div className="col-span-1 text-center">✓</div>
                  </div>

                  {workoutEx.sets.map((s, setIdx) => {
                    if (s.type === 'normal') normalSetCounter += 1;
                    const prevSet = prevSets[setIdx];
                    const fallbackPrevWeight = prevSet?.weightKg ?? s.weightKg ?? 0;
                    const fallbackPrevReps = prevSet?.reps ?? s.reps ?? 0;

                    return (
                      <SwipeableSetRow
                        key={s.id}
                        setId={s.id}
                        completed={s.completed}
                        onDelete={() =>
                          removeSetFromActiveExercise(workoutEx.id, s.id)
                        }
                      >
                        {/* SÉRIE (1, 2, 3, W, D, F) */}
                        <div className="col-span-2 flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              updateActiveSet(workoutEx.id, s.id, {
                                type: cycleSetType(s.type),
                              })
                            }
                            className={`w-9 h-8 rounded-lg font-bold text-[15px] flex items-center justify-center transition ${
                              s.completed
                                ? 'bg-[#BBF7D0] text-slate-900'
                                : s.type === 'warmup'
                                ? 'bg-amber-100 text-amber-700'
                                : s.type === 'dropset'
                                ? 'bg-purple-100 text-purple-700'
                                : s.type === 'failure'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-[#F1F5F9] text-slate-900'
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

                        {/* ANTERIOR */}
                        <div className="col-span-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (prevSet) {
                                updateActiveSet(workoutEx.id, s.id, {
                                  weightKg: prevSet.weightKg,
                                  reps: prevSet.reps,
                                });
                              }
                            }}
                            className="text-[14px] text-slate-400 font-normal truncate block text-left"
                          >
                            {fallbackPrevWeight > 0 || fallbackPrevReps > 0
                              ? `${fallbackPrevWeight}kg x ${fallbackPrevReps}`
                              : '—'}
                          </button>
                        </div>

                        {/* KG */}
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
                              className={`w-full h-9 text-center rounded-xl text-[15px] font-semibold focus:outline-none ${
                                s.completed
                                  ? 'bg-transparent text-slate-900 font-bold'
                                  : 'bg-white border border-slate-200 text-slate-700 focus:border-[#0084FF]'
                              }`}
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
                              className={`w-full h-9 text-center rounded-xl text-[15px] font-semibold focus:outline-none ${
                                s.completed
                                  ? 'bg-transparent text-slate-900 font-bold'
                                  : 'bg-white border border-slate-200 text-slate-700 focus:border-[#0084FF]'
                              }`}
                            />
                          )}
                        </div>

                        {/* REPS */}
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
                              className={`w-full h-9 text-center rounded-xl text-[15px] font-semibold focus:outline-none ${
                                s.completed
                                  ? 'bg-transparent text-slate-900 font-bold'
                                  : 'bg-white border border-slate-200 text-slate-700 focus:border-[#0084FF]'
                              }`}
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
                              className={`w-full h-9 text-center rounded-xl text-[15px] font-semibold focus:outline-none ${
                                s.completed
                                  ? 'bg-transparent text-slate-900 font-bold'
                                  : 'bg-white border border-slate-200 text-slate-700 focus:border-[#0084FF]'
                              }`}
                            />
                          )}
                        </div>

                        {/* RPE (Botão com ícone de velocímetro idêntico às imagens) */}
                        <div className="col-span-2 flex justify-center">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveRpePicker({
                                workoutExerciseId: workoutEx.id,
                                setId: s.id,
                                currentRpe: s.rpe ?? null,
                              })
                            }
                            aria-label="Selecionar RPE"
                            className={`w-11 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                              s.completed
                                ? 'bg-[#BBF7D0]/80 text-slate-700'
                                : 'bg-[#F1F5F9] text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            {s.rpe ? (
                              <span className="text-slate-900 font-bold">
                                {s.rpe}
                              </span>
                            ) : (
                              <Gauge className="w-4 h-4 stroke-[1.8]" />
                            )}
                          </button>
                        </div>

                        {/* Checkbox ✓ */}
                        <div className="col-span-1 flex justify-end">
                          <button
                            type="button"
                            aria-label="Marcar série como concluída"
                            onClick={() =>
                              toggleCompleteSet(workoutEx.id, s.id)
                            }
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                              s.completed
                                ? 'bg-[#22C55E] text-white shadow-sm'
                                : 'bg-[#F1F5F9] text-slate-400 hover:text-slate-700'
                            }`}
                          >
                            <Check className="w-5 h-5 stroke-[2.5]" />
                          </button>
                        </div>
                      </SwipeableSetRow>
                    );
                  })}
                </div>

                {/* Botão Largo [+ Adicionar série] */}
                <div className="px-4 pt-1">
                  <button
                    type="button"
                    onClick={() => addSetToActiveExercise(workoutEx.id)}
                    className="w-full py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-slate-900 font-medium text-[15px] flex items-center justify-center gap-2 transition"
                  >
                    <Plus className="w-4 h-4 stroke-[2.2]" />
                    <span>Adicionar série</span>
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Ações principais no final da lista */}
        <div className="p-4 space-y-3 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowExercisePicker({ mode: 'add' })}
            className="w-full py-3.5 rounded-2xl bg-[#0084FF] hover:bg-blue-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-sm transition"
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
            className="w-full py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" />{' '}
            {isEditingSession ? 'Cancelar Edição' : 'Descartar Treino'}
          </button>
        </div>
      </div>

      {/* ================= BARRA INFERIOR DO TIMER DE DESCANSO (Idêntica à Imagem 2) ================= */}
      {restTimer.isActive && !menuWorkoutExerciseId && !showReorderSheet && !activeRpePicker && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
          {/* Linha de progresso azul no topo da barra do timer */}
          <div className="w-full h-1 bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-[#0084FF] transition-all duration-500"
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

          <div className="px-4 py-3 flex items-center justify-between gap-3 max-w-3xl mx-auto">
            <button
              type="button"
              onClick={() => adjustRestTimer(-15)}
              className="px-5 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-slate-900 font-semibold text-[15px] transition"
            >
              -15
            </button>

            <div className="text-3xl font-bold text-slate-900 tracking-tight font-sans">
              {formatTimerClock(restTimer.remainingSeconds)}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => adjustRestTimer(15)}
                className="px-5 py-2.5 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 text-slate-900 font-semibold text-[15px] transition"
              >
                +15
              </button>
              <button
                type="button"
                onClick={stopRestTimer}
                className="px-5 py-2.5 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white font-semibold text-[15px] transition"
              >
                Pular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= BOTTOM SHEET DO MENU (⋮) (Idêntico à Imagem 1) ================= */}
      {menuWorkoutExerciseId && (
        <div
          onClick={() => setMenuWorkoutExerciseId(null)}
          className="fixed inset-0 z-[70] bg-black/50 flex flex-col justify-end animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#F8FAFC] rounded-t-3xl pt-3 pb-[max(2rem,env(safe-area-inset-bottom))] px-4 space-y-4 shadow-2xl"
          >
            {/* Alça superior do Bottom Sheet */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />

            <div className="bg-white rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm border border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMenuWorkoutExerciseId(null);
                  setShowReorderSheet(true);
                }}
                className="w-full px-5 py-4 text-left flex items-center gap-4 hover:bg-slate-50 transition"
              >
                <ArrowUpDown className="w-5 h-5 text-slate-800" />
                <span className="text-[16px] font-medium text-slate-900">
                  Reordenar exercícios
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetId = menuWorkoutExerciseId;
                  setMenuWorkoutExerciseId(null);
                  setShowExercisePicker({
                    mode: 'replace',
                    targetWorkoutExerciseId: targetId,
                  });
                }}
                className="w-full px-5 py-4 text-left flex items-center gap-4 hover:bg-slate-50 transition"
              >
                <RefreshCw className="w-5 h-5 text-slate-800" />
                <span className="text-[16px] font-medium text-slate-900">
                  Substituir exercício
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetEx = activeWorkout.exercises.find(
                    (e) => e.id === menuWorkoutExerciseId
                  );
                  if (targetEx) {
                    const nextSuperset = targetEx.supersetId ? null : 1;
                    updateExerciseNotesOrRest(targetEx.id, {
                      supersetId: nextSuperset,
                    });
                  }
                  setMenuWorkoutExerciseId(null);
                }}
                className="w-full px-5 py-4 text-left flex items-center gap-4 hover:bg-slate-50 transition"
              >
                <Plus className="w-5 h-5 text-slate-800" />
                <span className="text-[16px] font-medium text-slate-900">
                  Adicionar ao superset
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  removeExerciseFromActiveWorkout(menuWorkoutExerciseId);
                  setMenuWorkoutExerciseId(null);
                }}
                className="w-full px-5 py-4 text-left flex items-center gap-4 hover:bg-red-50 transition"
              >
                <X className="w-5 h-5 text-red-500" />
                <span className="text-[16px] font-medium text-red-500">
                  Remover exercício
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE REORDENAÇÃO DE EXERCÍCIOS ================= */}
      {showReorderSheet && (
        <div
          onClick={() => setShowReorderSheet(false)}
          className="fixed inset-0 z-[70] bg-black/50 flex flex-col justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-5 space-y-4 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Reordenar Exercícios
              </h3>
              <button
                onClick={() => setShowReorderSheet(false)}
                className="text-sm font-bold text-[#0084FF]"
              >
                Concluído
              </button>
            </div>
            <div className="space-y-2">
              {activeWorkout.exercises.map((ex, idx) => {
                const meta = exerciseMap.get(ex.exerciseId);
                return (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <span className="text-sm font-semibold text-slate-800">
                      {idx + 1}. {meta?.title || 'Exercício'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={idx === 0}
                        onClick={() => moveExerciseInActiveWorkout(ex.id, 'up')}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        disabled={idx === activeWorkout.exercises.length - 1}
                        onClick={() =>
                          moveExerciseInActiveWorkout(ex.id, 'down')
                        }
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= SELETOR DE RPE BOTTOM SHEET ================= */}
      {activeRpePicker && (
        <div
          onClick={() => setActiveRpePicker(null)}
          className="fixed inset-0 z-[70] bg-black/50 flex flex-col justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-5 space-y-4"
          >
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                RPE (Esforço Percebido da Série)
              </h3>
              <p className="text-xs text-slate-500">
                10 = Falha máxima • 9 = 1 repetição na reserva • 8 = 2 repetições na reserva
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {RPE_OPTIONS.map((val) => (
                <button
                  key={String(val)}
                  type="button"
                  onClick={() => {
                    updateActiveSet(
                      activeRpePicker.workoutExerciseId,
                      activeRpePicker.setId,
                      { rpe: val }
                    );
                    setActiveRpePicker(null);
                  }}
                  className={`py-3 rounded-xl font-bold text-sm border transition ${
                    activeRpePicker.currentRpe === val
                      ? 'bg-[#0084FF] text-white border-[#0084FF]'
                      : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {val === null ? 'Limpar' : val}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL SELETOR DE EXERCÍCIO ================= */}
      {showExercisePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {showExercisePicker.mode === 'replace'
                  ? 'Substituir Exercício'
                  : 'Adicionar Exercício'}
              </h3>
              <button
                onClick={() => setShowExercisePicker(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Buscar exercício..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0084FF]"
                />
              </div>

              {pickerSearch.trim().length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">
                    Criar &ldquo;{pickerSearch.trim()}&rdquo; como novo exercício:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={quickExMuscle}
                      onChange={(e) =>
                        setQuickExMuscle(e.target.value as MuscleGroup)
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
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
                      className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800"
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
                    className="w-full py-2 rounded-lg bg-[#0084FF] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Criar e Adicionar
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {exercises
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
                    className="w-full text-left p-3 rounded-2xl hover:bg-slate-100 flex items-center justify-between transition"
                  >
                    <div className="flex items-center gap-3">
                      <ExerciseIllustrationBadge muscle={ex.primaryMuscle} />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {ex.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {MUSCLE_LABELS[ex.primaryMuscle]} •{' '}
                          {EQUIPMENT_LABELS[ex.equipment]}
                        </p>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-[#0084FF]" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE CONFIRMAÇÃO AO CONCLUIR ================= */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900">
              Concluir Treino?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
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
                  className="w-full py-3 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white font-bold text-xs sm:text-sm transition"
                >
                  Concluir e Atualizar Rotina
                </button>
                <button
                  onClick={() => {
                    setShowFinishModal(false);
                    finishActiveWorkout(false);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition"
                >
                  Concluir (Manter Rotina Original)
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowFinishModal(false);
                  finishActiveWorkout(false);
                }}
                className="w-full py-3 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white font-bold text-sm transition"
              >
                Confirmar e Salvar Treino
              </button>
            )}

            <button
              onClick={() => setShowFinishModal(false)}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-slate-700"
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
