import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AI_REPORT_PROMPT,
  generateWorkoutAIReport,
} from './ai-report';
import { resolveUserSettings } from './backup';
import { INITIAL_EXERCISES as EXERCISES_SEED, INITIAL_USER_SETTINGS } from '@/data/initial-data';
import { BodyMeasurementEntry, WorkoutSession } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { WorkoutAIReportModal } from '@/components/workout/WorkoutAIReportModal';
import { SocialFeedView } from '@/components/feed/SocialFeedView';
import { ActiveWorkoutDrawer } from '@/components/workout/ActiveWorkoutDrawer';

const BENCH_ID = 'ex-bench-press-barbell';
const PLANK_ID =
  EXERCISES_SEED.find((e) => e.measurementType === 'duration')?.id ||
  'ex-plank';
const PUSHUP_ID =
  EXERCISES_SEED.find((e) => e.measurementType === 'bodyweight_reps')?.id ||
  'ex-push-up';

const PREV_SESSION: WorkoutSession = {
  id: 'sess-prev',
  title: 'Push A',
  startTime: '2026-11-10T18:00:00.000Z',
  endTime: '2026-11-10T19:00:00.000Z',
  durationSeconds: 3600,
  description: 'Treino anterior',
  totalVolumeKg: 1440,
  totalSets: 2,
  prCount: 0,
  exercises: [
    {
      id: 'we-prev',
      exerciseId: BENCH_ID,
      supersetId: null,
      restTimerSeconds: 90,
      notes: '',
      sets: [
        { id: 'ws-p1', type: 'normal', weightKg: 90, reps: 8, completed: true },
        { id: 'ws-p2', type: 'normal', weightKg: 90, reps: 8, completed: true },
      ],
    },
  ],
};

const CURRENT_SESSION: WorkoutSession = {
  id: 'sess-cur',
  title: 'Push A — Foco Peitoral',
  startTime: '2026-11-17T18:00:00.000Z',
  endTime: '2026-11-17T19:05:00.000Z',
  durationSeconds: 3900,
  description: 'Dormi bem, energia alta.',
  totalVolumeKg: 1600,
  totalSets: 5,
  prCount: 2,
  exercises: [
    {
      id: 'we-c1',
      exerciseId: BENCH_ID,
      supersetId: 1,
      restTimerSeconds: 120,
      notes: 'Pausa de 1s no peito',
      sets: [
        { id: 'ws-w1', type: 'warmup', weightKg: 50, reps: 10, completed: true },
        {
          id: 'ws-c1',
          type: 'normal',
          weightKg: 100,
          reps: 8,
          rpe: 8.5,
          completed: true,
          prs: ['heaviest_weight', 'best_1rm'],
        },
        {
          id: 'ws-c2',
          type: 'failure',
          weightKg: 100,
          reps: 8,
          rpe: 10,
          completed: true,
        },
      ],
    },
    {
      id: 'we-c2',
      exerciseId: PUSHUP_ID,
      supersetId: 1,
      restTimerSeconds: 60,
      notes: 'Escápulas firmes',
      sets: [
        { id: 'ws-bw1', type: 'normal', weightKg: 0, reps: 18, completed: true },
      ],
    },
    {
      id: 'we-c3',
      exerciseId: PLANK_ID,
      supersetId: null,
      restTimerSeconds: 45,
      notes: 'Core travado',
      sets: [
        {
          id: 'ws-dur1',
          type: 'normal',
          weightKg: null,
          reps: null,
          durationSeconds: 75,
          completed: true,
        },
      ],
    },
  ],
};

const FUTURE_SESSION: WorkoutSession = {
  id: 'sess-future',
  title: 'Push A — Futuro',
  startTime: '2026-11-24T18:00:00.000Z',
  endTime: '2026-11-24T19:00:00.000Z',
  durationSeconds: 3600,
  description: '',
  totalVolumeKg: 2400,
  totalSets: 2,
  prCount: 0,
  exercises: [
    {
      id: 'we-f1',
      exerciseId: BENCH_ID,
      supersetId: null,
      restTimerSeconds: 90,
      notes: '',
      sets: [
        { id: 'ws-f1', type: 'normal', weightKg: 120, reps: 10, completed: true },
      ],
    },
  ],
};

const MEASUREMENTS: BodyMeasurementEntry[] = [
  { id: 'm1', date: '2026-11-01', weightKg: 82, bodyFatPct: 16.5 },
  { id: 'm2', date: '2026-11-15', weightKg: 80.5, bodyFatPct: 15.2 },
];

