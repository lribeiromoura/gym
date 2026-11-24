import type {
  BodyMeasurementEntry,
  Exercise,
  ProgressPhoto,
  Routine,
  RoutineFolder,
  UserSettings,
  WorkoutSession,
} from '@/types/workout';
import type {
  FoodItem,
  FoodLogEntry,
  NutritionBackupData,
  NutritionGoals,
  NutritionProfile,
  SavedMeal,
} from '@/types/nutrition';
import { INITIAL_USER_SETTINGS } from '@/data/initial-data';

export const BACKUP_APP_ID = 'ironpulse';
export const BACKUP_SCHEMA_VERSION = 2;

/**
 * Garante retrocompatibilidade de `UserSettings` para estados salvos no `localStorage`
 * ou arquivos `.json` de versões anteriores que não possuíam `theme` ou `showRpeColumn`.
 */
export function resolveUserSettings(
  incoming?: Partial<UserSettings> | null
): UserSettings {
  const safe = incoming && typeof incoming === 'object' ? incoming : {};
  const barWeight =
    typeof safe.defaultBarWeightKg === 'number' && safe.defaultBarWeightKg > 0
      ? safe.defaultBarWeightKg
      : typeof safe.barbellWeightKg === 'number' && safe.barbellWeightKg > 0
        ? safe.barbellWeightKg
        : INITIAL_USER_SETTINGS.defaultBarWeightKg;

  return {
    ...INITIAL_USER_SETTINGS,
    ...safe,
    weightUnit: safe.weightUnit === 'lbs' ? 'lbs' : 'kg',
    defaultBarWeightKg: barWeight,
    barbellWeightKg: barWeight,
    theme: safe.theme === 'light' ? 'light' : 'dark',
    showRpeColumn:
      typeof safe.showRpeColumn === 'boolean'
        ? safe.showRpeColumn
        : INITIAL_USER_SETTINGS.showRpeColumn,
    ...(typeof safe.aiReportPrompt === 'string'
      ? { aiReportPrompt: safe.aiReportPrompt }
      : { aiReportPrompt: undefined }),
  };
}

export interface BackupData {
  exercises: Exercise[];
  folders: RoutineFolder[];
  routines: Routine[];
  workoutHistory: WorkoutSession[];
  measurements: BodyMeasurementEntry[];
  progressPhotos: ProgressPhoto[];
  settings: Partial<UserSettings>;
  nutrition?: NutritionBackupData;
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  includesPhotos: boolean;
  data: BackupData;
}

export type BackupSourceState = Omit<BackupData, 'settings'> & {
  settings: UserSettings;
};

export type RestoreMode = 'replace' | 'merge';

export interface BackupSummary {
  exportedAt: string;
  workouts: number;
  routines: number;
  folders: number;
  measurements: number;
  photos: number;
  customExercises: number;
  foodLogs: number;
  savedMeals: number;
  customFoods: number;
}

/** Cria o objeto de backup. Exercícios do seed (seedIds) não são exportados. */
export function createBackup(
  state: BackupSourceState,
  options: { includePhotos: boolean; seedIds: Set<string>; now?: Date }
): BackupFile {
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: (options.now ?? new Date()).toISOString(),
    includesPhotos: options.includePhotos,
    data: {
      exercises: state.exercises.filter((e) => !options.seedIds.has(e.id)),
      folders: state.folders,
      routines: state.routines,
      workoutHistory: state.workoutHistory,
      measurements: state.measurements,
      progressPhotos: options.includePhotos ? state.progressPhotos : [],
      settings: state.settings,
      ...(state.nutrition ? { nutrition: state.nutrition } : {}),
    },
  };
}

export function serializeBackup(file: BackupFile): string {
  return JSON.stringify(file);
}

export function backupFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `ironpulse-backup-${y}-${m}-${d}.json`;
}

const COLLECTION_KEYS = [
  'exercises',
  'folders',
  'routines',
  'workoutHistory',
  'measurements',
  'progressPhotos',
] as const;

export type ParseResult =
  | { ok: true; file: BackupFile }
  | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isValidWorkoutExercisesArray = (val: unknown): boolean =>
  Array.isArray(val) &&
  val.every(
    (ex) =>
      isObject(ex) &&
      typeof ex.id === 'string' &&
      typeof ex.exerciseId === 'string' &&
      Array.isArray(ex.sets)
  );

function isValidCollectionItem(
  key: (typeof COLLECTION_KEYS)[number],
  item: unknown
): boolean {
  if (!isObject(item) || typeof item.id !== 'string' || !item.id.trim()) {
    return false;
  }
  switch (key) {
    case 'exercises':
      return typeof item.title === 'string' && item.title.trim().length > 0;
    case 'folders':
      return typeof item.name === 'string' && item.name.trim().length > 0;
    case 'routines':
      return (
        typeof item.title === 'string' &&
        (item.exercises === undefined || isValidWorkoutExercisesArray(item.exercises))
      );
    case 'workoutHistory':
      return (
        typeof item.title === 'string' &&
        typeof item.startTime === 'string' &&
        !Number.isNaN(new Date(item.startTime).getTime()) &&
        isValidWorkoutExercisesArray(item.exercises)
      );
    case 'measurements':
      return typeof item.date === 'string' && item.date.trim().length > 0;
    case 'progressPhotos':
      return (
        typeof item.date === 'string' && typeof item.dataUrl === 'string'
      );
    default:
      return true;
  }
}

