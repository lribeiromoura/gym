import {
  BodyMeasurementEntry,
  EQUIPMENT_LABELS,
  Exercise,
  MUSCLE_LABELS,
  MuscleGroup,
  UserSettings,
  WorkoutSession,
  WorkoutSet,
} from '@/types/workout';
import {
  ACTIVITY_LEVEL_META,
  FoodLogEntry,
  MEAL_SLOT_LABELS,
  MEAL_SLOTS_ORDER,
  NUTRITION_GOAL_META,
  NutritionGoals,
  NutritionProfile,
} from '@/types/nutrition';
import {
  calculate1RM,
  calculateMuscleDistribution,
  convertVolumeFromKg,
  formatDuration,
  formatSetSummary,
  formatWeightValue,
  formatWeightWithUnit,
  getPreviousExerciseSets,
  getWeightUnitLabel,
} from '@/lib/calculations';
import {
  calculateBMR,
  calculateDailyNutritionSummary,
  calculateTDEE,
  calculateWeeklyNutritionStats,
  estimateWorkoutCaloriesBurned,
  getLocalDateString,
  getWorkoutSessionsOnDate,
} from '@/lib/nutrition-calculations';

export const DEFAULT_AI_REPORT_PROMPT = `Atue como um treinador de força e hipertrofia (Personal Trainer baseado em evidências). Analise o relatório do meu treino abaixo considerando meu perfil, cargas, repetições, RPE, notas técnicas e evolução em relação ao treino anterior.

Por favor, forneça:
1. Avaliação geral da sessão (volume, intensidade, seleção de exercícios e sobrecarga progressiva).
2. Pontos positivos e destaques (incluindo recordes e progressões).
3. Pontos de atenção (fadiga excessiva, quedas de desempenho, notas técnicas ou lacunas de volume).
4. Recomendações práticas de cargas, repetições ou ajustes para a próxima sessão deste treino.`;

export const DEFAULT_NUTRITION_AI_REPORT_PROMPT = `Atue como um nutricionista esportivo baseado em evidências (foco em hipertrofia, composição corporal e performance). Analise meu diário alimentar, distribuição de macronutrientes, hidratação e aderência semanal abaixo.

Por favor, forneça:
1. Avaliação do balanço calórico e adequação de proteínas (g/kg), carboidratos, gorduras e fibras para o meu objetivo.
2. Qualidade da distribuição das refeições e timing nutricional ao redor do treino.
3. Pontos de atenção (déficits/excessos, hidratação, consistência nos últimos 7 dias).
4. Sugestões práticas de substituições ou ajustes de porções para otimizar os resultados.`;

const PR_LABELS: Record<'heaviest_weight' | 'best_1rm' | 'best_set_volume', string> = {
  heaviest_weight: 'Maior Carga',
  best_1rm: 'Melhor 1RM',
  best_set_volume: 'Maior Volume na Série',
};

function formatSetTypeTag(type: WorkoutSet['type'], normalIdx: number): string {
  switch (type) {
    case 'warmup':
      return 'W (Aquecimento)';
    case 'dropset':
      return 'D (Drop-set)';
    case 'failure':
      return 'F (Falha)';
    default:
      return `Série ${normalIdx}`;
  }
}

function formatDeltaSigned(
  deltaKg: number,
  unit: 'kg' | 'lbs',
  isVolume = false
): string {
  const converted = isVolume
    ? convertVolumeFromKg(Math.abs(deltaKg), unit)
    : Number(formatWeightValue(Math.abs(deltaKg), unit).replace(',', '.')) || 0;
  const label = getWeightUnitLabel(unit);
  const formatted = isVolume
    ? converted.toLocaleString('pt-BR')
    : String(converted).replace('.', ',');
  if (deltaKg > 0) return `+${formatted} ${label}`;
  if (deltaKg < 0) return `-${formatted} ${label}`;
  return `0 ${label}`;
}

