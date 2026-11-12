'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ActiveWorkoutState,
  BodyMeasurementEntry,
  Exercise,
  ProgressPhoto,
  Routine,
  RoutineFolder,
  RPEValue,
  SetType,
  UserSettings,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from '@/types/workout';
import {
  INITIAL_EXERCISES,
  INITIAL_FOLDERS,
  INITIAL_MEASUREMENTS,
  INITIAL_ROUTINES,
  INITIAL_USER_SETTINGS,
  INITIAL_WORKOUT_HISTORY,
} from '@/data/initial-data';
import { evaluateWorkoutPRs, getPreviousExerciseSets } from '@/lib/calculations';
import {
  cancelRestNotification,
  scheduleRestNotification,
} from '@/lib/notifications';
import { SharePayload } from '@/lib/share';
import { BackupData, mergeById, RestoreMode } from '@/lib/backup';

const RESTORE_UNDO_KEY = 'ironpulse-restore-undo';

interface RestTimerState {
  isActive: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  endTime?: number | null;
  exerciseTitle?: string;
}

interface WorkoutStoreState {
  exercises: Exercise[];
  folders: RoutineFolder[];
  routines: Routine[];
  workoutHistory: WorkoutSession[];
  activeWorkout: ActiveWorkoutState | null;
  restTimer: RestTimerState;
  lastFinishedWorkout: WorkoutSession | null;
  measurements: BodyMeasurementEntry[];
  progressPhotos: ProgressPhoto[];
  settings: UserSettings;

  // Actions — Active Workout & Editing Past Workouts
  startEmptyWorkout: (title?: string) => void;
  startRoutineWorkout: (routineId: string) => void;
  startWorkoutFromExercises: (title: string, exercises: WorkoutExercise[]) => void;
  startEditWorkoutSession: (sessionId: string) => void;
  toggleMinimizeWorkout: (minimized?: boolean) => void;
  updateActiveWorkoutMeta: (title: string, description: string) => void;
  addExerciseToActiveWorkout: (exerciseId: string) => void;
  replaceExerciseInActiveWorkout: (
    workoutExerciseId: string,
    newExerciseId: string
  ) => void;
  removeExerciseFromActiveWorkout: (workoutExerciseId: string) => void;
  moveExerciseInActiveWorkout: (
    workoutExerciseId: string,
    direction: 'up' | 'down'
  ) => void;
  updateExerciseNotesOrRest: (
    workoutExerciseId: string,
    updates: {
      notes?: string;
      restTimerSeconds?: number;
      supersetId?: number | null;
    }
  ) => void;
  addSetToActiveExercise: (workoutExerciseId: string) => void;
  removeSetFromActiveExercise: (workoutExerciseId: string, setId: string) => void;
  updateActiveSet: (
    workoutExerciseId: string,
    setId: string,
    updates: Partial<{
      type: SetType;
      weightKg: number | null;
      reps: number | null;
      distanceKm: number | null;
      durationSeconds: number | null;
      rpe: RPEValue;
    }>
  ) => void;
  toggleCompleteSet: (workoutExerciseId: string, setId: string) => void;
  finishActiveWorkout: (updateOriginalRoutine?: boolean) => WorkoutSession | null;
  discardActiveWorkout: () => void;
  clearLastFinishedWorkout: () => void;

  // Actions — Rest Timer
  startRestTimer: (seconds: number, exerciseTitle?: string) => void;
  tickRestTimer: () => void;
  adjustRestTimer: (deltaSeconds: number) => void;
  stopRestTimer: () => void;

  // Actions — Routines & Folders
  createFolder: (name: string) => void;
  deleteFolder: (folderId: string) => void;
  saveRoutine: (
    routine: Omit<Routine, 'id' | 'updatedAt'> & { id?: string }
  ) => void;
  duplicateRoutine: (routineId: string) => void;
  deleteRoutine: (routineId: string) => void;
  importSharedPayload: (
    payload: SharePayload,
    options?: { startImmediately?: boolean; targetFolderId?: string | null }
  ) => void;