/** Garante que dados restaurados tenham todos os arrays e campos numéricos íntegros */
export function normalizeBackupData(data: BackupData): BackupData {
  const safeExercises = (data.exercises || []).map((ex) => ({
    ...ex,
    secondaryMuscles: Array.isArray(ex.secondaryMuscles)
      ? ex.secondaryMuscles
      : [],
    instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
  }));

  const safeRoutines = (data.routines || []).map((r) => ({
    ...r,
    folderId: r.folderId ?? null,
    description: typeof r.description === 'string' ? r.description : '',
    updatedAt:
      typeof r.updatedAt === 'string' ? r.updatedAt : new Date().toISOString(),
    exercises: Array.isArray(r.exercises)
      ? r.exercises.map((ex) => ({
          ...ex,
          supersetId: ex.supersetId ?? null,
          restTimerSeconds:
            typeof ex.restTimerSeconds === 'number' ? ex.restTimerSeconds : 90,
          notes: typeof ex.notes === 'string' ? ex.notes : '',
          sets: Array.isArray(ex.sets) ? ex.sets : [],
        }))
      : [],
  }));

  const safeHistory = (data.workoutHistory || []).map((w) => ({
    ...w,
    description: typeof w.description === 'string' ? w.description : '',
    durationSeconds:
      typeof w.durationSeconds === 'number' && Number.isFinite(w.durationSeconds)
        ? Math.max(0, w.durationSeconds)
        : 60,
    totalVolumeKg:
      typeof w.totalVolumeKg === 'number' && Number.isFinite(w.totalVolumeKg)
        ? Math.max(0, w.totalVolumeKg)
        : 0,
    totalSets:
      typeof w.totalSets === 'number' && Number.isFinite(w.totalSets)
        ? Math.max(0, w.totalSets)
        : 0,
    prCount:
      typeof w.prCount === 'number' && Number.isFinite(w.prCount)
        ? Math.max(0, w.prCount)
        : 0,
    exercises: Array.isArray(w.exercises)
      ? w.exercises.map((ex) => ({
          ...ex,
          supersetId: ex.supersetId ?? null,
          restTimerSeconds:
            typeof ex.restTimerSeconds === 'number' ? ex.restTimerSeconds : 90,
          notes: typeof ex.notes === 'string' ? ex.notes : '',
          sets: Array.isArray(ex.sets) ? ex.sets : [],
        }))
      : [],
  }));

  const safeMeasurements = [...(data.measurements || [])].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  let safeNutrition: NutritionBackupData | undefined;
  if (data.nutrition && isObject(data.nutrition)) {
    const rawWater = isObject(data.nutrition.waterByDate)
      ? data.nutrition.waterByDate
      : {};
    const safeWater: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawWater)) {
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        safeWater[k] = Math.round(v);
      }
    }

    safeNutrition = {
      customFoods: Array.isArray(data.nutrition.customFoods)
        ? data.nutrition.customFoods
        : [],
      foodLogs: Array.isArray(data.nutrition.foodLogs)
        ? data.nutrition.foodLogs
        : [],
      waterByDate: safeWater,
      savedMeals: Array.isArray(data.nutrition.savedMeals)
        ? data.nutrition.savedMeals
        : [],
      profile: (isObject(data.nutrition.profile)
        ? data.nutrition.profile
        : {}) as unknown as NutritionProfile,
      goals: (isObject(data.nutrition.goals)
        ? data.nutrition.goals
        : {}) as unknown as NutritionGoals,
    };
  }

  return {
    exercises: safeExercises,
    folders: data.folders || [],
    routines: safeRoutines,
    workoutHistory: safeHistory,
    measurements: safeMeasurements,
    progressPhotos: data.progressPhotos || [],
    settings: data.settings || {},
    ...(safeNutrition ? { nutrition: safeNutrition } : {}),
  };
}