function getLatestBodyMetrics(
  measurements: BodyMeasurementEntry[]
): {
  weightKg?: number;
  weightDate?: string;
  bodyFatPct?: number;
  bodyFatDate?: string;
} {
  if (!measurements || measurements.length === 0) return {};
  const sortedDesc = [...measurements].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
  const latestWeight = sortedDesc.find(
    (m) => typeof m.weightKg === 'number' && m.weightKg > 0
  );
  const latestBf = sortedDesc.find(
    (m) => typeof m.bodyFatPct === 'number' && m.bodyFatPct > 0
  );
  return {
    weightKg: latestWeight?.weightKg,
    weightDate: latestWeight?.date,
    bodyFatPct: latestBf?.bodyFatPct,
    bodyFatDate: latestBf?.date,
  };
}

export interface WorkoutReportNutritionContext {
  foodLogs: FoodLogEntry[];
  waterByDate: Record<string, number>;
  goals: NutritionGoals;
  profile?: NutritionProfile;
}

export interface GenerateWorkoutAIReportParams {
  session: WorkoutSession;
  workoutHistory: WorkoutSession[];
  exercises: Exercise[];
  measurements: BodyMeasurementEntry[];
  settings: UserSettings;
  customPrompt?: string;
  nutrition?: WorkoutReportNutritionContext;
}

const fmtDec = (val: number): string => String(Math.round(val * 10) / 10).replace('.', ',');

/**
 * Gera um relatório estruturado em Markdown de uma sessão de treino com contexto máximo
 * (perfil do atleta, resumo, distribuição muscular, séries detalhadas, notas e comparativo
 * com a sessão anterior) pronto para avaliação por IAs externas (ChatGPT, Gemini, Claude).
 */
