import {
  EquipmentType,
  Exercise,
  ExerciseMeasurementType,
  MuscleGroup,
  Routine,
  RoutineFolder,
  RPEValue,
  SetType,
  WorkoutExercise,
  WorkoutSession,
} from '@/types/workout';

/**
 * Formato compacto para URL (?share=...) para manter o link curto ao compartilhar via WhatsApp / iMessage
 */
export interface CompactSet {
  t: SetType;
  w: number | null;
  r: number | null;
  d?: number | null;
  s?: number | null;
  rpe?: RPEValue;
}

export interface CompactWorkoutExercise {
  e: string; // exerciseId
  ss: number | null; // supersetId
  rt: number; // restTimerSeconds
  n: string; // notes
  s: CompactSet[];
}

export interface CompactRoutine {
  t: string; // title
  d: string; // description
  ex: CompactWorkoutExercise[];
}

export interface CompactCustomExercise {
  id: string;
  t: string;
  pm: MuscleGroup;
  sm: MuscleGroup[];
  eq: EquipmentType;
  mt: ExerciseMeasurementType;
  in: string[];
  gif?: string;
}

export interface SharePayload {
  v: 1;
  k: 'routine' | 'folder';
  by?: string; // Nome de quem compartilhou
  fn?: string; // Nome da pasta (quando k === 'folder')
  r: CompactRoutine[]; // 1 rotina (quando k === 'routine') ou N rotinas (quando k === 'folder')
  ce?: CompactCustomExercise[]; // Exercícios personalizados usados nos treinos
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function compactExercises(list: WorkoutExercise[]): CompactWorkoutExercise[] {
  return list.map((item) => ({
    e: item.exerciseId,
    ss: item.supersetId ?? null,
    rt: item.restTimerSeconds ?? 90,
    n: item.notes || '',
    s: item.sets.map((st) => ({
      t: st.type,
      w: st.weightKg ?? null,
      r: st.reps ?? null,
      ...(st.distanceKm ? { d: st.distanceKm } : {}),
      ...(st.durationSeconds ? { s: st.durationSeconds } : {}),
      ...(st.rpe ? { rpe: st.rpe } : {}),
    })),
  }));
}

function collectCustomExercises(
  routinesList: { exercises: WorkoutExercise[] }[],
  allExercises: Exercise[]
): CompactCustomExercise[] {
  const usedIds = new Set<string>();
  for (const r of routinesList) {
    for (const ex of r.exercises) {
      usedIds.add(ex.exerciseId);
    }
  }

  const customList: CompactCustomExercise[] = [];
  for (const ex of allExercises) {
    if (
      usedIds.has(ex.id) &&
      (ex.isCustom || ex.id.startsWith('custom-') || ex.id.startsWith('edb-'))
    ) {
      customList.push({
        id: ex.id,
        t: ex.title,
        pm: ex.primaryMuscle,
        sm: ex.secondaryMuscles,
        eq: ex.equipment,
        mt: ex.measurementType,
        in: ex.instructions || [],
        ...(ex.gifUrl ? { gif: ex.gifUrl } : {}),
      });
    }
  }
  return customList;
}

export function encodeRoutineShareToken(
  routine: Pick<Routine, 'title' | 'description' | 'exercises'> | WorkoutSession,
  allExercises: Exercise[],
  authorName?: string
): string {
  const customExercises = collectCustomExercises([routine], allExercises);
  const payload: SharePayload = {
    v: 1,
    k: 'routine',
    ...(authorName && authorName !== 'Usuário' ? { by: authorName } : {}),
    r: [
      {
        t: routine.title,
        d: routine.description || '',
        ex: compactExercises(routine.exercises),
      },
    ],
    ...(customExercises.length > 0 ? { ce: customExercises } : {}),
  };

  return toBase64Url(JSON.stringify(payload));
}

export function encodeFolderShareToken(
  folder: RoutineFolder,
  folderRoutines: Routine[],
  allExercises: Exercise[],
  authorName?: string
): string {
  const customExercises = collectCustomExercises(folderRoutines, allExercises);
  const payload: SharePayload = {
    v: 1,
    k: 'folder',
    fn: folder.name,
    ...(authorName && authorName !== 'Usuário' ? { by: authorName } : {}),
    r: folderRoutines.map((r) => ({
      t: r.title,
      d: r.description || '',
      ex: compactExercises(r.exercises),
    })),
    ...(customExercises.length > 0 ? { ce: customExercises } : {}),
  };

  return toBase64Url(JSON.stringify(payload));
}

export function decodeShareToken(token: string): SharePayload | null {
  try {
    const json = fromBase64Url(token.trim());
    const parsed = JSON.parse(json) as SharePayload;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.r)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildShareUrl(token: string): string {
  if (typeof window === 'undefined') return `?share=${token}`;
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('share', token);
  return url.toString();
}

/**
 * Abre o menu nativo de compartilhamento no iPhone/Android (navigator.share)
 * ou copia o link para a área de transferência caso esteja no desktop.
 */
export async function shareOrCopyLink(params: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'copied'> {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share({
        title: params.title,
        text: params.text,
        url: params.url,
      });
      return 'shared';
    } catch (err) {
      // Se o usuário cancelou o sheet nativo, ainda copiamos o link por segurança
      if ((err as Error)?.name === 'AbortError') {
        // continua para copiar
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(params.url);
  }
  return 'copied';
}
