'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlarmClock,
  ChevronDown,
  Dumbbell,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  EquipmentType,
  Exercise,
  MuscleGroup,
  WorkoutExercise,
} from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  convertVolumeFromKg,
  formatTimerClock,
  getPreviousExerciseSets,
  getWeightUnitLabel,
  isSetFilled,
} from '@/lib/calculations';
import {
  enableRestTimerNotifications,
  getNotificationPermissionState,
} from '@/lib/notifications';
import { ExerciseDetailModal } from '@/components/exercises/ExerciseDetailModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { MiniAnatomyFigures } from '@/components/workout/MiniAnatomyFigures';
import { MinimizedWorkoutBar } from '@/components/workout/MinimizedWorkoutBar';
import { WorkoutExerciseCard } from '@/components/workout/WorkoutExerciseCard';
import { ExerciseMenuSheet } from '@/components/workout/dialogs/ExerciseMenuSheet';
import {
  ExercisePickerDialog,
  ExercisePickerState,
} from '@/components/workout/dialogs/ExercisePickerDialog';
import { FinishWorkoutDialog } from '@/components/workout/dialogs/FinishWorkoutDialog';
import { PendingReplaceDialog } from '@/components/workout/dialogs/PendingReplaceDialog';
import {
  PlateCalcState,
  PlateCalculatorSheet,
} from '@/components/workout/dialogs/PlateCalculatorSheet';
import { PostWorkoutSummaryDialog } from '@/components/workout/dialogs/PostWorkoutSummaryDialog';
import { ReorderExercisesSheet } from '@/components/workout/dialogs/ReorderExercisesSheet';
import {
  ActiveRpePickerState,
  RpePickerSheet,
} from '@/components/workout/dialogs/RpePickerSheet';
import {
  ActiveSetSheetState,
  SetTypeSheet,
} from '@/components/workout/dialogs/SetTypeSheet';

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
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1100);
  } catch {
    // Ignore autoplay errors
  }
}