export function generateWorkoutAIReport({
  session,
  workoutHistory,
  exercises,
  measurements,
  settings,
  customPrompt,
  nutrition,
}: GenerateWorkoutAIReportParams): string {
  const unit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(unit);
  const catalogById = new Map(exercises.map((e) => [e.id, e]));

  const promptText =
    (customPrompt !== undefined
      ? customPrompt
      : settings?.aiReportPrompt ?? DEFAULT_AI_REPORT_PROMPT
    ).trim() || DEFAULT_AI_REPORT_PROMPT;

  const lines: string[] = [];

  // 1. Prompt do avaliador
  lines.push(promptText);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`# Relatório de Treino — ${session.title}`);
  lines.push('');

  // 2. Perfil do Atleta
  const bodyMetrics = getLatestBodyMetrics(measurements);
  lines.push('## Perfil do Atleta');
  lines.push(`- **Atleta:** ${settings?.name?.trim() || 'Usuário'}`);
  if (settings?.bio?.trim()) {
    lines.push(`- **Objetivo / Bio:** ${settings.bio.trim()}`);
  }
  lines.push(
    `- **Meta semanal:** ${settings?.weeklyWorkoutGoal || 4} treinos/semana`
  );
  if (bodyMetrics.weightKg) {
    const dateSuffix = bodyMetrics.weightDate
      ? ` (registrado em ${new Date(
          bodyMetrics.weightDate + 'T12:00:00'
        ).toLocaleDateString('pt-BR')})`
      : '';
    lines.push(
      `- **Peso corporal atual:** ${formatWeightWithUnit(
        bodyMetrics.weightKg,
        unit,
        true
      )}${dateSuffix}`
    );
  }
  if (bodyMetrics.bodyFatPct) {
    lines.push(
      `- **Percentual de gordura (BF):** ${String(bodyMetrics.bodyFatPct).replace('.', ',')}%`
    );
  }
  lines.push('');

  // 3. Resumo da Sessão
  const sessionDate = new Date(session.startTime);
  const formattedDate = Number.isNaN(sessionDate.getTime())
    ? session.startTime
    : sessionDate.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  let workingSetsCount = 0;
  let warmupSetsCount = 0;
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.type === 'warmup') warmupSetsCount += 1;
      else workingSetsCount += 1;
    }
  }

  lines.push('## Resumo da Sessão');
  lines.push(`- **Data:** ${formattedDate}`);
  lines.push(`- **Duração:** ${formatDuration(session.durationSeconds)}`);
  lines.push(
    `- **Volume total:** ${convertVolumeFromKg(
      session.totalVolumeKg,
      unit
    ).toLocaleString('pt-BR')} ${unitLabel}`
  );
  lines.push(
    `- **Séries:** ${session.totalSets} no total (${workingSetsCount} efetivas${
      warmupSetsCount > 0 ? ` + ${warmupSetsCount} de aquecimento` : ''
    })`
  );
  lines.push(`- **Recordes pessoais (PRs):** ${session.prCount}`);
  if (session.description?.trim()) {
    lines.push(`- **Notas gerais da sessão:** ${session.description.trim()}`);
  }
  lines.push('');

  // 4. Distribuição Muscular
  const muscleDist = calculateMuscleDistribution([session], exercises);
  const activeMuscles = (Object.keys(muscleDist) as MuscleGroup[])
    .filter((m) => muscleDist[m].score > 0)
    .sort((a, b) => muscleDist[b].score - muscleDist[a].score);

  if (activeMuscles.length > 0) {
    lines.push('## Músculos Trabalhados (Séries Efetivas)');
    for (const m of activeMuscles) {
      const info = muscleDist[m];
      const parts: string[] = [];
      if (info.primarySets > 0) parts.push(`${info.primarySets} diretas`);
      if (info.secondarySets > 0) parts.push(`${info.secondarySets} sinergistas`);
      lines.push(`- **${MUSCLE_LABELS[m]}:** ${parts.join(' + ')}`);
    }
    lines.push('');
  }

  // 5. Detalhamento por Exercício + Comparativo com Sessão Anterior
  lines.push('## Exercícios Executados');
  lines.push('');

  const sessionStartMs = Number.isNaN(sessionDate.getTime())
    ? null
    : sessionDate.getTime();

  session.exercises.forEach((ex, exIdx) => {
    const meta = catalogById.get(ex.exerciseId);
    const title = meta?.title || ex.exerciseId;
    const measurementType = meta?.measurementType || 'weight_reps';
    const isTimeOrDistance =
      measurementType === 'duration' || measurementType === 'distance_duration';

    const metaBits: string[] = [];
    if (meta) {
      metaBits.push(MUSCLE_LABELS[meta.primaryMuscle]);
      metaBits.push(EQUIPMENT_LABELS[meta.equipment]);
    }
    if (ex.supersetId) {
      metaBits.push(`Superset ${ex.supersetId}`);
    }
    if (ex.restTimerSeconds > 0) {
      metaBits.push(`Descanso: ${formatDuration(ex.restTimerSeconds)}`);
    }

    lines.push(`### ${exIdx + 1}. ${title}`);
    if (metaBits.length > 0) {
      lines.push(`_${metaBits.join(' • ')}_`);
    }
    if (ex.notes?.trim()) {
      lines.push(`- **Notas do exercício:** ${ex.notes.trim()}`);
    }

    let normalCounter = 0;
    let curWorkingVolumeKg = 0;
    let curBest1RM = 0;

    for (const s of ex.sets) {
      if (s.type === 'normal') normalCounter += 1;
      const typeLabel = formatSetTypeTag(s.type, normalCounter);
      const summary = formatSetSummary(s, measurementType, unit);

      const extras: string[] = [];
      if (!isTimeOrDistance && s.type !== 'warmup') {
        const vol = (s.weightKg ?? 0) * (s.reps ?? 0);
        curWorkingVolumeKg += vol;
        const est1rm = calculate1RM(s.weightKg, s.reps);
        if (est1rm > curBest1RM) curBest1RM = est1rm;
        if (est1rm > 0) {
          extras.push(`1RM est.: ${formatWeightWithUnit(est1rm, unit)}`);
        }
      }
      if (s.rpe) {
        extras.push(`RPE ${String(s.rpe).replace('.', ',')}`);
      }
      if (s.prs && s.prs.length > 0) {
        extras.push(
          `PR: ${s.prs.map((p) => PR_LABELS[p] || p).join(', ')}`
        );
      }

      const suffix = extras.length > 0 ? ` (${extras.join(' | ')})` : '';
      lines.push(`- **${typeLabel}:** ${summary}${suffix}`);
    }

    // Comparativo com a execução imediatamente anterior deste exercício
    const prevSets = getPreviousExerciseSets(
      ex.exerciseId,
      workoutHistory,
      session.id,
      sessionStartMs
    );
    const prevWorkingSets = prevSets.filter((ps) => ps.type !== 'warmup');

    if (prevWorkingSets.length === 0 && prevSets.length === 0) {
      lines.push(
        '- **Comparativo vs sessão anterior:** Primeira execução registrada no histórico.'
      );
    } else if (isTimeOrDistance) {
      const prevSummary = (prevWorkingSets.length > 0 ? prevWorkingSets : prevSets)
        .map((ps) => formatSetSummary(ps, measurementType, unit))
        .join(', ');
      lines.push(`- **Sessão anterior:** ${prevSummary}`);
    } else {
      let prevVolKg = 0;
      let prevBest1RM = 0;
      for (const ps of prevWorkingSets) {
        prevVolKg += (ps.weightKg ?? 0) * (ps.reps ?? 0);
        const est = calculate1RM(ps.weightKg, ps.reps);
        if (est > prevBest1RM) prevBest1RM = est;
      }

      const prevSummary = prevWorkingSets
        .map((ps) => formatSetSummary(ps, measurementType, unit))
        .join(', ');
      const volDelta = curWorkingVolumeKg - prevVolKg;
      const rmDelta = Math.round((curBest1RM - prevBest1RM) * 10) / 10;

      const deltaParts: string[] = [];
      if (prevVolKg > 0 || curWorkingVolumeKg > 0) {
        const pct =
          prevVolKg > 0
            ? ` (${volDelta >= 0 ? '+' : ''}${Math.round(
                (volDelta / prevVolKg) * 100
              )}%)`
            : '';
        deltaParts.push(
          `Volume: ${formatDeltaSigned(volDelta, unit, true)}${pct}`
        );
      }
      if (prevBest1RM > 0 || curBest1RM > 0) {
        deltaParts.push(`Melhor 1RM: ${formatDeltaSigned(rmDelta, unit, false)}`);
      }

      lines.push(
        `- **Comparativo vs sessão anterior:** ${
          deltaParts.length > 0 ? deltaParts.join(' | ') : 'Sem alteração'
        }`
      );
      if (prevSummary) {
        lines.push(`  - _Séries anteriores:_ ${prevSummary}`);
      }
    }

    lines.push('');
  });

  // 6. Bloco opcional: Nutrição & Hidratação (Dia do Treino + Média 7 Dias)
  if (nutrition) {
    const workoutDateStr = Number.isNaN(sessionDate.getTime())
      ? session.startTime.slice(0, 10)
      : getLocalDateString(sessionDate);

    const refWeightKg =
      bodyMetrics.weightKg || nutrition.profile?.weightKg || 75;
    const daySessions = getWorkoutSessionsOnDate(
      workoutHistory.some((w) => w.id === session.id)
        ? workoutHistory
        : [...workoutHistory, session],
      workoutDateStr
    );
    const workoutBonusKcal = estimateWorkoutCaloriesBurned(
      daySessions,
      refWeightKg
    );
    const daySummary = calculateDailyNutritionSummary(
      workoutDateStr,
      nutrition.foodLogs,
      nutrition.waterByDate[workoutDateStr] || 0,
      nutrition.goals,
      workoutBonusKcal
    );
    const weeklyStats = calculateWeeklyNutritionStats(
      workoutDateStr,
      nutrition.foodLogs,
      nutrition.waterByDate,
      nutrition.goals
    );

    const hasNutritionData =
      daySummary.entryCount > 0 ||
      daySummary.waterMl > 0 ||
      weeklyStats.loggedDaysCount > 0 ||
      weeklyStats.waterLoggedDaysCount > 0;

    if (hasNutritionData) {
      lines.push('## Nutrição & Hidratação (Dia do Treino + Média 7 Dias)');
      if (daySummary.entryCount > 0) {
        const pPerKg = refWeightKg > 0 ? daySummary.proteinG / refWeightKg : 0;
        const cPerKg = refWeightKg > 0 ? daySummary.carbsG / refWeightKg : 0;
        const fPerKg = refWeightKg > 0 ? daySummary.fatG / refWeightKg : 0;
        lines.push(
          `- **Calorias no dia (${workoutDateStr}):** ${daySummary.calories.toLocaleString('pt-BR')} / ${daySummary.effectiveTargetCalories.toLocaleString('pt-BR')} kcal (${daySummary.adherencePct.calories}%)`
        );
        lines.push(
          `- **Proteínas:** ${fmtDec(daySummary.proteinG)}g / ${nutrition.goals.targetProteinG}g (${fmtDec(pPerKg)} g/kg)`
        );
        lines.push(
          `- **Carboidratos:** ${fmtDec(daySummary.carbsG)}g / ${nutrition.goals.targetCarbsG}g (${fmtDec(cPerKg)} g/kg)`
        );
        lines.push(
          `- **Gorduras:** ${fmtDec(daySummary.fatG)}g / ${nutrition.goals.targetFatG}g (${fmtDec(fPerKg)} g/kg)`
        );
        if (daySummary.fiberG > 0) {
          lines.push(
            `- **Fibras:** ${fmtDec(daySummary.fiberG)}g / ${nutrition.goals.targetFiberG}g`
          );
        }
      } else {
        lines.push(`- **Diário alimentar (${workoutDateStr}):** Sem refeições registradas neste dia.`);
      }

      lines.push(
        `- **Hidratação no dia:** ${(daySummary.waterMl / 1000).toFixed(2).replace('.', ',')} L (${daySummary.waterMl} ml / ${nutrition.goals.targetWaterMl} ml — ${daySummary.adherencePct.water}%)`
      );

      if (weeklyStats.loggedDaysCount > 0) {
        lines.push(
          `- **Média dos últimos 7 dias (${weeklyStats.loggedDaysCount} dias registrados):** ${weeklyStats.avgCalories.toLocaleString('pt-BR')} kcal/dia • P: ${fmtDec(weeklyStats.avgProteinG)}g • C: ${fmtDec(weeklyStats.avgCarbsG)}g • G: ${fmtDec(weeklyStats.avgFatG)}g`
        );
        lines.push(
          `- **Aderência semanal (±10% da meta calórica):** ${weeklyStats.daysWithinGoal} de ${weeklyStats.loggedDaysCount} dias registrados dentro da meta`
        );
      }
      if (weeklyStats.waterLoggedDaysCount > 0) {
        lines.push(
          `- **Média de hidratação (7 dias):** ${weeklyStats.avgWaterMl} ml/dia`
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n').trim();
}

export interface GenerateNutritionAIReportParams {
  date: string;
  foodLogs: FoodLogEntry[];
  waterByDate: Record<string, number>;
  profile: NutritionProfile;
  goals: NutritionGoals;
  measurements: BodyMeasurementEntry[];
  workoutHistory: WorkoutSession[];
  settings: UserSettings;
  customPrompt?: string;
}

/**
 * Gera um relatório nutricional completo em Markdown a partir da aba Nutrição
 * (diário por refeição, perfil TMB/TDEE, metas de macros, hidratação e aderência semanal).
 */
export function generateNutritionAIReport({
  date,
  foodLogs,
  waterByDate,
  profile,
  goals,
  measurements,
  workoutHistory,
  settings,
  customPrompt,
}: GenerateNutritionAIReportParams): string {
  const unit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const bodyMetrics = getLatestBodyMetrics(measurements);
  const weightKg = bodyMetrics.weightKg || profile.weightKg || 75;

  const daySessions = getWorkoutSessionsOnDate(workoutHistory, date);
  const workoutBonusKcal = estimateWorkoutCaloriesBurned(daySessions, weightKg);
  const daySummary = calculateDailyNutritionSummary(
    date,
    foodLogs,
    waterByDate[date] || 0,
    goals,
    workoutBonusKcal
  );
  const weeklyStats = calculateWeeklyNutritionStats(
    date,
    foodLogs,
    waterByDate,
    goals
  );

  const bmr = calculateBMR(profile);
  const tdee = calculateTDEE(profile);
  const activityMeta =
    ACTIVITY_LEVEL_META[profile.activityLevel] ?? ACTIVITY_LEVEL_META.moderate;
  const goalMeta =
    NUTRITION_GOAL_META[profile.goalType] ?? NUTRITION_GOAL_META.maintain;

  const promptText =
    (customPrompt !== undefined
      ? customPrompt
      : DEFAULT_NUTRITION_AI_REPORT_PROMPT
    ).trim() || DEFAULT_NUTRITION_AI_REPORT_PROMPT;

  const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString(
    'pt-BR',
    {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  );

  const lines: string[] = [];
  lines.push(promptText);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`# Relatório Nutricional — ${formattedDate}`);
  lines.push('');

  lines.push('## Perfil & Metas Diárias (TMB / TDEE)');
  lines.push(`- **Atleta:** ${settings?.name?.trim() || 'Usuário'}`);
  if (settings?.bio?.trim()) {
    lines.push(`- **Objetivo / Bio:** ${settings.bio.trim()}`);
  }
  lines.push(
    `- **Dados físicos:** ${profile.sex === 'female' ? 'Feminino' : 'Masculino'}, ${profile.age} anos, ${profile.heightCm} cm, ${formatWeightWithUnit(weightKg, unit, true)}${
      bodyMetrics.bodyFatPct
        ? ` (BF: ${String(bodyMetrics.bodyFatPct).replace('.', ',')}%)`
        : ''
    }`
  );
  lines.push(
    `- **Nível de atividade:** ${activityMeta.label} (${activityMeta.multiplier}x) • **Objetivo dietético:** ${goalMeta.label}`
  );
  lines.push(
    `- **TMB (Mifflin-St Jeor):** ${bmr.toLocaleString('pt-BR')} kcal/dia • **TDEE:** ${tdee.toLocaleString('pt-BR')} kcal/dia`
  );
  lines.push(
    `- **Metas diárias:** ${goals.targetCalories.toLocaleString('pt-BR')} kcal • Proteína: ${goals.targetProteinG}g • Carboidratos: ${goals.targetCarbsG}g • Gorduras: ${goals.targetFatG}g • Fibras: ${goals.targetFiberG}g • Água: ${goals.targetWaterMl} ml${
      goals.customOverride ? ' _(editadas manualmente)_' : ''
    }`
  );
  lines.push('');

  lines.push('## Resumo do Dia');
  const pPerKg = weightKg > 0 ? daySummary.proteinG / weightKg : 0;
  const cPerKg = weightKg > 0 ? daySummary.carbsG / weightKg : 0;
  const fPerKg = weightKg > 0 ? daySummary.fatG / weightKg : 0;
  lines.push(
    `- **Calorias consumidas:** ${daySummary.calories.toLocaleString('pt-BR')} / ${daySummary.effectiveTargetCalories.toLocaleString('pt-BR')} kcal (${daySummary.adherencePct.calories}% — ${
      daySummary.remainingCalories >= 0
        ? `restam ${daySummary.remainingCalories} kcal`
        : `excedeu ${Math.abs(daySummary.remainingCalories)} kcal`
    })`
  );
  if (daySessions.length > 0) {
    lines.push(
      `- **Treinos registrados no dia:** ${daySessions.map((s) => `${s.title} (${formatDuration(s.durationSeconds)})`).join(', ')} — gasto estimado: ~${workoutBonusKcal} kcal${
        goals.includeWorkoutCalories
          ? ' (somado à meta calórica)'
          : ' (não somado à meta calórica)'
      }`
    );
  }
  lines.push(
    `- **Proteínas:** ${fmtDec(daySummary.proteinG)}g / ${goals.targetProteinG}g (${daySummary.adherencePct.protein}% • ${fmtDec(pPerKg)} g/kg)`
  );
  lines.push(
    `- **Carboidratos:** ${fmtDec(daySummary.carbsG)}g / ${goals.targetCarbsG}g (${daySummary.adherencePct.carbs}% • ${fmtDec(cPerKg)} g/kg)`
  );
  lines.push(
    `- **Gorduras:** ${fmtDec(daySummary.fatG)}g / ${goals.targetFatG}g (${daySummary.adherencePct.fat}% • ${fmtDec(fPerKg)} g/kg)`
  );
  lines.push(
    `- **Fibras:** ${fmtDec(daySummary.fiberG)}g / ${goals.targetFiberG}g (${daySummary.adherencePct.fiber}%)`
  );
  lines.push(
    `- **Hidratação:** ${daySummary.waterMl} ml / ${goals.targetWaterMl} ml (${daySummary.adherencePct.water}%)`
  );
  lines.push('');

  lines.push('## Diário Alimentar por Refeição');
  lines.push('');
  for (const slot of MEAL_SLOTS_ORDER) {
    const bucket = daySummary.byMealSlot[slot];
    lines.push(
      `### ${MEAL_SLOT_LABELS[slot]} (${bucket.calories} kcal • P: ${fmtDec(bucket.proteinG)}g | C: ${fmtDec(bucket.carbsG)}g | G: ${fmtDec(bucket.fatG)}g)`
    );
    if (bucket.entries.length === 0) {
      lines.push('- _Nenhum alimento registrado._');
    } else {
      for (const item of bucket.entries) {
        const portionDesc =
          item.measureMode === 'unit' && item.unitLabel
            ? `${fmtDec(item.quantity)} × ${item.unitLabel} (${fmtDec(item.totalGrams)}g)`
            : `${fmtDec(item.totalGrams)}g`;
        const brandSuffix = item.foodBrand ? ` (${item.foodBrand})` : '';
        lines.push(
          `- **${item.foodName}${brandSuffix}** — ${portionDesc}: ${item.calories} kcal (P: ${fmtDec(item.proteinG)}g | C: ${fmtDec(item.carbsG)}g | G: ${fmtDec(item.fatG)}g)`
        );
      }
    }
    lines.push('');
  }

  lines.push('## Aderência dos Últimos 7 Dias');
  if (weeklyStats.loggedDaysCount === 0 && weeklyStats.waterLoggedDaysCount === 0) {
    lines.push('- _Nenhum registro nos últimos 7 dias._');
  } else {
    if (weeklyStats.loggedDaysCount > 0) {
      lines.push(
        `- **Média diária (${weeklyStats.loggedDaysCount}/7 dias registrados):** ${weeklyStats.avgCalories.toLocaleString('pt-BR')} kcal • P: ${fmtDec(weeklyStats.avgProteinG)}g • C: ${fmtDec(weeklyStats.avgCarbsG)}g • G: ${fmtDec(weeklyStats.avgFatG)}g`
      );
      lines.push(
        `- **Dias dentro da meta (±10%):** ${weeklyStats.daysWithinGoal} de ${weeklyStats.loggedDaysCount}`
      );
    }
    if (weeklyStats.waterLoggedDaysCount > 0) {
      lines.push(
        `- **Média de água:** ${weeklyStats.avgWaterMl} ml/dia (${weeklyStats.waterLoggedDaysCount}/7 dias)`
      );
    }
    lines.push('');
    for (const day of weeklyStats.days) {
      const status = day.hasFoodLogs
        ? `${day.calories} kcal (P ${fmtDec(day.proteinG)}g / C ${fmtDec(day.carbsG)}g / G ${fmtDec(day.fatG)}g)${day.withinGoal ? ' ✓' : ''}`
        : 'sem registro';
      const waterInfo = day.waterMl > 0 ? ` • Água: ${day.waterMl} ml` : '';
      lines.push(`- **${day.dayLabel} (${day.date}):** ${status}${waterInfo}`);
    }
  }

  return lines.join('\n').trim();
}

export async function copyReportText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback para execCommand
    }
  }
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch {
      return false;
    }
  }
  return false;
}

export async function shareOrCopyReportText(params: {
  title: string;
  text: string;
}): Promise<'shared' | 'copied' | 'cancelled'> {
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share({
        title: params.title,
        text: params.text,
      });
      return 'shared';
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        return 'cancelled';
      }
      // Outros erros: fallback para área de transferência
    }
  }

  await copyReportText(params.text);
  return 'copied';
}
