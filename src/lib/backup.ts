import type {
  BodyMeasurementEntry,
  Exercise,
  ProgressPhoto,
  Routine,
  RoutineFolder,
  UserSettings,
  WorkoutSession,
} from '@/types/workout';

export const BACKUP_APP_ID = 'ironpulse';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupData {
  exercises: Exercise[];
  folders: RoutineFolder[];
  routines: Routine[];
  workoutHistory: WorkoutSession[];
  measurements: BodyMeasurementEntry[];
  progressPhotos: ProgressPhoto[];
  settings: Partial<UserSettings>;
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
    if (!value.every((item) => isObject(item) && typeof item.id === 'string')) {
      return { ok: false, error: `Backup corrompido: itens inválidos em "${key}".` };
    }
    (data[key] as unknown[]) = value;
  }

  data.settings = isObject(rawData.settings)
    ? (rawData.settings as Partial<UserSettings>)
    : {};

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
  return {
    exportedAt: file.exportedAt,
    workouts: file.data.workoutHistory.length,
    routines: file.data.routines.length,
    folders: file.data.folders.length,
    measurements: file.data.measurements.length,
    photos: file.data.progressPhotos.length,
    customExercises: file.data.exercises.length,
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
