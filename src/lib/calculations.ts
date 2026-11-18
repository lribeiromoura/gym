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

const PLATE_COLOR_MAP: Record<number, string> = {
  25: '#EF4444',
  20: '#2563EB',
  15: '#EAB308',
  10: '#16A34A',
  5: '#F8FAFC',
  2.5: '#94A3B8',
  1.25: '#64748B',
};

export interface PlatesPerSideBreakdown {
  totalWeightKg: number;
  barWeightKg: number;
  weightPerSideKg: number;
  achievedTotalKg: number;
  achievedPerSideKg: number;
  remainderPerSideKg: number;
  platesPerSide: { weight: number; count: number; color: string }[];
  flatPlates: number[];
}

export function calculatePlatesPerSide(
  totalWeightKg: number,
  barWeightKg: number = 20,
  availablePlates: number[] = [25, 20, 15, 10, 5, 2.5, 1.25]
): PlatesPerSideBreakdown {
  const safeTotal = Number.isFinite(totalWeightKg) ? Math.max(0, totalWeightKg) : 0;
  const safeBar = Number.isFinite(barWeightKg) ? Math.max(0, barWeightKg) : 20;

  if (safeTotal <= safeBar) {
    return {
      totalWeightKg: safeTotal,
      barWeightKg: safeBar,
      weightPerSideKg: 0,
      achievedTotalKg: safeBar,
      achievedPerSideKg: 0,
      remainderPerSideKg: 0,
      platesPerSide: [],
      flatPlates: [],
    };
  }

  const weightPerSideKg = Math.round(((safeTotal - safeBar) / 2) * 100) / 100;
  let remaining = weightPerSideKg;
  const sortedPlates = [...availablePlates]
    .filter((p) => Number.isFinite(p) && p > 0)
    .sort((a, b) => b - a);

  const platesPerSide: { weight: number; count: number; color: string }[] = [];
  const flatPlates: number[] = [];

  for (const w of sortedPlates) {
    const count = Math.floor((remaining + 0.001) / w);
    if (count > 0) {
      const color = PLATE_COLOR_MAP[w] || '#3B82F6';
      platesPerSide.push({ weight: w, count, color });
      for (let i = 0; i < count; i += 1) {
        flatPlates.push(w);
      }
      remaining = Math.round((remaining - count * w) * 100) / 100;
    }
  }

  const achievedPerSideKg =
    Math.round(
      platesPerSide.reduce((acc, p) => acc + p.weight * p.count, 0) * 100
    ) / 100;
  const achievedTotalKg =
    Math.round((safeBar + achievedPerSideKg * 2) * 100) / 100;
  const remainderPerSideKg =
    Math.round(Math.max(0, weightPerSideKg - achievedPerSideKg) * 100) / 100;

  return {
    totalWeightKg: safeTotal,
    barWeightKg: safeBar,
    weightPerSideKg,
    achievedTotalKg,
    achievedPerSideKg,
    remainderPerSideKg,
    platesPerSide,
    flatPlates,
  };
}

/**
 * Gera automaticamente as 2 séries de aquecimento rápido (1×12 @ 50% e 1×6 @ 75%
 * da carga da primeira série normal, arredondando para múltiplos de 2,5 kg)
 */
