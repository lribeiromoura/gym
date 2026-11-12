import {
  BodyMeasurementEntry,
  Exercise,
  Routine,
  RoutineFolder,
  UserSettings,
  WorkoutSession,
} from '@/types/workout';
import { EXERCISES_SEED } from './exercises-seed';

export const INITIAL_USER_SETTINGS: UserSettings = {
  name: 'Usuário',
  handle: '@usuario',
  bio: '',
  weightUnit: 'kg',
  defaultRestSeconds: 90,
  defaultBarWeightKg: 20,
  soundEnabled: true,
  weeklyWorkoutGoal: 4,
};

export const INITIAL_EXERCISES: Exercise[] = EXERCISES_SEED;
export const INITIAL_FOLDERS: RoutineFolder[] = [];
export const INITIAL_ROUTINES: Routine[] = [];
export const INITIAL_WORKOUT_HISTORY: WorkoutSession[] = [];
export const INITIAL_MEASUREMENTS: BodyMeasurementEntry[] = [];