function validateNutritionBackup(
  raw: unknown
): { ok: true; value: NutritionBackupData } | { ok: false; error: string } {
  if (!isObject(raw)) {
    return { ok: false, error: 'Backup corrompido: "nutrition" inválido.' };
  }

  const customFoods = raw.customFoods === undefined ? [] : raw.customFoods;
  if (
    !Array.isArray(customFoods) ||
    !customFoods.every(
      (f) => isObject(f) && typeof f.id === 'string' && typeof f.name === 'string'
    )
  ) {
    return {
      ok: false,
      error: 'Backup corrompido: "nutrition.customFoods" inválido.',
    };
  }

  const foodLogs = raw.foodLogs === undefined ? [] : raw.foodLogs;
  if (
    !Array.isArray(foodLogs) ||
    !foodLogs.every(
      (e) =>
        isObject(e) &&
        typeof e.id === 'string' &&
        typeof e.date === 'string' &&
        typeof e.foodName === 'string'
    )
  ) {
    return {
      ok: false,
      error: 'Backup corrompido: "nutrition.foodLogs" inválido.',
    };
  }

  const savedMeals = raw.savedMeals === undefined ? [] : raw.savedMeals;
  if (
    !Array.isArray(savedMeals) ||
    !savedMeals.every(
      (m) =>
        isObject(m) &&
        typeof m.id === 'string' &&
        typeof m.name === 'string' &&
        Array.isArray(m.items)
    )
  ) {
    return {
      ok: false,
      error: 'Backup corrompido: "nutrition.savedMeals" inválido.',
    };
  }

  const waterByDateRaw = raw.waterByDate === undefined ? {} : raw.waterByDate;
  if (!isObject(waterByDateRaw)) {
    return {
      ok: false,
      error: 'Backup corrompido: "nutrition.waterByDate" inválido.',
    };
  }

  return {
    ok: true,
    value: {
      customFoods: customFoods as FoodItem[],
      foodLogs: foodLogs as FoodLogEntry[],
      waterByDate: waterByDateRaw as Record<string, number>,
      savedMeals: savedMeals as SavedMeal[],
      profile: (isObject(raw.profile)
        ? raw.profile
        : {}) as unknown as NutritionProfile,
      goals: (isObject(raw.goals)
        ? raw.goals
        : {}) as unknown as NutritionGoals,
    },
  };
}

/** Valida e normaliza o conteúdo de um arquivo de backup. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }

  if (!isObject(raw) || raw.app !== BACKUP_APP_ID) {
    return { ok: false, error: 'Este arquivo não é um backup do IronPulse.' };
  }

  const version = raw.schemaVersion;
  if (typeof version !== 'number' || version < 1) {
    return { ok: false, error: 'Versão do backup inválida.' };
  }
  if (version > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      error: 'Este backup foi criado por uma versão mais nova do app. Atualize o IronPulse.',
    };
  }

  const rawData = isObject(raw.data) ? raw.data : {};
  const data = {} as BackupData;

  for (const key of COLLECTION_KEYS) {
    const value = rawData[key];
    if (value === undefined) {
      (data[key] as unknown[]) = [];
      continue;
    }
    if (!Array.isArray(value)) {
      return { ok: false, error: `Backup corrompido: "${key}" não é uma lista.` };
    }
    if (!value.every((item) => isValidCollectionItem(key, item))) {
      return { ok: false, error: `Backup corrompido: itens inválidos em "${key}".` };
    }
    (data[key] as unknown[]) = value;
  }

  data.settings = isObject(rawData.settings)
    ? (rawData.settings as Partial<UserSettings>)
    : {};

  if (rawData.nutrition !== undefined) {
    const nutritionValidation = validateNutritionBackup(rawData.nutrition);
    if (!nutritionValidation.ok) {
      return nutritionValidation;
    }
    data.nutrition = nutritionValidation.value;
  }

  return {
    ok: true,
    file: {
      app: BACKUP_APP_ID,
      schemaVersion: version,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      includesPhotos: raw.includesPhotos !== false,
      data,
    },
  };
}

export function summarizeBackup(file: BackupFile): BackupSummary {
  const nutrition = file.data.nutrition;
  return {
    exportedAt: file.exportedAt,
    workouts: file.data.workoutHistory.length,
    routines: file.data.routines.length,
    folders: file.data.folders.length,
    measurements: file.data.measurements.length,
    photos: file.data.progressPhotos.length,
    customExercises: file.data.exercises.length,
    foodLogs: nutrition?.foodLogs?.length ?? 0,
    savedMeals: nutrition?.savedMeals?.length ?? 0,
    customFoods: nutrition?.customFoods?.length ?? 0,
  };
}

/** Mescla por id: mantém os atuais e adiciona apenas os que não existem. */
export function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const ids = new Set(current.map((i) => i.id));
  const result = [...current];
  for (const item of incoming) {
    if (!ids.has(item.id)) {
      ids.add(item.id);
      result.push(item);
    }
  }
  return result;
}

/** Compartilha o arquivo (iOS/Android) ou faz download (desktop). */
export async function shareOrDownloadBackup(file: BackupFile): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const name = backupFileName(new Date(file.exportedAt));
  const blob = new Blob([serializeBackup(file)], { type: 'application/json' });

  if (typeof navigator !== 'undefined' && typeof File !== 'undefined' && navigator.canShare) {
    const shareFile = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare({ files: [shareFile] })) {
      try {
        await navigator.share({ files: [shareFile], title: 'Backup IronPulse' });
        return 'shared';
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return 'cancelled';
        // outros erros: cai no download
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
