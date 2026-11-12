import {
  Exercise,
  MuscleGroup,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSet,
} from '@/types/workout';

/**
 * Calcula o 1RM Estimado usando a fórmula de Epley:
 * 1RM = weight * (1 + reps / 30)
 */
export function calculate1RM(weightKg: number | null, reps: number | null): number {
  if (!weightKg || !reps || weightKg <= 0 || reps <= 0) return 0;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  const epley = weightKg * (1 + reps / 30);
  return Math.round(epley * 10) / 10;
}

/**
 * Calcula a tabela de equivalência de repetições (1RM até 15RM) para um dado 1RM
 */
export function getRepMaxTable(oneRepMax: number): { reps: number; weight: number; pct: number }[] {
  const percentages = [
    { reps: 1, pct: 100 },
    { reps: 2, pct: 95 },
    { reps: 3, pct: 92 },
    { reps: 4, pct: 89 },
    { reps: 5, pct: 86 },
    { reps: 6, pct: 83 },
    { reps: 7, pct: 80 },
    { reps: 8, pct: 78 },
    { reps: 9, pct: 76 },
    { reps: 10, pct: 75 },
    { reps: 12, pct: 70 },
    { reps: 15, pct: 65 },
  ];
  return percentages.map((item) => ({
    reps: item.reps,
    pct: item.pct,
    weight: Math.round(oneRepMax * (item.pct / 100) * 10) / 10,
  }));
}

/**
 * Retorna a última execução de um exercício no histórico de treinos
 */
export function getPreviousExerciseSets(
  exerciseId: string,
  history: WorkoutSession[],
  excludeSessionId?: string | null
): WorkoutSet[] {
  for (const session of history) {
    if (excludeSessionId && session.id === excludeSessionId) continue;
    const found = session.exercises.find((e) => e.exerciseId === exerciseId);
    if (found && found.sets.some((s) => s.completed)) {
      return found.sets.filter((s) => s.completed);
    }
  }
  return [];
}

/**
 * Calcula os Recordes Pessoais (PRs) históricos de um exercício específico
 */
export interface ExerciseRecordsSummary {
  heaviestWeight: { value: number; reps: number; date: string } | null;
  best1RM: { value: number; weight: number; reps: number; date: string } | null;
  bestSetVolume: { value: number; weight: number; reps: number; date: string } | null;
  bestSessionVolume: { value: number; date: string } | null;
  bestWeightByReps: Record<number, { weight: number; date: string }>;
}

export function getExerciseRecords(
  exerciseId: string,
  history: WorkoutSession[]
): ExerciseRecordsSummary {
  let heaviestWeight: ExerciseRecordsSummary['heaviestWeight'] = null;
  let best1RM: ExerciseRecordsSummary['best1RM'] = null;
  let bestSetVolume: ExerciseRecordsSummary['bestSetVolume'] = null;
  let bestSessionVolume: ExerciseRecordsSummary['bestSessionVolume'] = null;
  const bestWeightByReps: Record<number, { weight: number; date: string }> = {};

  for (const session of history) {
    let sessionVol = 0;
    for (const ex of session.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      for (const s of ex.sets) {
        if (!s.completed || s.type === 'warmup') continue;
        const w = s.weightKg ?? 0;
        const r = s.reps ?? 0;
        if (w <= 0 || r <= 0) continue;

        const vol = w * r;
        sessionVol += vol;
        const est1RM = calculate1RM(w, r);

        if (!heaviestWeight || w > heaviestWeight.value) {
          heaviestWeight = { value: w, reps: r, date: session.startTime };
        }
        if (!best1RM || est1RM > best1RM.value) {
          best1RM = { value: est1RM, weight: w, reps: r, date: session.startTime };
        }
        if (!bestSetVolume || vol > bestSetVolume.value) {
          bestSetVolume = { value: vol, weight: w, reps: r, date: session.startTime };
        }
        if (r >= 1 && r <= 15) {
          if (!bestWeightByReps[r] || w > bestWeightByReps[r].weight) {
            bestWeightByReps[r] = { weight: w, date: session.startTime };
          }
        }
      }
    }
    if (sessionVol > 0 && (!bestSessionVolume || sessionVol > bestSessionVolume.value)) {
      bestSessionVolume = { value: sessionVol, date: session.startTime };
    }
  }

  return {
    heaviestWeight,
    best1RM,
    bestSetVolume,
    bestSessionVolume,
    bestWeightByReps,
  };
}

