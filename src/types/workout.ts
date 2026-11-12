export type MuscleGroup =
  | 'chest'
  | 'upper_back'
  | 'lats'
  | 'lower_back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'traps'
  | 'abs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'abductors'
  | 'adductors'
  | 'cardio'
  | 'full_body';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'ez_bar'
  | 'smith'
  | 'other';

export type ExerciseMeasurementType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'assisted_bodyweight'
  | 'duration'
  | 'distance_duration';

export type SetType = 'warmup' | 'normal' | 'failure' | 'dropset';

export type RPEValue = 6 | 6.5 | 7 | 7.5 | 8 | 8.5 | 9 | 9.5 | 10 | null;

export interface Exercise {
  id: string;
  title: string;
  englishTitle?: string;
  externalId?: string;
  gifUrl?: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  measurementType: ExerciseMeasurementType;
  instructions: string[];
  tips?: string;
  isCustom?: boolean;
}

export interface WorkoutSet {
  id: string;
  type: SetType;
  weightKg: number | null;
  reps: number | null;
  distanceKm?: number | null;
  durationSeconds?: number | null;
  rpe?: RPEValue;
  completed: boolean;
  prs?: ('heaviest_weight' | 'best_1rm' | 'best_set_volume')[];
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  supersetId: number | null;
  restTimerSeconds: number;
  notes: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  title: string;
  routineId?: string | null;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  description: string;
  photoUrl?: string;
  exercises: WorkoutExercise[];
  totalVolumeKg: number;
  totalSets: number;
  prCount: number;
}

export interface ActiveWorkoutState {
  editingSessionId?: string | null; // Se preenchido, está editando um treino já salvo
  title: string;
  routineId?: string | null;
  startTime: number;
  durationSecondsOverride?: number | null;
  description: string;
  exercises: WorkoutExercise[];
  isMinimized: boolean;
}

export interface Routine {
  id: string;
  folderId: string | null;
  title: string;
  description: string;
  exercises: WorkoutExercise[];
  updatedAt: string;
}

export interface RoutineFolder {
  id: string;
  name: string;
  order: number;
}

export interface BodyMeasurementEntry {
  id: string;
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  caloricIntakeKcal?: number;
  neckCm?: number;
  shouldersCm?: number;
  chestCm?: number;
  leftBicepCm?: number;
  rightBicepCm?: number;
  forearmCm?: number;
  waistCm?: number;
  abdomenCm?: number;
  hipsCm?: number;
  leftThighCm?: number;
  rightThighCm?: number;
  calfCm?: number;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  weightKg: number;
  caption: string;
  dataUrl: string;
  pose: 'Frente' | 'Costas' | 'Perfil';
}

export interface UserSettings {
  name: string;
  handle: string;
  bio: string;
  weightUnit: 'kg' | 'lbs';
  defaultRestSeconds: number;
  defaultBarWeightKg: number;
  soundEnabled: boolean;
  weeklyWorkoutGoal: number;
}

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Peito',
  upper_back: 'Costas Superiores',
  lats: 'Dorsais',
  lower_back: 'Lombar',
  shoulders: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebraços',
  traps: 'Trapézio',
  abs: 'Abdômen',
  quads: 'Quadríceps',
  hamstrings: 'Posterior de Coxa',
  glutes: 'Glúteos',
  calves: 'Panturrilhas',
  abductors: 'Abdutores',
  adductors: 'Adutores',
  cardio: 'Cardio',
  full_body: 'Corpo Inteiro',
};

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell: 'Barra',
  dumbbell: 'Halteres',
  machine: 'Máquina',
  cable: 'Cabo / Polia',
  bodyweight: 'Peso Corporal',
  kettlebell: 'Kettlebell',
  band: 'Elástico',
  ez_bar: 'Barra W',
  smith: 'Smith',
  other: 'Outro',
};