export function ActiveWorkoutDrawer() {
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const pendingWorkoutReplace = useWorkoutStore((s) => s.pendingWorkoutReplace);
  const exercises = useWorkoutStore((s) => s.exercises);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const restTimer = useWorkoutStore((s) => s.restTimer);
  const settings = useWorkoutStore((s) => s.settings);
  const lastFinishedWorkout = useWorkoutStore((s) => s.lastFinishedWorkout);

  const toggleMinimizeWorkout = useWorkoutStore((s) => s.toggleMinimizeWorkout);
  const updateActiveWorkoutMeta = useWorkoutStore(
    (s) => s.updateActiveWorkoutMeta
  );
  const confirmPendingWorkoutReplace = useWorkoutStore(
    (s) => s.confirmPendingWorkoutReplace
  );
  const cancelPendingWorkoutReplace = useWorkoutStore(
    (s) => s.cancelPendingWorkoutReplace
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
  const generateWarmupSetsForActiveExercise = useWorkoutStore(
    (s) => s.generateWarmupSetsForActiveExercise
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
  const importExercisesBatch = useWorkoutStore((s) => s.importExercisesBatch);
  const updateSettings = useWorkoutStore((s) => s.updateSettings);

  const tickRestTimer = useWorkoutStore((s) => s.tickRestTimer);
  const adjustRestTimer = useWorkoutStore((s) => s.adjustRestTimer);
  const stopRestTimer = useWorkoutStore((s) => s.stopRestTimer);
  const startRestTimer = useWorkoutStore((s) => s.startRestTimer);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default');
  const [notifBannerDismissed, setNotifBannerDismissed] = useState(false);

  const [pickerState, setPickerState] = useState<ExercisePickerState | null>(
    null
  );
  const [inspectExercise, setInspectExercise] = useState<Exercise | null>(null);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [menuWorkoutExerciseId, setMenuWorkoutExerciseId] = useState<
    string | null
  >(null);
  const [showReorderSheet, setShowReorderSheet] = useState(false);
  const [activeSetSheet, setActiveSetSheet] =
    useState<ActiveSetSheetState | null>(null);
  const [plateCalcModal, setPlateCalcModal] = useState<PlateCalcState | null>(
    null
  );
  const [activeRpePicker, setActiveRpePicker] =
    useState<ActiveRpePickerState | null>(null);

  const showRpeColumn = Boolean(settings?.showRpeColumn);
  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(weightUnit);
  const lastBeepedEndTimeRef = useRef<number | null>(null);

  const isEditingSession = Boolean(activeWorkout?.editingSessionId);

  // Sincronização de permissão de notificações e recuperação do timer ao retornar do background
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

  // Cronômetro principal do treino ativo
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

  // Timer de descanso com cálculo baseado em timestamp (`endTime`) + Web Audio chime
  useEffect(() => {
    if (!restTimer.isActive) return;
    const interval = setInterval(() => {
      const rem = restTimer.endTime
        ? Math.max(0, Math.ceil((restTimer.endTime - Date.now()) / 1000))
        : restTimer.remainingSeconds;
      const beepKey = restTimer.endTime ?? -1;
      if (
        rem <= 1 &&
        settings.soundEnabled &&
        lastBeepedEndTimeRef.current !== beepKey
      ) {
        lastBeepedEndTimeRef.current = beepKey;
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
    if (!activeWorkout) {
      return {
        volumeKg: 0,
        completedSets: 0,
        totalSets: 0,
        activeMuscles: new Set<MuscleGroup>(),
      };
    }

    let volumeKg = 0;
    let completedSets = 0;
    let totalSets = 0;
    const activeMuscles = new Set<MuscleGroup>();

    for (const ex of activeWorkout.exercises) {
      const meta = exerciseMap.get(ex.exerciseId);
      const countsVolume =
        meta?.measurementType !== 'duration' &&
        meta?.measurementType !== 'distance_duration';
      let hasCompletedInEx = false;
      for (const s of ex.sets) {
        totalSets += 1;
        if (s.completed) {
          completedSets += 1;
          hasCompletedInEx = true;
          if (countsVolume && s.type !== 'warmup') {
            volumeKg += (s.weightKg ?? 0) * (s.reps ?? 0);
          }
        }
      }
      if (meta && hasCompletedInEx) {
        activeMuscles.add(meta.primaryMuscle);
        meta.secondaryMuscles.forEach((m) => activeMuscles.add(m));
      }
    }

    return {
      volumeKg: Math.round(volumeKg),
      completedSets,
      totalSets,
      activeMuscles,
    };
  }, [activeWorkout, exerciseMap]);

  const unmarkedFilledSetsCount = useMemo(() => {
    if (!activeWorkout) return 0;
    return activeWorkout.exercises.reduce((acc, ex) => {
      const meta = exerciseMap.get(ex.exerciseId);
      return (
        acc +
        ex.sets.filter(
          (s) => !s.completed && isSetFilled(s, meta?.measurementType)
        ).length
      );
    }, 0);
  }, [activeWorkout, exerciseMap]);

  const openPlateCalcForExercise = useCallback(
    (workoutEx: WorkoutExercise) => {
      const meta = exerciseMap.get(workoutEx.exerciseId);
      const targetSet =
        workoutEx.sets.find((st) => !st.completed) || workoutEx.sets[0];
      const currentWeight = targetSet?.weightKg ?? 60;
      const defaultBar =
        settings.barbellWeightKg ?? settings.defaultBarWeightKg ?? 20;
      setPlateCalcModal({
        workoutExerciseId: workoutEx.id,
        setId: targetSet?.id,
        exerciseTitle: meta?.title || 'Exercício',
        totalWeightKg: currentWeight > 0 ? currentWeight : 60,
        barWeightKg: defaultBar,
      });
    },
    [exerciseMap, settings.barbellWeightKg, settings.defaultBarWeightKg]
  );

  const handleSelectExerciseFromPicker = useCallback(
    (exerciseId: string, state: ExercisePickerState) => {
      if (state.mode === 'replace' && state.targetWorkoutExerciseId) {
        replaceExerciseInActiveWorkout(
          state.targetWorkoutExerciseId,
          exerciseId
        );
        toast.success('Exercício substituído!');
      } else {
        addExerciseToActiveWorkout(exerciseId);
      }
    },
    [addExerciseToActiveWorkout, replaceExerciseInActiveWorkout]
  );

  const handleCreateAndSelectExercise = useCallback(
    (
      data: {
        title: string;
        primaryMuscle: MuscleGroup;
        equipment: EquipmentType;
      },
      state: ExercisePickerState
    ) => {
      const created = addCustomExercise({
        title: data.title,
        primaryMuscle: data.primaryMuscle,
        secondaryMuscles: [],
        equipment: data.equipment,
        measurementType: 'weight_reps',
        instructions: [],
      });
      if (state.mode === 'replace' && state.targetWorkoutExerciseId) {
        replaceExerciseInActiveWorkout(
          state.targetWorkoutExerciseId,
          created.id
        );
      } else {
        addExerciseToActiveWorkout(created.id);
      }
    },
    [
      addCustomExercise,
      addExerciseToActiveWorkout,
      replaceExerciseInActiveWorkout,
    ]
  );

  const pendingReplaceDialog = (
    <PendingReplaceDialog
      pending={pendingWorkoutReplace}
      activeWorkoutTitle={activeWorkout?.title}
      onResumeCurrent={() => {
        cancelPendingWorkoutReplace();
        toggleMinimizeWorkout(false);
      }}
      onConfirmReplace={confirmPendingWorkoutReplace}
      onCancel={cancelPendingWorkoutReplace}
    />
  );

  // Modal de celebração pós-treino
  if (!activeWorkout && lastFinishedWorkout) {
    return (
      <>
        <PostWorkoutSummaryDialog
          session={lastFinishedWorkout}
          workoutCount={workoutHistory.length}
          exercises={exercises}
          weightUnit={weightUnit}
          authorName={settings.name}
          onClose={clearLastFinishedWorkout}
        />
        {pendingReplaceDialog}
      </>
    );
  }

  if (!activeWorkout) return pendingReplaceDialog;

  // Mini-Player persistente ancorado acima da barra de navegação inferior mobile
  if (activeWorkout.isMinimized) {
    return (
      <>
        <MinimizedWorkoutBar
          title={activeWorkout.title}
          elapsedLabel={formatShortElapsed(elapsedSeconds)}
          restTimer={restTimer}
          onResume={() => toggleMinimizeWorkout(false)}
        />
        {pendingReplaceDialog}
      </>
    );
  }

  const progressRatio =
    liveStats.totalSets > 0
      ? Math.min(100, (liveStats.completedSets / liveStats.totalSets) * 100)
      : 8;

  const menuWorkoutExercise = menuWorkoutExerciseId
    ? activeWorkout.exercises.find((e) => e.id === menuWorkoutExerciseId) ??
      null
    : null;
  const menuExerciseMeta = menuWorkoutExercise
    ? exerciseMap.get(menuWorkoutExercise.exerciseId)
    : undefined;

  const restProgressPct = Math.min(
    100,
    (restTimer.remainingSeconds / Math.max(1, restTimer.totalSeconds)) * 100
  );

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* ================= TOP HEADER ================= */}
      <div className="bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => toggleMinimizeWorkout(true)}
            aria-label="Minimizar treino"
            className="rounded-full"
          >
            <ChevronDown className="w-5 h-5 stroke-[2.2]" />
          </Button>
          <span className="text-[17px] font-semibold text-foreground">
            {isEditingSession ? 'Editar Treino' : 'Treino'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="icon"
            onClick={async () => {
              if (notifPermission === 'default') {
                const res = await enableRestTimerNotifications();
                if (res.granted) setNotifPermission('granted');
              }
              startRestTimer(settings.defaultRestSeconds, 'Descanso');
            }}
            aria-label="Timer de descanso"
            className="rounded-full"
          >
            <AlarmClock className="w-5 h-5 stroke-[2]" />
          </Button>
          <Button
            variant="default"
            onClick={() => {
              if (isEditingSession && liveStats.completedSets > 0) {
                finishActiveWorkout(false);
                toast.success('Alterações do treino salvas!');
              } else {
                setShowFinishModal(true);
              }
            }}
            className="rounded-full px-5 font-semibold text-[15px]"
          >
            Concluir
          </Button>
        </div>
      </div>

      {/* Linha de progresso azul fina logo abaixo do header */}
      <Progress
        value={Math.max(8, progressRatio)}
        className="h-[3px] rounded-none shrink-0"
        indicatorClassName="rounded-none"
      />

      {/* ================= SUB-BARRA DE MÉTRICAS (Duração | Volume | Séries | Silhueta) ================= */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between shrink-0">
        <div className="grid grid-cols-3 gap-4 sm:gap-6 flex-1">
          <div>
            <span className="text-xs text-muted-foreground block">Duração</span>
            <span className="text-[15px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5 block tabular-nums">
              {formatShortElapsed(elapsedSeconds)}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Volume</span>
            <span className="text-[15px] font-semibold text-foreground mt-0.5 block tabular-nums">
              {convertVolumeFromKg(liveStats.volumeKg, weightUnit).toLocaleString(
                'pt-BR'
              )}{' '}
              {unitLabel}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block">Séries</span>
            <span className="text-[15px] font-semibold text-foreground mt-0.5 block tabular-nums">
              {liveStats.completedSets}
            </span>
          </div>
        </div>

        <MiniAnatomyFigures activeMuscles={liveStats.activeMuscles} />
      </div>

      {/* Banner discreto para ativar notificações em segundo plano no iPhone/Android */}
      {notifPermission === 'default' && !notifBannerDismissed && (
        <div className="bg-sky-500/15 border-b border-sky-500/30 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
          <p className="text-xs text-sky-900 dark:text-sky-200 font-medium">
            Receber alerta no iPhone quando o descanso acabar?
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="default"
              onClick={async () => {
                const res = await enableRestTimerNotifications();
                setNotifPermission(
                  res.granted ? 'granted' : getNotificationPermissionState()
                );
                if (res.granted) {
                  toast.success('Alertas de descanso ativados!');
                }
              }}
              className="rounded-full h-11 px-4 text-xs font-bold"
            >
              Ativar
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifBannerDismissed(true)}
              aria-label="Fechar aviso"
              className="rounded-full text-sky-700 dark:text-sky-300"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ================= CORPO ROLÁVEL DOS EXERCÍCIOS ================= */}
      <div className="flex-1 overflow-y-auto pb-36 max-w-3xl w-full mx-auto space-y-3 sm:px-4 sm:pt-3">
        {/* Título e Descrição Editáveis do Treino */}
        <Card className="rounded-none sm:rounded-2xl border-x-0 sm:border-x border-t-0 sm:border-t px-4 py-3.5 space-y-2 shadow-none sm:shadow-xs">
          <Input
            type="text"
            aria-label="Título do treino"
            value={activeWorkout.title}
            onChange={(e) =>
              updateActiveWorkoutMeta(e.target.value, activeWorkout.description)
            }
            placeholder="Nome do treino (ex: Treino A — Peito e Tríceps)"
            className="font-extrabold"
          />
          <Input
            type="text"
            aria-label="Descrição do treino"
            value={activeWorkout.description}
            onChange={(e) =>
              updateActiveWorkoutMeta(activeWorkout.title, e.target.value)
            }
            placeholder="Notas gerais da sessão (opcional)..."
          />
        </Card>

        {activeWorkout.exercises.length === 0 ? (
          <Card className="mx-4 sm:mx-0 p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
              <Dumbbell className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Comece seu treino
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Adicione um exercício da biblioteca para registrar suas séries,
                cargas e repetições.
              </p>
            </div>
          </Card>
        ) : (
          activeWorkout.exercises.map((workoutEx) => {
            const meta = exerciseMap.get(workoutEx.exerciseId);
            const prevSets = getPreviousExerciseSets(
              workoutEx.exerciseId,
              workoutHistory,
              activeWorkout.editingSessionId,
              activeWorkout.editingSessionId ? activeWorkout.startTime : null
            );

            return (
              <WorkoutExerciseCard
                key={workoutEx.id}
                workoutExercise={workoutEx}
                exerciseMeta={meta}
                prevSets={prevSets}
                showRpeColumn={showRpeColumn}
                weightUnit={weightUnit}
                unitLabel={unitLabel}
                onInspectExercise={setInspectExercise}
                onOpenMenu={setMenuWorkoutExerciseId}
                onOpenPlateCalculator={openPlateCalcForExercise}
                onUpdateNotesOrRest={updateExerciseNotesOrRest}
                onOpenSetSheet={setActiveSetSheet}
                onOpenRpePicker={setActiveRpePicker}
                onUpdateSet={updateActiveSet}
                onToggleCompleteSet={toggleCompleteSet}
                onRemoveSet={removeSetFromActiveExercise}
                onAddSet={addSetToActiveExercise}
              />
            );
          })
        )}

        {/* Ações principais no final da lista */}
        <div className="px-4 sm:px-0 py-3 space-y-3">
          <Button
            variant="default"
            size="lg"
            onClick={() => setPickerState({ mode: 'add' })}
            className="w-full rounded-2xl font-bold text-[15px] shadow-sm"
          >
            <Plus className="w-5 h-5" /> Adicionar Exercício
          </Button>

          <Button
            variant="destructive-outline"
            onClick={() => setShowDiscardConfirm(true)}
            className="w-full rounded-2xl font-semibold text-sm"
          >
            <Trash2 className="w-4 h-4" />
            {isEditingSession ? 'Cancelar Edição' : 'Descartar Treino'}
          </Button>
        </div>
      </div>

      {/* ================= BARRA INFERIOR DO TIMER DE DESCANSO ================= */}
      {restTimer.isActive &&
        !menuWorkoutExerciseId &&
        !showReorderSheet &&
        !activeRpePicker &&
        !activeSetSheet &&
        !plateCalcModal && (
          <div className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border shadow-[0_-8px_24px_rgba(0,0,0,0.25)] pb-[env(safe-area-inset-bottom)]">
            <Progress
              value={restProgressPct}
              className="h-1 rounded-none"
              indicatorClassName="rounded-none transition-transform duration-500"
            />

            <div className="px-4 py-3 flex items-center justify-between gap-3 max-w-3xl mx-auto">
              <Button
                variant="secondary"
                onClick={() => adjustRestTimer(-15)}
                className="px-5 font-semibold text-[15px]"
              >
                -15s
              </Button>

              <div className="text-3xl font-bold text-foreground tracking-tight tabular-nums">
                {formatTimerClock(restTimer.remainingSeconds)}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => adjustRestTimer(15)}
                  className="px-5 font-semibold text-[15px]"
                >
                  +15s
                </Button>
                <Button
                  variant="default"
                  onClick={stopRestTimer}
                  className="px-5 font-semibold text-[15px]"
                >
                  Pular
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* ================= SUB-SHEETS & DIALOGS ================= */}
      <SetTypeSheet
        activeSet={activeSetSheet}
        onClose={() => setActiveSetSheet(null)}
        onSelectType={(workoutExerciseId, setId, type) =>
          updateActiveSet(workoutExerciseId, setId, { type })
        }
        onGenerateWarmup={generateWarmupSetsForActiveExercise}
        onRemoveSet={removeSetFromActiveExercise}
      />

      <PlateCalculatorSheet
        data={plateCalcModal}
        onChange={setPlateCalcModal}
        onChangeBarWeight={(nextBar) =>
          updateSettings({
            defaultBarWeightKg: nextBar,
            barbellWeightKg: nextBar,
          })
        }
        onApplyWeight={(workoutExerciseId, setId, weightKg) =>
          updateActiveSet(workoutExerciseId, setId, { weightKg })
        }
        onClose={() => setPlateCalcModal(null)}
      />

      <ExerciseMenuSheet
        workoutExercise={menuWorkoutExercise}
        exerciseMeta={menuExerciseMeta}
        showRpeColumn={showRpeColumn}
        onClose={() => setMenuWorkoutExerciseId(null)}
        onInspectExercise={setInspectExercise}
        onGenerateWarmup={generateWarmupSetsForActiveExercise}
        onOpenPlateCalculator={openPlateCalcForExercise}
        onToggleRpeColumn={() =>
          updateSettings({ showRpeColumn: !showRpeColumn })
        }
        onOpenReorder={() => setShowReorderSheet(true)}
        onReplaceExercise={(targetWorkoutExerciseId) =>
          setPickerState({
            mode: 'replace',
            targetWorkoutExerciseId,
          })
        }
        onSetSuperset={(workoutExerciseId, supersetId) =>
          updateExerciseNotesOrRest(workoutExerciseId, { supersetId })
        }
        onRemoveExercise={removeExerciseFromActiveWorkout}
      />

      <ReorderExercisesSheet
        open={showReorderSheet}
        onOpenChange={setShowReorderSheet}
        exercises={activeWorkout.exercises}
        exerciseMap={exerciseMap}
        onMove={moveExerciseInActiveWorkout}
      />

      <RpePickerSheet
        activeRpe={activeRpePicker}
        onClose={() => setActiveRpePicker(null)}
        onSelectRpe={(workoutExerciseId, setId, rpe) =>
          updateActiveSet(workoutExerciseId, setId, { rpe })
        }
      />

      <ExercisePickerDialog
        pickerState={pickerState}
        exercises={exercises}
        onClose={() => setPickerState(null)}
        onSelectExercise={handleSelectExerciseFromPicker}
        onCreateAndSelectExercise={handleCreateAndSelectExercise}
        onImportExercisesBatch={importExercisesBatch}
      />

      <FinishWorkoutDialog
        open={showFinishModal}
        onOpenChange={setShowFinishModal}
        completedSets={liveStats.completedSets}
        unmarkedFilledSetsCount={unmarkedFilledSetsCount}
        volumeKg={liveStats.volumeKg}
        weightUnit={weightUnit}
        hasRoutineId={Boolean(activeWorkout.routineId)}
        onFinish={finishActiveWorkout}
        onDiscard={() => {
          discardActiveWorkout();
          toast.info('Treino descartado.');
        }}
      />

      <ConfirmDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
        title={
          isEditingSession
            ? 'Cancelar alterações do treino?'
            : 'Descartar treino em andamento?'
        }
        description={
          isEditingSession
            ? 'As alterações feitas nesta edição serão descartadas e o registro original será mantido.'
            : 'Todo o progresso não salvo deste treino será perdido permanentemente.'
        }
        confirmLabel={
          isEditingSession ? 'Cancelar Edição' : 'Descartar Treino'
        }
        cancelLabel="Continuar Treino"
        variant="destructive"
        onConfirm={() => {
          discardActiveWorkout();
          toast.info(
            isEditingSession ? 'Edição cancelada.' : 'Treino descartado.'
          );
        }}
      />

      <ExerciseDetailModal
        exercise={inspectExercise}
        onClose={() => setInspectExercise(null)}
      />

      {pendingReplaceDialog}
    </div>
  );
}