/**
 * Avalia um treino sendo finalizado contra o histórico anterior e marca as badges de PR nas séries
 */
export function evaluateWorkoutPRs(
  exercises: WorkoutExercise[],
  history: WorkoutSession[]
): { annotatedExercises: WorkoutExercise[]; totalPRs: number } {
  let totalPRs = 0;

  const annotatedExercises = exercises.map((ex) => {
    const pastRecords = getExerciseRecords(ex.exerciseId, history);
    let maxWeightSoFar = pastRecords.heaviestWeight?.value ?? 0;
    let max1RMSoFar = pastRecords.best1RM?.value ?? 0;
    let maxSetVolSoFar = pastRecords.bestSetVolume?.value ?? 0;

    const sets = ex.sets.map((s) => {
      if (!s.completed || s.type === 'warmup') {
        return { ...s, prs: [] };
      }
      const w = s.weightKg ?? 0;
      const r = s.reps ?? 0;
      if (w <= 0 || r <= 0) {
        return { ...s, prs: [] };
      }

      const prs: ('heaviest_weight' | 'best_1rm' | 'best_set_volume')[] = [];
      const est1RM = calculate1RM(w, r);
      const vol = w * r;

      if (w > maxWeightSoFar) {
        prs.push('heaviest_weight');
        maxWeightSoFar = w;
      }
      if (est1RM > max1RMSoFar) {
        prs.push('best_1rm');
        max1RMSoFar = est1RM;
      }
      if (vol > maxSetVolSoFar) {
        prs.push('best_set_volume');
        maxSetVolSoFar = vol;
      }

      totalPRs += prs.length;
      return { ...s, prs };
    });

    return { ...ex, sets };
  });

  return { annotatedExercises, totalPRs };
}

/**
 * Calculadora de Anilhas por Lado da Barra
 */
export interface PlateBreakdown {
  targetWeight: number;
  achievedWeight: number;
  barWeight: number;
  platesPerSide: { weight: number; count: number; color: string }[];
  remainderKg: number;
}

const STANDARD_PLATES = [
  { weight: 25, color: '#EF4444' },
  { weight: 20, color: '#2563EB' },
  { weight: 15, color: '#EAB308' },
  { weight: 10, color: '#16A34A' },
  { weight: 5, color: '#F8FAFC' },
  { weight: 2.5, color: '#94A3B8' },
  { weight: 1.25, color: '#64748B' },
];

export function calculatePlates(
  targetWeightKg: number,
  barWeightKg: number = 20
): PlateBreakdown {
  if (targetWeightKg <= barWeightKg) {
    return {
      targetWeight: targetWeightKg,
      achievedWeight: barWeightKg,
      barWeight: barWeightKg,
      platesPerSide: [],
      remainderKg: 0,
    };
  }

  let remainingOneSide = (targetWeightKg - barWeightKg) / 2;
  const platesPerSide: { weight: number; count: number; color: string }[] = [];

  for (const plate of STANDARD_PLATES) {
    const count = Math.floor((remainingOneSide + 0.001) / plate.weight);
    if (count > 0) {
      platesPerSide.push({ weight: plate.weight, count, color: plate.color });
      remainingOneSide =
        Math.round((remainingOneSide - count * plate.weight) * 100) / 100;
    }
  }

  const loadedOneSide = platesPerSide.reduce(
    (acc, p) => acc + p.weight * p.count,
    0
  );
  const achievedWeight = barWeightKg + loadedOneSide * 2;

  return {
    targetWeight: targetWeightKg,
    achievedWeight,
    barWeight: barWeightKg,
    platesPerSide,
    remainderKg: Math.round((targetWeightKg - achievedWeight) * 100) / 100,
  };
}

/**
 * Gera sugestão de séries de aquecimento (Warm-up sets) para uma carga de trabalho
 */
