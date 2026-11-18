import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  buildAutoWarmupSets,
  calculate1RM,
  calculateMuscleDistribution,
  calculatePlates,
  calculatePlatesPerSide,
  calculateWeeklyStreakStats,
  evaluateWorkoutPRs,
  exportWorkoutsToCSV,
  generateWarmupSets,
  getRoutineLastTrainedInfo,
} from './calculations';
import { EXERCISES_SEED } from '@/data/exercises-seed';
import { WorkoutSession } from '@/types/workout';
import {
  decodeShareToken,
  encodeFolderShareToken,
  encodeRoutineShareToken,
} from './share';
import {
  convertExerciseDBItem,
  translateExerciseNamePtBr,
  translatePtQueryToEn,
} from './exercisedb';
import {
  formatPtBrNumber,
  parseDecimalString,
  sanitizeDecimalString,
  sanitizeIntegerString,
} from '@/components/ui/NumericInputs';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { ActiveWorkoutDrawer } from '@/components/workout/ActiveWorkoutDrawer';
import { RoutinesView } from '@/components/routines/RoutinesView';
import { ExercisesView } from '@/components/exercises/ExercisesView';
import { ExerciseDetailModal } from '@/components/exercises/ExerciseDetailModal';
import { SocialFeedView } from '@/components/feed/SocialFeedView';
import { ProfileAnalyticsView } from '@/components/profile/ProfileAnalyticsView';
import { BodyHeatmapSVG } from '@/components/analytics/BodyHeatmapSVG';

const SAMPLE_HISTORY: WorkoutSession[] = [
  {
    id: 's-1',
    title: 'Treino A',
    startTime: '2026-11-10T18:00:00Z',
    endTime: '2026-11-10T19:00:00Z',
    durationSeconds: 3600,
    description: '',
    totalVolumeKg: 1440,
    totalSets: 2,
    prCount: 1,
    exercises: [
      {
        id: 'we-1',
        exerciseId: 'ex-bench-press-barbell',
        supersetId: null,
        restTimerSeconds: 90,
        notes: '',
        sets: [
          {
            id: 'ws-1',
            type: 'normal',
            weightKg: 90,
            reps: 8,
            completed: true,
          },
          {
            id: 'ws-2',
            type: 'normal',
            weightKg: 90,
            reps: 8,
            completed: true,
          },
        ],
      },
    ],
  },
];