export function buildAutoWarmupSets(
  firstNormalWeightKg: number
): { weightKg: number; reps: number; pct: number }[] {
  const safeBase =
    Number.isFinite(firstNormalWeightKg) && firstNormalWeightKg > 0
      ? firstNormalWeightKg
      : 20;
  const roundTo2_5 = (v: number) => Math.max(2.5, Math.round(v / 2.5) * 2.5);

  return [
    {
      pct: 50,
      weightKg: roundTo2_5(safeBase * 0.5),
      reps: 12,
    },
    {
      pct: 75,
      weightKg: roundTo2_5(safeBase * 0.75),
      reps: 6,
    },
  ];
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

export interface WeeklyDayStatus {
  label: string;
  dateKey: string;
  trained: boolean;
  isToday: boolean;
}

export interface WeeklyStreakStats {
  workoutsThisWeek: number;
  weeklyGoal: number;
  consecutiveWeeks: number;
  days: WeeklyDayStatus[];
}

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayStart(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function calculateWeeklyStreakStats(
  workoutHistory: WorkoutSession[],
  weeklyGoal: number = 4,
  referenceDate: Date = new Date()
): WeeklyStreakStats {
  const goal = Math.max(1, Math.round(weeklyGoal || 4));
  const todayKey = toLocalDateKey(referenceDate);
  const currentMonday = getMondayStart(referenceDate);

  const countWorkoutsInWeek = (monday: Date): number => {
    const startMs = monday.getTime();
    const endDate = new Date(monday);
    endDate.setDate(endDate.getDate() + 7);
    const endMs = endDate.getTime();
    let count = 0;
    for (const w of workoutHistory) {
      const t = new Date(w.startTime).getTime();
      if (t >= startMs && t < endMs) {
        count += 1;
      }
    }
    return count;
  };

  const trainedDateKeys = new Set<string>();
  for (const w of workoutHistory) {
    const dt = new Date(w.startTime);
    if (!Number.isNaN(dt.getTime())) {
      trainedDateKeys.add(toLocalDateKey(dt));
    }
  }

  const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const days: WeeklyDayStatus[] = dayLabels.map((label, idx) => {
    const d = new Date(currentMonday);
    d.setDate(d.getDate() + idx);
    const key = toLocalDateKey(d);
    return {
      label,
      dateKey: key,
      trained: trainedDateKeys.has(key),
      isToday: key === todayKey,
    };
  });

  const workoutsThisWeek = countWorkoutsInWeek(currentMonday);

  let consecutiveWeeks = 0;
  if (workoutsThisWeek >= goal) {
    consecutiveWeeks += 1;
  }

  // Checa semanas anteriores consecutivas
  for (let wIdx = 1; wIdx <= 52; wIdx += 1) {
    const pastMonday = new Date(currentMonday);
    pastMonday.setDate(pastMonday.getDate() - wIdx * 7);
    const count = countWorkoutsInWeek(pastMonday);
    if (count >= goal) {
      consecutiveWeeks += 1;
    } else {
      break;
    }
  }

  return {
    workoutsThisWeek,
    weeklyGoal: goal,
    consecutiveWeeks,
    days,
  };
}

export interface RoutineLastTrainedInfo {
  lastSession: WorkoutSession | null;
  daysAgo: number | null;
  label: string;
  timestamp: number;
}

export function getRoutineLastTrainedInfo(
  routine: { id: string; title: string },
  workoutHistory: WorkoutSession[],
  referenceDate: Date = new Date()
): RoutineLastTrainedInfo {
  const normTitle = routine.title.trim().toLowerCase();
  let latest: WorkoutSession | null = null;
  let latestTime = 0;

  for (const w of workoutHistory) {
    const matchesId = w.routineId && w.routineId === routine.id;
    const matchesTitle = w.title.trim().toLowerCase() === normTitle;
    if (matchesId || matchesTitle) {
      const t = new Date(w.startTime).getTime();
      if (t > latestTime) {
        latestTime = t;
        latest = w;
      }
    }
  }

  if (!latest || latestTime === 0) {
    return {
      lastSession: null,
      daysAgo: null,
      label: 'Ainda não realizado',
      timestamp: 0,
    };
  }

  const refMidnight = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  ).getTime();
  const lastDate = new Date(latest.startTime);
  const lastMidnight = new Date(
    lastDate.getFullYear(),
    lastDate.getMonth(),
    lastDate.getDate()
  ).getTime();

  const daysAgo = Math.max(
    0,
    Math.round((refMidnight - lastMidnight) / 86_400_000)
  );

  let label = '';
  if (daysAgo === 0) {
    label = 'Concluído hoje';
  } else if (daysAgo === 1) {
    label = 'Concluído ontem';
  } else {
    label = `Última vez: há ${daysAgo} dias`;
  }

  return {
    lastSession: latest,
    daysAgo,
    label,
    timestamp: latestTime,
  };
}