export function generateWarmupSets(
  workingWeightKg: number,
  barWeightKg: number = 20
): { pct: number; weightKg: number; reps: number; label: string }[] {
  if (workingWeightKg <= barWeightKg) {
    return [{ pct: 100, weightKg: barWeightKg, reps: 10, label: 'Barra vazia' }];
  }
  const roundTo2_5 = (v: number) =>
    Math.max(barWeightKg, Math.round(v / 2.5) * 2.5);
  return [
    {
      pct: 0,
      weightKg: barWeightKg,
      reps: 12,
      label: 'Série 1 — Barra Vazia (Mobilidade)',
    },
    {
      pct: 50,
      weightKg: roundTo2_5(workingWeightKg * 0.5),
      reps: 8,
      label: 'Série 2 — 50% da Carga',
    },
    {
      pct: 70,
      weightKg: roundTo2_5(workingWeightKg * 0.7),
      reps: 5,
      label: 'Série 3 — 70% da Carga',
    },
    {
      pct: 85,
      weightKg: roundTo2_5(workingWeightKg * 0.85),
      reps: 2,
      label: 'Série 4 — 85% (Aclimatação Neural)',
    },
  ];
}

/**
 * Calcula a distribuição muscular (séries primárias = 1.0, secundárias = 0.5)
 */
export function calculateMuscleDistribution(
  workouts: WorkoutSession[],
  exerciseCatalog: Exercise[]
): Record<
  MuscleGroup,
  { primarySets: number; secondarySets: number; score: number; volumeKg: number }
> {
  const map: Record<
    MuscleGroup,
    { primarySets: number; secondarySets: number; score: number; volumeKg: number }
  > = {
    chest: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    upper_back: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    lats: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    lower_back: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    shoulders: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    biceps: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    triceps: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    forearms: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    traps: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    abs: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    quads: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    hamstrings: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    glutes: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    calves: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    abductors: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    adductors: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    cardio: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
    full_body: { primarySets: 0, secondarySets: 0, score: 0, volumeKg: 0 },
  };

  const catalogById = new Map(exerciseCatalog.map((e) => [e.id, e]));

  for (const w of workouts) {
    for (const ex of w.exercises) {
      const meta = catalogById.get(ex.exerciseId);
      if (!meta) continue;
      const validSets = ex.sets.filter((s) => s.completed && s.type !== 'warmup');
      const setCount = validSets.length;
      if (setCount === 0) continue;

      const vol = validSets.reduce(
        (acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0),
        0
      );

      if (map[meta.primaryMuscle]) {
        map[meta.primaryMuscle].primarySets += setCount;
        map[meta.primaryMuscle].score += setCount;
        map[meta.primaryMuscle].volumeKg += vol;
      }
      for (const sec of meta.secondaryMuscles) {
        if (map[sec]) {
          map[sec].secondarySets += setCount;
          map[sec].score += setCount * 0.5;
          map[sec].volumeKg += vol * 0.4;
        }
      }
    }
  }

  return map;
}

/**
 * Exporta todos os treinos para o formato CSV
 */
export function exportWorkoutsToCSV(
  workouts: WorkoutSession[],
  exerciseCatalog: Exercise[]
): string {
  const catalogById = new Map(exerciseCatalog.map((e) => [e.id, e]));
  const header = [
    'title',
    'start_time',
    'end_time',
    'description',
    'exercise_title',
    'superset_id',
    'exercise_notes',
    'set_index',
    'set_type',
    'weight_kg',
    'reps',
    'distance_km',
    'duration_seconds',
    'rpe',
  ].join(',');

  const rows: string[] = [header];
  const escapeCsv = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  for (const w of workouts) {
    for (const ex of w.exercises) {
      const exTitle = catalogById.get(ex.exerciseId)?.title || ex.exerciseId;
      ex.sets.forEach((s, idx) => {
        if (!s.completed) return;
        rows.push(
          [
            escapeCsv(w.title),
            escapeCsv(w.startTime),
            escapeCsv(w.endTime),
            escapeCsv(w.description),
            escapeCsv(exTitle),
            escapeCsv(ex.supersetId),
            escapeCsv(ex.notes),
            idx,
            escapeCsv(s.type),
            escapeCsv(s.weightKg),
            escapeCsv(s.reps),
            escapeCsv(s.distanceKm),
            escapeCsv(s.durationSeconds),
            escapeCsv(s.rpe),
          ].join(',')
        );
      });
    }
  }

  return rows.join('\n');
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}min`;
  }
  if (mins > 0) {
    return `${mins}min ${secs > 0 ? `${secs}s` : ''}`.trim();
  }
  return `${secs}s`;
}

export function formatTimerClock(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}