describe('Motores de Cálculo IronPulse', () => {
  it('calcula 1RM estimado com precisão pela fórmula de Epley', () => {
    expect(calculate1RM(100, 1)).toBe(100);
    expect(calculate1RM(100, 10)).toBe(133.3);
    expect(calculate1RM(0, 10)).toBe(0);
  });

  it('calcula anilhas por lado da barra olímpica de 20kg exatamente', () => {
    const breakdown = calculatePlates(100, 20);
    expect(breakdown.achievedWeight).toBe(100);
    expect(breakdown.platesPerSide).toEqual([
      { weight: 25, count: 1, color: '#EF4444' },
      { weight: 15, count: 1, color: '#EAB308' },
    ]);
  });

  it('gera séries progressivas de aquecimento (Warm-up sets)', () => {
    const warmups = generateWarmupSets(100, 20);
    expect(warmups.length).toBe(4);
    expect(warmups[0].weightKg).toBe(20);
    expect(warmups[1].weightKg).toBe(50);
    expect(warmups[2].weightKg).toBe(70);
    expect(warmups[3].weightKg).toBe(85);
  });

  it('detecta novos Recordes Pessoais (PRs) ao superar peso, 1RM e volume de série', () => {
    const result = evaluateWorkoutPRs(
      [
        {
          id: 'test-ex',
          exerciseId: 'ex-bench-press-barbell',
          supersetId: null,
          restTimerSeconds: 90,
          notes: '',
          sets: [
            {
              id: 's1',
              type: 'normal',
              weightKg: 100,
              reps: 8,
              completed: true,
            },
          ],
        },
      ],
      SAMPLE_HISTORY
    );

    expect(result.totalPRs).toBe(3);
    expect(result.annotatedExercises[0].sets[0].prs).toContain('heaviest_weight');
    expect(result.annotatedExercises[0].sets[0].prs).toContain('best_1rm');
    expect(result.annotatedExercises[0].sets[0].prs).toContain('best_set_volume');
  });

  it('calcula distribuição muscular primária e secundária para o Heatmap SVG', () => {
    const dist = calculateMuscleDistribution(SAMPLE_HISTORY, EXERCISES_SEED);
    expect(dist.chest.primarySets).toBe(2);
    expect(dist.triceps.secondarySets).toBe(2);
  });

  it('exporta histórico para o formato CSV', () => {
    const csv = exportWorkoutsToCSV(SAMPLE_HISTORY, EXERCISES_SEED);
    expect(csv).toContain('title,start_time,end_time,description,exercise_title');
    expect(csv).toContain('Supino Reto (Barra)');
  });

  it('codifica e decodifica um link compartilhado de treino e pasta com exercícios customizados', () => {
    const customExercise = {
      id: 'ex-custom-123',
      title: 'Supino Guilhotina Custom',
      primaryMuscle: 'chest' as const,
      secondaryMuscles: ['triceps' as const],
      equipment: 'barbell' as const,
      measurementType: 'weight_reps' as const,
      instructions: ['Desça na linha clavicular'],
      isCustom: true,
    };

    const sampleRoutine = {
      id: 'r-1',
      folderId: 'f-1',
      title: 'Push Day Hipertrofia',
      description: 'Foco em peitoral superior',
      updatedAt: '2026-11-12T10:00:00Z',
      exercises: [
        {
          id: 're-1',
          exerciseId: 'ex-custom-123',
          supersetId: null,
          restTimerSeconds: 90,
          notes: 'Segurar 1s embaixo',
          sets: [
            {
              id: 's-1',
              type: 'normal' as const,
              weightKg: 40,
              reps: 12,
              completed: false,
            },
          ],
        },
      ],
    };

    // 1. Compartilhamento de Rotina
    const routineToken = encodeRoutineShareToken(
      sampleRoutine,
      [...EXERCISES_SEED, customExercise],
      'Leandro'
    );
    const decodedRoutine = decodeShareToken(routineToken);
    expect(decodedRoutine).not.toBeNull();
    expect(decodedRoutine?.k).toBe('routine');
    expect(decodedRoutine?.by).toBe('Leandro');
    expect(decodedRoutine?.r[0].t).toBe('Push Day Hipertrofia');
    expect(decodedRoutine?.r[0].ex[0].s[0].w).toBe(40);
    expect(decodedRoutine?.ce?.[0].t).toBe('Supino Guilhotina Custom');

    // 2. Compartilhamento de Pasta
    const folderToken = encodeFolderShareToken(
      { id: 'f-1', name: 'Divisão ABC', order: 1 },
      [sampleRoutine],
      [...EXERCISES_SEED, customExercise],
      'Leandro'
    );
    const decodedFolder = decodeShareToken(folderToken);
    expect(decodedFolder?.k).toBe('folder');
    expect(decodedFolder?.fn).toBe('Divisão ABC');
    expect(decodedFolder?.r.length).toBe(1);
  });

  it('traduz exercícios e buscas da ExerciseDB para Português (pt-BR) com GIF e anatomia', () => {
    expect(translateExerciseNamePtBr('barbell incline bench press')).toBe(
      'Supino Inclinado (Barra)'
    );
    expect(translateExerciseNamePtBr('cable rope triceps pushdown')).toBe(
      'Tríceps Pulley Corda (Polia)'
    );
    expect(translatePtQueryToEn('supino inclinado')).toBe(
      'incline bench press'
    );
    expect(translatePtQueryToEn('elevação lateral')).toBe('lateral raise');

    const converted = convertExerciseDBItem({
      exerciseId: 'EIeI8Vf',
      name: 'barbell bench press',
      gifUrl: 'https://static.exercisedb.dev/media/EIeI8Vf.gif',
      bodyParts: ['chest'],
      equipments: ['barbell'],
      targetMuscles: ['pectorals'],
      secondaryMuscles: ['triceps', 'deltoids'],
      instructions: [
        'Step:1 Settle onto a bench with your feet planted.',
        'Step:2 Hold the barbell with palms facing down.',
      ],
    });

    expect(converted.id).toBe('edb-EIeI8Vf');
    expect(converted.title).toBe('Supino Reto (Barra)');
    expect(converted.primaryMuscle).toBe('chest');
    expect(converted.equipment).toBe('barbell');
    expect(converted.secondaryMuscles).toContain('triceps');
    expect(converted.secondaryMuscles).toContain('shoulders');
    expect(converted.gifUrl).toBe(
      'https://static.exercisedb.dev/media/EIeI8Vf.gif'
    );
    expect(converted.instructions[0]).not.toContain('Step:1');
  });

  it('aceita e converte pesos decimais com vírgula ("15,5" e "9,1") e bloqueia caracteres não numéricos', () => {
    expect(sanitizeDecimalString('15,5')).toBe('15,5');
    expect(sanitizeDecimalString('9,1')).toBe('9,1');
    expect(sanitizeDecimalString('15.5')).toBe('15,5');
    expect(sanitizeDecimalString('abc15,5kg')).toBe('15,5');
    expect(sanitizeDecimalString('15,,5,2')).toBe('15,52');

    expect(parseDecimalString('15,5')).toBe(15.5);
    expect(parseDecimalString('9,1')).toBe(9.1);
    expect(parseDecimalString('15,')).toBe(15);
    expect(formatPtBrNumber(15.5)).toBe('15,5');
    expect(formatPtBrNumber(9.1)).toBe('9,1');

    expect(sanitizeIntegerString('12reps')).toBe('12');
    expect(sanitizeIntegerString('15,5')).toBe('155');
  });

  it('calculatePlatesPerSide calcula anilhas por lado com barra padrão, customizada e casos de borda', () => {
    // 70 kg com barra de 20 kg -> 25 kg de cada lado (1x 25kg)
    const res70 = calculatePlatesPerSide(70, 20);
    expect(res70.weightPerSideKg).toBe(25);
    expect(res70.achievedTotalKg).toBe(70);
    expect(res70.flatPlates).toEqual([25]);

    // 62,5 kg com barra de 20 kg -> 21,25 kg de cada lado (1x 20kg + 1x 1,25kg)
    const res62_5 = calculatePlatesPerSide(62.5, 20);
    expect(res62_5.weightPerSideKg).toBe(21.25);
    expect(res62_5.achievedPerSideKg).toBe(21.25);
    expect(res62_5.achievedTotalKg).toBe(62.5);
    expect(res62_5.flatPlates).toEqual([20, 1.25]);

    // Carga menor ou igual à barra -> 0 kg de cada lado
    const resBarOnly = calculatePlatesPerSide(20, 20);
    expect(resBarOnly.weightPerSideKg).toBe(0);
    expect(resBarOnly.platesPerSide).toEqual([]);
    expect(resBarOnly.achievedTotalKg).toBe(20);

    // Anilhas customizadas (academia sem anilha de 25kg e 15kg)
    const resCustom = calculatePlatesPerSide(100, 20, [20, 10, 5, 2.5]);
    expect(resCustom.weightPerSideKg).toBe(40);
    expect(resCustom.flatPlates).toEqual([20, 20]);
  });

  it('buildAutoWarmupSets gera 2 séries de aquecimento (50% x 12 e 75% x 6) arredondadas para 2,5 kg', () => {
    const warmups80 = buildAutoWarmupSets(80);
    expect(warmups80).toEqual([
      { pct: 50, weightKg: 40, reps: 12 },
      { pct: 75, weightKg: 60, reps: 6 },
    ]);

    const warmups65 = buildAutoWarmupSets(65);
    expect(warmups65).toEqual([
      { pct: 50, weightKg: 32.5, reps: 12 },
      { pct: 75, weightKg: 50, reps: 6 },
    ]);
  });

  it('calculateWeeklyStreakStats e getRoutineLastTrainedInfo calculam meta semanal, streak e última execução', () => {
    const refDate = new Date('2026-11-18T15:00:00');
    const history: WorkoutSession[] = [
      {
        ...SAMPLE_HISTORY[0],
        id: 'w-today',
        routineId: 'r-push',
        title: 'Treino A — Push',
        startTime: '2026-11-17T18:00:00',
      },
      {
        ...SAMPLE_HISTORY[0],
        id: 'w-mon',
        routineId: 'r-pull',
        title: 'Treino B — Pull',
        startTime: '2026-11-16T18:00:00',
      },
      {
        ...SAMPLE_HISTORY[0],
        id: 'w-legs',
        routineId: 'r-legs',
        title: 'Treino C — Legs',
        startTime: '2026-11-13T18:00:00',
      },
    ];

    const streak = calculateWeeklyStreakStats(history, 2, refDate);
    expect(streak.workoutsThisWeek).toBe(2);
    expect(streak.weeklyGoal).toBe(2);
    expect(streak.consecutiveWeeks).toBeGreaterThanOrEqual(1);
    expect(streak.days.length).toBe(7);

    const pushInfo = getRoutineLastTrainedInfo(
      { id: 'r-push', title: 'Treino A — Push' },
      history,
      refDate
    );
    expect(pushInfo.daysAgo).toBe(1);
    expect(pushInfo.label).toBe('Concluído ontem');

    const legsInfo = getRoutineLastTrainedInfo(
      { id: 'r-legs', title: 'Treino C — Legs' },
      history,
      refDate
    );
    expect(legsInfo.daysAgo).toBe(5);
    expect(legsInfo.label).toBe('Última vez: há 5 dias');
  });

  it('useWorkoutStore: gera aquecimento no topo do exercício e suporta marcar séries preenchidas ao concluir', () => {
    const store = useWorkoutStore.getState();
    store.clearAllData();
    store.startEmptyWorkout('Teste de Sessão');
    store.addExerciseToActiveWorkout('ex-bench-press-barbell');

    const active1 = useWorkoutStore.getState().activeWorkout;
    expect(active1).not.toBeNull();
    const weId = active1!.exercises[0].id;
    const firstSetId = active1!.exercises[0].sets[0].id;

    // Define 80 kg x 10 na 1ª série normal
    store.updateActiveSet(weId, firstSetId, { weightKg: 80, reps: 10 });

    // Gera 2 séries de aquecimento (50% = 40kg x 12, 75% = 60kg x 6) no topo
    store.generateWarmupSetsForActiveExercise(weId);
    const activeAfterWarmup = useWorkoutStore.getState().activeWorkout!;
    expect(activeAfterWarmup.exercises[0].sets.length).toBe(5);
    expect(activeAfterWarmup.exercises[0].sets[0]).toMatchObject({
      type: 'warmup',
      weightKg: 40,
      reps: 12,
      completed: false,
    });
    expect(activeAfterWarmup.exercises[0].sets[1]).toMatchObject({
      type: 'warmup',
      weightKg: 60,
      reps: 6,
      completed: false,
    });

    // Se chamado novamente após alterar a carga da 1ª série normal para 100 kg, atualiza sem duplicar aquecimentos não concluídos
    const normalSetAfterFirstWarmup =
      useWorkoutStore
        .getState()
        .activeWorkout!.exercises[0].sets.find((s) => s.type === 'normal')!;
    store.updateActiveSet(weId, normalSetAfterFirstWarmup.id, {
      weightKg: 100,
      reps: 10,
    });
    store.generateWarmupSetsForActiveExercise(weId);
    const activeAfterSecondWarmup = useWorkoutStore.getState().activeWorkout!;
    expect(activeAfterSecondWarmup.exercises[0].sets.length).toBe(5);
    expect(activeAfterSecondWarmup.exercises[0].sets[0]).toMatchObject({
      type: 'warmup',
      weightKg: 50,
      reps: 12,
      completed: false,
    });
    expect(activeAfterSecondWarmup.exercises[0].sets[1]).toMatchObject({
      type: 'warmup',
      weightKg: 75,
      reps: 6,
      completed: false,
    });

    // Conclui marcando automaticamente todas as séries preenchidas (markAllFilledSets = true)
    const finished = store.finishActiveWorkout(false, true);
    expect(finished).not.toBeNull();
    expect(finished!.totalSets).toBe(5);
    // Volume ignora warmup: (100*10) + (20*10) + (20*10) = 1400 kg
    expect(finished!.totalVolumeKg).toBe(1400);
  });

  it('renderiza componentes de UI com alvos de 44x44px, divulgação progressiva de RPE, ANTERIOR alinhado e proteção de exclusão', () => {
    const renderWithStore = (el: React.ReactElement) => {
      Object.assign(
        useWorkoutStore.getInitialState(),
        useWorkoutStore.getState()
      );
      return renderToStaticMarkup(el);
    };

    const store = useWorkoutStore.getState();
    store.clearAllData();

    // Popula histórico e rotinas para testar o alinhamento de ANTERIOR e o widget semanal
    useWorkoutStore.setState({
      workoutHistory: SAMPLE_HISTORY,
      routines: [
        {
          id: 'r-push',
          folderId: null,
          title: 'Treino A — Push (Peito, Ombros e Tríceps)',
          description: 'Foco em hipertrofia',
          updatedAt: '2026-11-10T18:00:00Z',
          exercises: [
            {
              id: 're-1',
              exerciseId: 'ex-bench-press-barbell',
              supersetId: null,
              restTimerSeconds: 90,
              notes: '',
              sets: [
                {
                  id: 'rs-1',
                  type: 'normal',
                  weightKg: 80,
                  reps: 10,
                  completed: false,
                },
                {
                  id: 'rs-2',
                  type: 'normal',
                  weightKg: 80,
                  reps: 10,
                  completed: false,
                },
              ],
            },
          ],
        },
      ],
    });

    // 1. RoutinesView: Widget Meta Semanal + Próximo sugerido + line-clamp-2
    const routinesHtml = renderWithStore(React.createElement(RoutinesView));
    expect(routinesHtml).toContain('Meta Semanal:');
    expect(routinesHtml).toContain('Próximo sugerido');
    expect(routinesHtml).toContain('line-clamp-2');
    expect(routinesHtml).toContain('Iniciar Treino Livre (Em Branco)');

    // 2. ActiveWorkoutDrawer: Inicia rotina e gera aquecimento
    store.startRoutineWorkout('r-push');
    const activeExId = useWorkoutStore.getState().activeWorkout!.exercises[0].id;
    store.generateWarmupSetsForActiveExercise(activeExId);

    // Por padrão, showRpeColumn = false -> não deve exibir cabeçalho RPE, e deve exibir Aquecimento + 90kg × 8 nas séries de trabalho
    const drawerHtmlHiddenRpe = renderWithStore(
      React.createElement(ActiveWorkoutDrawer)
    );
    expect(drawerHtmlHiddenRpe).not.toContain('>RPE<');
    expect(drawerHtmlHiddenRpe).toContain('Aquecimento');
    expect(drawerHtmlHiddenRpe).toContain('90kg × 8');
    expect(drawerHtmlHiddenRpe).toContain('🧮 Anilhas');
    expect(drawerHtmlHiddenRpe).toContain('w-11 h-11');

    // Ativa showRpeColumn = true -> deve exibir cabeçalho RPE
    store.updateSettings({ showRpeColumn: true });
    const drawerHtmlShownRpe = renderWithStore(
      React.createElement(ActiveWorkoutDrawer)
    );
    expect(drawerHtmlShownRpe).toContain('>RPE<');
    store.updateSettings({ showRpeColumn: false });

    // Minimiza treino -> renderiza Docked Bar acima da navegação mobile
    store.toggleMinimizeWorkout(true);
    const minimizedHtml = renderWithStore(
      React.createElement(ActiveWorkoutDrawer)
    );
    expect(minimizedHtml).toContain('Em andamento');
    expect(minimizedHtml).toContain('Retomar');
    expect(minimizedHtml).toContain(
      'bottom-[calc(4rem+env(safe-area-inset-bottom))]'
    );

    // 3. ExercisesView & ExerciseDetailModal: Sem lixeira na listagem, com "Excluir Exercício" no modal
    const exercisesHtml = renderWithStore(React.createElement(ExercisesView));
    expect(exercisesHtml).toContain('+ Treino');
    expect(exercisesHtml).not.toContain('Excluir Exercício');

    const detailHtml = renderWithStore(
      React.createElement(ExerciseDetailModal, {
        exercise: EXERCISES_SEED[0],
        onClose: () => {},
      })
    );
    expect(detailHtml).toContain('Excluir Exercício');

    // 4. SocialFeedView & ProfileAnalyticsView & BodyHeatmapSVG
    const feedHtml = renderWithStore(React.createElement(SocialFeedView));
    expect(feedHtml).toContain('Compartilhar');
    expect(feedHtml).toContain('Virar Rotina');

    const profileHtml = renderWithStore(
      React.createElement(ProfileAnalyticsView)
    );
    expect(profileHtml).toContain('Evolução por Sessão de Treino');
    expect(profileHtml).toContain('min-h-[44px]');

    const heatmapHtml = renderWithStore(
      React.createElement(BodyHeatmapSVG, {
        muscleScores: calculateMuscleDistribution(
          SAMPLE_HISTORY,
          EXERCISES_SEED
        ),
      })
    );
    expect(heatmapHtml).toContain('10+ (Alta Carga)');
  });
});