describe('Relatório de Treino para Avaliação por IA', () => {
  it('gera relatório completo com perfil, medidas mais recentes, notas, RPE, PRs, tipos e comparativo cronológico', () => {
    const report = generateWorkoutAIReport({
      session: CURRENT_SESSION,
      workoutHistory: [FUTURE_SESSION, CURRENT_SESSION, PREV_SESSION],
      exercises: EXERCISES_SEED,
      measurements: MEASUREMENTS,
      settings: {
        ...INITIAL_USER_SETTINGS,
        name: 'Leandro',
        bio: 'Hipertrofia natural com foco em peitoral e dorsais',
        weeklyWorkoutGoal: 5,
      },
    });

    // Prompt padrão e cabeçalho
    expect(report).toContain(DEFAULT_AI_REPORT_PROMPT);
    expect(report).toContain('# Relatório de Treino — Push A — Foco Peitoral');

    // Perfil e medida mais recente (15/11: 80,5 kg e 15,2%)
    expect(report).toContain('**Atleta:** Leandro');
    expect(report).toContain(
      '**Objetivo / Bio:** Hipertrofia natural com foco em peitoral e dorsais'
    );
    expect(report).toContain('80,5 kg');
    expect(report).toContain('15,2%');

    // Resumo, notas da sessão, notas de exercício, RPE, PRs e superset
    expect(report).toContain('Dormi bem, energia alta.');
    expect(report).toContain('Pausa de 1s no peito');
    expect(report).toContain('Superset 1');
    expect(report).toContain('W (Aquecimento)');
    expect(report).toContain('F (Falha)');
    expect(report).toContain('RPE 8,5');
    expect(report).toContain('PR: Maior Carga, Melhor 1RM');

    // Comparativo cronológico: deve comparar com PREV_SESSION (1440 kg -> +160 kg) e ignorar FUTURE_SESSION (120kg)
    expect(report).toContain('Volume: +160 kg (+11%)');
    expect(report).not.toContain('120kg × 10');

    // Bodyweight e duration formatados sem 0kg x 0 reps
    expect(report).toContain('18 reps (peso corporal)');
    expect(report).toContain('1min 15s');
    expect(report).toContain('Primeira execução registrada no histórico.');
  });

  it('respeita a unidade de peso lbs e aceita prompt customizado persistido em resolveUserSettings', () => {
    const customSettings = resolveUserSettings({
      weightUnit: 'lbs',
      aiReportPrompt: 'Avalie meu foco em força máxima (Powerlifting).',
    });
    expect(customSettings.aiReportPrompt).toBe(
      'Avalie meu foco em força máxima (Powerlifting).'
    );

    const legacySettings = resolveUserSettings({ name: 'Legado' });
    expect(legacySettings.aiReportPrompt).toBeUndefined();

    const reportLbs = generateWorkoutAIReport({
      session: CURRENT_SESSION,
      workoutHistory: [CURRENT_SESSION, PREV_SESSION],
      exercises: EXERCISES_SEED,
      measurements: MEASUREMENTS,
      settings: customSettings,
    });

    expect(reportLbs).toContain(
      'Avalie meu foco em força máxima (Powerlifting).'
    );
    expect(reportLbs).toContain('lbs');
    expect(reportLbs).toContain('177,5 lbs'); // 80.5 kg em lbs
  });

  it('renderiza modal de relatório IA e pontos de entrada no Histórico e no resumo pós-treino', () => {
    const renderWithStore = (el: React.ReactElement) => {
      Object.assign(
        useWorkoutStore.getInitialState(),
        useWorkoutStore.getState()
      );
      return renderToStaticMarkup(el);
    };

    const store = useWorkoutStore.getState();
    store.clearAllData();
    useWorkoutStore.setState({
      workoutHistory: [CURRENT_SESSION, PREV_SESSION],
      measurements: MEASUREMENTS,
      lastFinishedWorkout: CURRENT_SESSION,
      activeWorkout: null,
    });

    const modalHtml = renderWithStore(
      React.createElement(WorkoutAIReportModal, {
        session: CURRENT_SESSION,
        onClose: () => {},
      })
    );
    expect(modalHtml).toContain('Relatório para Avaliação IA');
    expect(modalHtml).toContain('Copiar Relatório');
    expect(modalHtml).toContain('Compartilhar');
    expect(modalHtml).toContain('Push A — Foco Peitoral');

    const feedHtml = renderWithStore(React.createElement(SocialFeedView));
    expect(feedHtml).toContain('Relatório IA');

    const postWorkoutHtml = renderWithStore(
      React.createElement(ActiveWorkoutDrawer)
    );
    expect(postWorkoutHtml).toContain('Gerar Relatório para IA');
  });
});