  // Actions — Exercises
  addCustomExercise: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => Exercise;
  importExercisesBatch: (incoming: Exercise[]) => number;
  deleteExercise: (exerciseId: string) => void;

  // Actions — Workout History
  deleteWorkoutSession: (sessionId: string) => void;
  saveWorkoutSessionAsRoutine: (sessionId: string) => void;

  // Actions — Body Measurements & Photos
  addBodyMeasurement: (entry: Omit<BodyMeasurementEntry, 'id'>) => void;
  deleteBodyMeasurement: (id: string) => void;
  addProgressPhoto: (photo: Omit<ProgressPhoto, 'id'>) => void;
  deleteProgressPhoto: (id: string) => void;

  // Actions — Settings
  updateSettings: (updates: Partial<UserSettings>) => void;
  clearAllData: () => void;

  // Backup & Restauração
  lastBackupAt: string | null;
  markBackupDone: () => void;
  restoreBackup: (data: BackupData, mode: RestoreMode) => void;
  undoLastRestore: () => boolean;
  hasRestoreUndo: () => boolean;
}

const uid = (prefix = 'id') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useWorkoutStore = create<WorkoutStoreState>()(
  persist(
    (set, get) => ({
      exercises: INITIAL_EXERCISES,
      folders: INITIAL_FOLDERS,
      routines: INITIAL_ROUTINES,
      workoutHistory: INITIAL_WORKOUT_HISTORY,
      activeWorkout: null,
      restTimer: {
        isActive: false,
        totalSeconds: 90,
        remainingSeconds: 0,
      },
      lastFinishedWorkout: null,
      measurements: INITIAL_MEASUREMENTS,
      progressPhotos: [],
      settings: INITIAL_USER_SETTINGS,
      lastBackupAt: null,

      startEmptyWorkout: (title = 'Treino Livre') => {
        set({
          activeWorkout: {
            editingSessionId: null,
            title,
            routineId: null,
            startTime: Date.now(),
            description: '',
            exercises: [],
            isMinimized: false,
          },
        });
      },

      startRoutineWorkout: (routineId) => {
        const routine = get().routines.find((r) => r.id === routineId);
        if (!routine) return;
        const clonedExercises: WorkoutExercise[] = routine.exercises.map((ex) => ({
          ...ex,
          id: uid('we'),
          sets: ex.sets.map((s) => ({
            ...s,
            id: uid('ws'),
            completed: false,
            prs: [],
          })),
        }));

        set({
          activeWorkout: {
            editingSessionId: null,
            title: routine.title,
            routineId: routine.id,
            startTime: Date.now(),
            description: '',
            exercises: clonedExercises,
            isMinimized: false,
          },
        });
      },

      startWorkoutFromExercises: (title, exercises) => {
        const cloned: WorkoutExercise[] = exercises.map((ex) => ({
          ...ex,
          id: uid('we'),
          sets: ex.sets.map((s) => ({
            ...s,
            id: uid('ws'),
            completed: false,
            prs: [],
          })),
        }));
        set({
          activeWorkout: {
            editingSessionId: null,
            title,
            routineId: null,
            startTime: Date.now(),
            description: '',
            exercises: cloned,
            isMinimized: false,
          },
        });
      },

      startEditWorkoutSession: (sessionId) => {
        const session = get().workoutHistory.find((w) => w.id === sessionId);
        if (!session) return;
        const clonedExercises: WorkoutExercise[] = session.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({
            ...s,
            completed: true,
          })),
        }));

        set({
          activeWorkout: {
            editingSessionId: session.id,
            title: session.title,
            routineId: session.routineId ?? null,
            startTime: new Date(session.startTime).getTime(),
            durationSecondsOverride: session.durationSeconds,
            description: session.description,
            exercises: clonedExercises,
            isMinimized: false,
          },
        });
      },

      toggleMinimizeWorkout: (minimized) => {
        const current = get().activeWorkout;
        if (!current) return;
        set({
          activeWorkout: {
            ...current,
            isMinimized:
              minimized !== undefined ? minimized : !current.isMinimized,
          },
        });
      },

      updateActiveWorkoutMeta: (title, description) => {
        const current = get().activeWorkout;
        if (!current) return;
        set({
          activeWorkout: {
            ...current,
            title,
            description,
          },
        });
      },

      addExerciseToActiveWorkout: (exerciseId) => {
        const current = get().activeWorkout;
        if (!current) return;
        const prevSets = getPreviousExerciseSets(
          exerciseId,
          get().workoutHistory,
          current.editingSessionId
        );
        const defaultSetWeight = prevSets[0]?.weightKg ?? 20;
        const defaultSetReps = prevSets[0]?.reps ?? 10;

        const newExercise: WorkoutExercise = {
          id: uid('we'),
          exerciseId,
          supersetId: null,
          restTimerSeconds: get().settings.defaultRestSeconds,
          notes: '',
          sets: [
            {
              id: uid('ws'),
              type: 'normal',
              weightKg: defaultSetWeight,
              reps: defaultSetReps,
              completed: !!current.editingSessionId,
            },
            {
              id: uid('ws'),
              type: 'normal',
              weightKg: defaultSetWeight,
              reps: defaultSetReps,
              completed: !!current.editingSessionId,
            },
            {
              id: uid('ws'),
              type: 'normal',
              weightKg: defaultSetWeight,
              reps: defaultSetReps,
              completed: !!current.editingSessionId,
            },
          ],
        };

        set({
          activeWorkout: {
            ...current,
            exercises: [...current.exercises, newExercise],
          },
        });
      },

      replaceExerciseInActiveWorkout: (workoutExerciseId, newExerciseId) => {
        const current = get().activeWorkout;
        if (!current) return;
        set({
          activeWorkout: {
            ...current,
            exercises: current.exercises.map((ex) =>
              ex.id === workoutExerciseId
                ? { ...ex, exerciseId: newExerciseId }
                : ex
            ),
          },
        });
      },

      removeExerciseFromActiveWorkout: (workoutExerciseId) => {
        const current = get().activeWorkout;
        if (!current) return;
        set({
          activeWorkout: {
            ...current,
            exercises: current.exercises.filter(
              (ex) => ex.id !== workoutExerciseId
            ),
          },
        });
      },

      moveExerciseInActiveWorkout: (workoutExerciseId, direction) => {
        const current = get().activeWorkout;
        if (!current) return;
        const idx = current.exercises.findIndex(
          (e) => e.id === workoutExerciseId
        );
        if (idx === -1) return;
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= current.exercises.length) return;
        const list = [...current.exercises];
        const [item] = list.splice(idx, 1);
        list.splice(targetIdx, 0, item);
        set({
          activeWorkout: {
            ...current,
            exercises: list,
          },
        });
      },

      updateExerciseNotesOrRest: (workoutExerciseId, updates) => {
        const current = get().activeWorkout;
        if (!current) return;
        set({
          activeWorkout: {
            ...current,
            exercises: current.exercises.map((ex) =>
              ex.id === workoutExerciseId ? { ...ex, ...updates } : ex
            ),
          },
        });
      },

      addSetToActiveExercise: (workoutExerciseId) => {
        const current = get().activeWorkout;
        if (!current) return;
        set({
          activeWorkout: {
            ...current,
            exercises: current.exercises.map((ex) => {
              if (ex.id !== workoutExerciseId) return ex;
              const lastSet = ex.sets[ex.sets.length - 1];
              const newSet: WorkoutSet = {
                id: uid('ws'),
                type: 'normal',
                weightKg: lastSet ? lastSet.weightKg : 20,
                reps: lastSet ? lastSet.reps : 10,
                distanceKm: lastSet?.distanceKm ?? null,
                durationSeconds: lastSet?.durationSeconds ?? null,
                completed: !!current.editingSessionId,
              };
              return { ...ex, sets: [...ex.sets, newSet] };
            }),
          },
        });
      },

      removeSetFromActiveExercise: (workoutExerciseId, setId) => {
        const current = get().activeWorkout;
        if (!current) return;
        set({
          activeWorkout: {
            ...current,
            exercises: current.exercises.map((ex) =>
              ex.id === workoutExerciseId
                ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
                : ex
            ),
          },
        });
      },

      updateActiveSet: (workoutExerciseId, setId, updates) => {
        const current = get().activeWorkout;
        if (!current) return;
        set({
          activeWorkout: {
            ...current,
            exercises: current.exercises.map((ex) =>
              ex.id === workoutExerciseId
                ? {
                    ...ex,
                    sets: ex.sets.map((s) =>
                      s.id === setId ? { ...s, ...updates } : s
                    ),
                  }
                : ex
            ),
          },
        });
      },

      toggleCompleteSet: (workoutExerciseId, setId) => {
        const state = get();
        const current = state.activeWorkout;
        if (!current) return;

        let shouldStartTimer = false;
        let restDuration = state.settings.defaultRestSeconds;
        let exerciseTitle = '';

        const updatedExercises = current.exercises.map((ex) => {
          if (ex.id !== workoutExerciseId) return ex;
          const exMeta = state.exercises.find((e) => e.id === ex.exerciseId);
          exerciseTitle = exMeta?.title || 'Exercício';
          restDuration = ex.restTimerSeconds;

          return {
            ...ex,
            sets: ex.sets.map((s) => {
              if (s.id !== setId) return s;
              const nextCompleted = !s.completed;
              if (
                nextCompleted &&
                restDuration > 0 &&
                !current.editingSessionId
              ) {
                shouldStartTimer = true;
              }
              return { ...s, completed: nextCompleted };
            }),
          };
        });

        const nextEndTime = shouldStartTimer
          ? Date.now() + restDuration * 1000
          : null;

        set({
          activeWorkout: {
            ...current,
            exercises: updatedExercises,
          },
          ...(shouldStartTimer && nextEndTime
            ? {
                restTimer: {
                  isActive: true,
                  totalSeconds: restDuration,
                  remainingSeconds: restDuration,
                  endTime: nextEndTime,
                  exerciseTitle,
                },
              }
            : {}),
        });

        if (shouldStartTimer && nextEndTime) {
          scheduleRestNotification(nextEndTime, exerciseTitle);
        }
      },

      finishActiveWorkout: (updateOriginalRoutine = false) => {
        const state = get();
        const current = state.activeWorkout;
        if (!current) return null;

        const isEditing = !!current.editingSessionId;
        const otherHistory = isEditing
          ? state.workoutHistory.filter((w) => w.id !== current.editingSessionId)
          : state.workoutHistory;

        const completedExercises = current.exercises
          .map((ex) => ({
            ...ex,
            sets: ex.sets.filter((s) => s.completed),
          }))
          .filter((ex) => ex.sets.length > 0);

        const { annotatedExercises, totalPRs } = evaluateWorkoutPRs(
          completedExercises,
          otherHistory
        );

        let totalVolumeKg = 0;
        let totalSets = 0;
        for (const ex of annotatedExercises) {
          for (const s of ex.sets) {
            totalSets += 1;
            if (s.type !== 'warmup') {
              totalVolumeKg += (s.weightKg ?? 0) * (s.reps ?? 0);
            }
          }
        }

        const durationSeconds =
          current.durationSecondsOverride ??
          Math.max(60, Math.floor((Date.now() - current.startTime) / 1000));

        const savedSession: WorkoutSession = {
          id: current.editingSessionId || uid('wh'),
          title: current.title || 'Treino Concluído',
          routineId: current.routineId,
          startTime: new Date(current.startTime).toISOString(),
          endTime: new Date().toISOString(),
          durationSeconds,
          description: current.description,
          exercises: annotatedExercises,
          totalVolumeKg: Math.round(totalVolumeKg),
          totalSets,
          prCount: totalPRs,
        };

        let updatedRoutines = state.routines;
        if (updateOriginalRoutine && current.routineId) {
          updatedRoutines = state.routines.map((r) =>
            r.id === current.routineId
              ? {
                  ...r,
                  exercises: current.exercises.map((ex) => ({
                    ...ex,
                    sets: ex.sets.map((s) => ({
                      ...s,
                      completed: false,
                      prs: [],
                    })),
                  })),
                  updatedAt: new Date().toISOString(),
                }
              : r
          );
        }

        const nextHistory = isEditing
          ? state.workoutHistory.map((w) =>
              w.id === current.editingSessionId ? savedSession : w
            )
          : [savedSession, ...state.workoutHistory];

        set({
          workoutHistory: nextHistory,
          routines: updatedRoutines,
          activeWorkout: null,
          lastFinishedWorkout: isEditing ? null : savedSession,
          restTimer: {
            isActive: false,
            totalSeconds: 90,
            remainingSeconds: 0,
            endTime: null,
          },
        });

        cancelRestNotification();

        return savedSession;
      },

      discardActiveWorkout: () => {
        set({
          activeWorkout: null,
          restTimer: {
            isActive: false,
            totalSeconds: 90,
            remainingSeconds: 0,
            endTime: null,
          },
        });
        cancelRestNotification();
      },

      clearLastFinishedWorkout: () => {
        set({ lastFinishedWorkout: null });
      },

      // Rest Timer (baseado em timestamp endTime para precisão em segundo plano no iPhone)
      startRestTimer: (seconds, exerciseTitle) => {
        const endTime = Date.now() + seconds * 1000;
        set({
          restTimer: {
            isActive: true,
            totalSeconds: seconds,
            remainingSeconds: seconds,
            endTime,
            exerciseTitle,
          },
        });
        scheduleRestNotification(endTime, exerciseTitle);
      },

      tickRestTimer: () => {
        const rt = get().restTimer;
        if (!rt.isActive) return;

        const now = Date.now();
        const computedRemaining = rt.endTime
          ? Math.max(0, Math.ceil((rt.endTime - now) / 1000))
          : Math.max(0, rt.remainingSeconds - 1);

        if (computedRemaining <= 0) {
          set({
            restTimer: {
              ...rt,
              isActive: false,
              remainingSeconds: 0,
              endTime: null,
            },
          });
        } else {
          set({
            restTimer: {
              ...rt,
              remainingSeconds: computedRemaining,
            },
          });
        }
      },

      adjustRestTimer: (deltaSeconds) => {
        const rt = get().restTimer;
        if (!rt.isActive) return;
        const now = Date.now();
        const currentRemaining = rt.endTime
          ? Math.max(0, Math.ceil((rt.endTime - now) / 1000))
          : rt.remainingSeconds;
        const nextRemaining = Math.max(0, currentRemaining + deltaSeconds);
        const nextTotal = Math.max(rt.totalSeconds, nextRemaining);
        const nextEndTime = nextRemaining > 0 ? now + nextRemaining * 1000 : null;

        set({
          restTimer: {
            ...rt,
            totalSeconds: nextTotal,
            remainingSeconds: nextRemaining,
            endTime: nextEndTime,
            isActive: nextRemaining > 0,
          },
        });

        if (nextEndTime && nextRemaining > 0) {
          scheduleRestNotification(nextEndTime, rt.exerciseTitle);
        } else {
          cancelRestNotification();
        }
      },

      stopRestTimer: () => {
        set({
          restTimer: {
            isActive: false,
            totalSeconds: 90,
            remainingSeconds: 0,
            endTime: null,
          },
        });
        cancelRestNotification();
      },

      // Routines & Folders
      createFolder: (name) => {
        const folders = get().folders;
        set({
          folders: [
            ...folders,
            { id: uid('folder'), name, order: folders.length + 1 },
          ],
        });
      },

      deleteFolder: (folderId) => {
        set({
          folders: get().folders.filter((f) => f.id !== folderId),
          routines: get().routines.map((r) =>
            r.folderId === folderId ? { ...r, folderId: null } : r
          ),
        });
      },

      saveRoutine: (routineInput) => {
        const routines = get().routines;
        if (routineInput.id) {
          set({
            routines: routines.map((r) =>
              r.id === routineInput.id
                ? {
                    ...r,
                    title: routineInput.title,
                    description: routineInput.description,
                    folderId: routineInput.folderId,
                    exercises: routineInput.exercises,
                    updatedAt: new Date().toISOString(),
                  }
                : r
            ),
          });
        } else {
          const newRoutine: Routine = {
            id: uid('routine'),
            title: routineInput.title,
            description: routineInput.description,
            folderId: routineInput.folderId,
            exercises: routineInput.exercises,
            updatedAt: new Date().toISOString(),
          };
          set({ routines: [newRoutine, ...routines] });
        }
      },

      duplicateRoutine: (routineId) => {
        const found = get().routines.find((r) => r.id === routineId);
        if (!found) return;
        const copy: Routine = {
          ...found,
          id: uid('routine'),
          title: `${found.title} (Cópia)`,
          updatedAt: new Date().toISOString(),
        };
        set({ routines: [copy, ...get().routines] });
      },

      deleteRoutine: (routineId) => {
        set({ routines: get().routines.filter((r) => r.id !== routineId) });
      },

      importSharedPayload: (payload, options) => {
        const state = get();
        const existingExercises = [...state.exercises];
        const existingExIds = new Set(existingExercises.map((e) => e.id));

        // 1. Importa exercícios personalizados que ainda não existam na biblioteca local
        if (payload.ce && payload.ce.length > 0) {
          for (const ce of payload.ce) {
            if (!existingExIds.has(ce.id)) {
              existingExercises.unshift({
                id: ce.id,
                title: ce.t,
                primaryMuscle: ce.pm,
                secondaryMuscles: ce.sm || [],
                equipment: ce.eq,
                measurementType: ce.mt,
                instructions: ce.in || [],
                gifUrl: ce.gif,
                isCustom: true,
              });
              existingExIds.add(ce.id);
            }
          }
        }

        // 2. Se for pasta, cria a nova pasta
        let targetFolderId: string | null =
          options?.targetFolderId !== undefined ? options.targetFolderId : null;
        const nextFolders = [...state.folders];

        if (payload.k === 'folder') {
          const newFolderId = uid('folder');
          nextFolders.push({
            id: newFolderId,
            name: payload.fn || 'Pasta Importada',
            order: nextFolders.length + 1,
          });
          targetFolderId = newFolderId;
        }

        // 3. Converte cada rotina compacta em Routine completa
        const importedRoutines: Routine[] = payload.r.map((cr) => {
          const exercises: WorkoutExercise[] = cr.ex.map((cex) => ({
            id: uid('re'),
            exerciseId: cex.e,
            supersetId: cex.ss ?? null,
            restTimerSeconds: cex.rt ?? 90,
            notes: cex.n || '',
            sets: cex.s.map((cs) => ({
              id: uid('s'),
              type: cs.t || 'normal',
              weightKg: cs.w ?? null,
              reps: cs.r ?? null,
              distanceKm: cs.d ?? null,
              durationSeconds: cs.s ?? null,
              rpe: cs.rpe ?? null,
              completed: false,
            })),
          }));

          return {
            id: uid('routine'),
            folderId: targetFolderId,
            title: cr.t || 'Treino Importado',
            description: cr.d || '',
            exercises,
            updatedAt: new Date().toISOString(),
          };
        });

        set({
          exercises: existingExercises,
          folders: nextFolders,
          routines: [...importedRoutines, ...state.routines],
        });

        // 4. Se o usuário clicou em "Importar e Iniciar Treino Agora"
        if (options?.startImmediately && importedRoutines[0]) {
          get().startRoutineWorkout(importedRoutines[0].id);
        }
      },

      // Exercises
      addCustomExercise: (exerciseInput) => {
        const newEx: Exercise = {
          ...exerciseInput,
          id: uid('ex'),
          isCustom: true,
        };
        set({ exercises: [newEx, ...get().exercises] });
        return newEx;
      },

      importExercisesBatch: (incoming) => {
        const current = get().exercises;
        const byId = new Map(current.map((e) => [e.id, e]));
        const byTitle = new Set(
          current.map((e) => e.title.toLowerCase().trim())
        );

        const toAdd: Exercise[] = [];
        let updatedExisting = false;
        const updatedList = current.map((existing) => {
          const match = incoming.find(
            (inc) =>
              inc.id === existing.id ||
              (inc.englishTitle &&
                existing.englishTitle &&
                inc.englishTitle.toLowerCase() ===
                  existing.englishTitle.toLowerCase()) ||
              inc.title.toLowerCase() === existing.title.toLowerCase()
          );
          if (match && match.gifUrl && !existing.gifUrl) {
            updatedExisting = true;
            return {
              ...existing,
              gifUrl: match.gifUrl,
              englishTitle: existing.englishTitle || match.englishTitle,
            };
          }
          return existing;
        });

        for (const item of incoming) {
          const normTitle = item.title.toLowerCase().trim();
          if (!byId.has(item.id) && !byTitle.has(normTitle)) {
            toAdd.push(item);
            byId.set(item.id, item);
            byTitle.add(normTitle);
          }
        }

        if (toAdd.length > 0 || updatedExisting) {
          set({ exercises: [...updatedList, ...toAdd] });
        }
        return toAdd.length;
      },

      deleteExercise: (exerciseId) => {
        set({
          exercises: get().exercises.filter((e) => e.id !== exerciseId),
        });
      },

      // Workout History
      deleteWorkoutSession: (sessionId) => {
        set({
          workoutHistory: get().workoutHistory.filter((w) => w.id !== sessionId),
        });
      },

      saveWorkoutSessionAsRoutine: (sessionId) => {
        const w = get().workoutHistory.find((s) => s.id === sessionId);
        if (!w) return;
        const newRoutine: Routine = {
          id: uid('routine'),
          folderId: get().folders[0]?.id ?? null,
          title: `${w.title} (Rotina)`,
          description: w.description || '',
          updatedAt: new Date().toISOString(),
          exercises: w.exercises.map((ex) => ({
            ...ex,
            id: uid('re'),
            sets: ex.sets.map((s) => ({
              ...s,
              id: uid('s'),
              completed: false,
              prs: [],
            })),
          })),
        };
        set({ routines: [newRoutine, ...get().routines] });
      },

      // Measurements & Photos
      addBodyMeasurement: (entry) => {
        const newItem: BodyMeasurementEntry = { ...entry, id: uid('bm') };
        const sorted = [...get().measurements, newItem].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
        set({ measurements: sorted });
      },

      deleteBodyMeasurement: (id) => {
        set({ measurements: get().measurements.filter((m) => m.id !== id) });
      },

      addProgressPhoto: (photo) => {
        set({
          progressPhotos: [
            { ...photo, id: uid('photo') },
            ...get().progressPhotos,
          ],
        });
      },

      deleteProgressPhoto: (id) => {
        set({
          progressPhotos: get().progressPhotos.filter((p) => p.id !== id),
        });
      },

      updateSettings: (updates) => {
        set({ settings: { ...get().settings, ...updates } });
      },

      clearAllData: () => {
        set({
          exercises: INITIAL_EXERCISES,
          folders: [],
          routines: [],
          workoutHistory: [],
          activeWorkout: null,
          measurements: [],
          progressPhotos: [],
          settings: INITIAL_USER_SETTINGS,
        });
      },

      markBackupDone: () => {
        set({ lastBackupAt: new Date().toISOString() });
      },

      restoreBackup: (data, mode) => {
        const s = get();
        const snapshot = {
          exercises: s.exercises,
          folders: s.folders,
          routines: s.routines,
          workoutHistory: s.workoutHistory,
          measurements: s.measurements,
          progressPhotos: s.progressPhotos,
          settings: s.settings,
        };
        // Lança QuotaExceededError se não couber — nada é alterado nesse caso.
        localStorage.setItem(RESTORE_UNDO_KEY, JSON.stringify(snapshot));

        try {
          if (mode === 'replace') {
            const seedIds = new Set(INITIAL_EXERCISES.map((e) => e.id));
            set({
              exercises: [
                ...INITIAL_EXERCISES,
                ...data.exercises.filter((e) => !seedIds.has(e.id)),
              ],
              folders: data.folders,
              routines: data.routines,
              workoutHistory: data.workoutHistory,
              measurements: data.measurements,
              progressPhotos: data.progressPhotos,
              settings: { ...INITIAL_USER_SETTINGS, ...data.settings },
              activeWorkout: null,
              lastFinishedWorkout: null,
            });
          } else {
            set({
              exercises: mergeById(s.exercises, data.exercises),
              folders: mergeById(s.folders, data.folders),
              routines: mergeById(s.routines, data.routines),
              workoutHistory: mergeById(s.workoutHistory, data.workoutHistory).sort(
                (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
              ),
              measurements: mergeById(s.measurements, data.measurements),
              progressPhotos: mergeById(s.progressPhotos, data.progressPhotos),
            });
          }
        } catch (err) {
          set(snapshot);
          throw err;
        }
      },

      undoLastRestore: () => {
        const raw = localStorage.getItem(RESTORE_UNDO_KEY);
        if (!raw) return false;
        try {
          const snapshot = JSON.parse(raw);
          set({ ...snapshot, activeWorkout: null });
          localStorage.removeItem(RESTORE_UNDO_KEY);
          return true;
        } catch {
          return false;
        }
      },

      hasRestoreUndo: () =>
        typeof localStorage !== 'undefined' &&
        localStorage.getItem(RESTORE_UNDO_KEY) !== null,
    }),
    {
      name: 'ironpulse-storage-v3',
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<WorkoutStoreState>) || {};
        const persistedExercises = persisted.exercises || [];
        const existingMap = new Map(persistedExercises.map((e) => [e.id, e]));

        // Atualiza os exercícios existentes com novos metadados (gifUrl, englishTitle) e adiciona novos do seed
        const mergedExercises = persistedExercises.map((ex) => {
          const seedMatch = INITIAL_EXERCISES.find((s) => s.id === ex.id);
          if (seedMatch) {
            return {
              ...seedMatch,
              ...ex,
              gifUrl: ex.gifUrl || seedMatch.gifUrl,
              englishTitle: ex.englishTitle || seedMatch.englishTitle,
            };
          }
          return ex;
        });

        for (const seedEx of INITIAL_EXERCISES) {
          if (!existingMap.has(seedEx.id)) {
            mergedExercises.push(seedEx);
          }
        }

        return {
          ...currentState,
          ...persisted,
          exercises:
            mergedExercises.length > 0 ? mergedExercises : INITIAL_EXERCISES,
        };
      },
    }
  )
);
