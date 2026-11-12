import { describe, expect, it } from 'vitest';
import {
  calculate1RM,
  calculateMuscleDistribution,
  calculatePlates,
  evaluateWorkoutPRs,
  exportWorkoutsToCSV,
  generateWarmupSets,
} from './calculations';
import { EXERCISES_SEED } from '@/data/exercises-seed';
import { WorkoutSession } from '@/types/workout';
import {
  decodeShareToken,
  encodeFolderShareToken,
  encodeRoutineShareToken,
} from './share';

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
});
