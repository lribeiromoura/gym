'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Camera,
  Check,
  CheckCircle2,
  Download,
  Edit3,
  Flame,
  Plus,
  Ruler,
  Scale,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { MUSCLE_LABELS, MuscleGroup } from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculateMuscleDistribution,
  exportWorkoutsToCSV,
} from '@/lib/calculations';
import {
  enableRestTimerNotifications,
  getNotificationPermissionState,
  triggerImmediateRestNotification,
} from '@/lib/notifications';
import { BodyHeatmapSVG } from '@/components/analytics/BodyHeatmapSVG';

export function ProfileAnalyticsView() {
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const exercises = useWorkoutStore((s) => s.exercises);
  const measurements = useWorkoutStore((s) => s.measurements);
  const progressPhotos = useWorkoutStore((s) => s.progressPhotos);
  const settings = useWorkoutStore((s) => s.settings);

  const addBodyMeasurement = useWorkoutStore((s) => s.addBodyMeasurement);
  const deleteBodyMeasurement = useWorkoutStore((s) => s.deleteBodyMeasurement);
  const addProgressPhoto = useWorkoutStore((s) => s.addProgressPhoto);
  const deleteProgressPhoto = useWorkoutStore((s) => s.deleteProgressPhoto);
  const updateSettings = useWorkoutStore((s) => s.updateSettings);
  const clearAllData = useWorkoutStore((s) => s.clearAllData);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(settings.name);
  const [bioInput, setBioInput] = useState(settings.bio);

  const [subTab, setSubTab] = useState<
    'analytics' | 'measurements' | 'photos' | 'data'
  >('analytics');
  const [periodDays, setPeriodDays] = useState<number | 'all'>('all');
  const [chartType, setChartType] = useState<'volume' | 'duration' | 'sets'>(
    'volume'
  );
  const [measureMetric, setMeasureMetric] = useState<
    | 'weightKg'
    | 'bodyFatPct'
    | 'rightBicepCm'
    | 'chestCm'
    | 'waistCm'
    | 'rightThighCm'
  >('weightKg');

  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [mDate, setMDate] = useState(new Date().toISOString().slice(0, 10));
  const [mWeight, setMWeight] = useState('');
  const [mBodyFat, setMBodyFat] = useState('');
  const [mKcal, setMKcal] = useState('');
  const [mChest, setMChest] = useState('');
  const [mBicep, setMBicep] = useState('');
  const [mWaist, setMWaist] = useState('');
  const [mThigh, setMThigh] = useState('');
  const [mCalf, setMCalf] = useState('');

  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);
  const [notifStatus, setNotifStatus] = useState<
    NotificationPermission | 'unsupported'
  >('default');
  const [notifMessage, setNotifMessage] = useState<string | null>(null);

  useEffect(() => {
    setNotifStatus(getNotificationPermissionState());
  }, []);

  const filteredWorkouts = useMemo(() => {
    if (periodDays === 'all') return workoutHistory;
    const cutoff = Date.now() - periodDays * 24 * 3600 * 1000;
    return workoutHistory.filter(
      (w) => new Date(w.startTime).getTime() >= cutoff
    );
  }, [workoutHistory, periodDays]);

  const muscleDistribution = useMemo(
    () => calculateMuscleDistribution(filteredWorkouts, exercises),
    [filteredWorkouts, exercises]
  );

  const radarAxes = useMemo(() => {
    const d = muscleDistribution;
    const raw = [
      { label: 'Peito', val: d.chest.score },
      {
        label: 'Costas',
        val: d.lats.score + d.upper_back.score + d.lower_back.score,
      },
      { label: 'Ombros', val: d.shoulders.score + d.traps.score },
      {
        label: 'Braços',
        val: d.biceps.score + d.triceps.score + d.forearms.score,
      },
      {
        label: 'Pernas',
        val:
          d.quads.score +
          d.hamstrings.score +
          d.glutes.score +
          d.calves.score,
      },
      { label: 'Core', val: d.abs.score + d.lower_back.score * 0.5 },
    ];
    const maxVal = Math.max(...raw.map((r) => r.val), 6);
    return raw.map((r) => ({
      ...r,
      norm: Math.min(1, r.val / maxVal),
    }));
  }, [muscleDistribution]);

  const totalStats = useMemo(() => {
    const totalWorkouts = workoutHistory.length;
    const totalVolume = workoutHistory.reduce(
      (acc, w) => acc + w.totalVolumeKg,
      0
    );
    const totalPRs = workoutHistory.reduce((acc, w) => acc + w.prCount, 0);
    const totalDuration = workoutHistory.reduce(
      (acc, w) => acc + w.durationSeconds,
      0
    );
    return { totalWorkouts, totalVolume, totalPRs, totalDuration };
  }, [workoutHistory]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim() || 'Usuário';
    updateSettings({
      name: cleanName,
      bio: bioInput.trim(),
    });
    setIsEditingName(false);
  };

  const handleSaveMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    addBodyMeasurement({
      date: mDate,
      weightKg: mWeight ? Number(mWeight) : undefined,
      bodyFatPct: mBodyFat ? Number(mBodyFat) : undefined,
      caloricIntakeKcal: mKcal ? Number(mKcal) : undefined,
      chestCm: mChest ? Number(mChest) : undefined,
      leftBicepCm: mBicep ? Number(mBicep) : undefined,
      rightBicepCm: mBicep ? Number(mBicep) : undefined,
      waistCm: mWaist ? Number(mWaist) : undefined,
      leftThighCm: mThigh ? Number(mThigh) : undefined,
      rightThighCm: mThigh ? Number(mThigh) : undefined,
      calfCm: mCalf ? Number(mCalf) : undefined,
    });
    setShowAddMeasurement(false);
  };

  const handleDownloadCSV = () => {
    const csvContent = exportWorkoutsToCSV(workoutHistory, exercises);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironpulse_workouts_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setCsvFeedback('Arquivo CSV exportado com sucesso!');
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const latestWeight =
          measurements[measurements.length - 1]?.weightKg || 0;
        addProgressPhoto({
          date: new Date().toISOString().slice(0, 10),
          weightKg: latestWeight,
          caption: 'Registro de Progresso',
          pose: 'Frente',
          dataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const MEASURE_LABELS: Record<
    typeof measureMetric,
    { label: string; unit: string }
  > = {
    weightKg: { label: 'Peso Corporal', unit: 'kg' },
    bodyFatPct: { label: 'Gordura Corporal (BF)', unit: '%' },
    rightBicepCm: { label: 'Bíceps', unit: 'cm' },
    chestCm: { label: 'Peitoral', unit: 'cm' },
    waistCm: { label: 'Cintura', unit: 'cm' },
    rightThighCm: { label: 'Coxa / Quadríceps', unit: 'cm' },
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header do Perfil com Edição Direta do Nome */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full bg-[#0084FF] flex items-center justify-center text-white text-xl font-extrabold shadow-sm shrink-0">
            {(settings.name || 'U')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>

          {isEditingName ? (
            <form
              onSubmit={handleSaveName}
              className="flex-1 max-w-md space-y-2"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Seu nome..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#F1F5F9] border border-[#0084FF] text-sm font-bold text-slate-900 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#0084FF] text-white text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Sua bio ou objetivo (opcional)..."
                className="w-full px-3 py-1.5 rounded-xl bg-[#F1F5F9] border border-slate-200 text-xs text-slate-700 focus:outline-none"
              />
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">
                  {settings.name || 'Usuário'}
                </h1>
                <button
                  onClick={() => {
                    setNameInput(settings.name);
                    setBioInput(settings.bio);
                    setIsEditingName(true);
                  }}
                  title="Alterar Nome"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-[#0084FF] flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3 h-3" /> Alterar Nome
                </button>
              </div>
              {settings.bio && (
                <p className="text-xs text-slate-500 mt-1">{settings.bio}</p>
              )}
            </div>
          )}
        </div>

        {/* KPIs Globais */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
          <div className="text-center">
            <span className="text-lg font-extrabold text-slate-900">
              {totalStats.totalWorkouts}
            </span>
            <p className="text-[11px] text-slate-500">Treinos</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-extrabold text-[#0084FF]">
              {(totalStats.totalVolume / 1000).toFixed(1)}t
            </span>
            <p className="text-[11px] text-slate-500">Volume Total</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-extrabold text-amber-600">
              {totalStats.totalPRs}
            </span>
            <p className="text-[11px] text-slate-500">Recordes (PRs)</p>
          </div>
        </div>
      </div>

      {/* Navegação de Sub-Abas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
        <button
          onClick={() => setSubTab('analytics')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subTab === 'analytics'
              ? 'bg-[#0084FF] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Analytics & Heatmap
        </button>
        <button
          onClick={() => setSubTab('measurements')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subTab === 'measurements'
              ? 'bg-[#0084FF] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ruler className="w-4 h-4" /> Medidas Corporais
        </button>
        <button
          onClick={() => setSubTab('photos')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subTab === 'photos'
              ? 'bg-[#0084FF] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-4 h-4" /> Fotos de Progresso
        </button>
        <button
          onClick={() => setSubTab('data')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subTab === 'data'
              ? 'bg-[#0084FF] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" /> CSV & Configurações
        </button>
      </div>

      {/* ================= ABA 1: ANALYTICS, HEATMAP & RADAR ================= */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>
                Meta Semanal:{' '}
                <strong className="text-slate-900">
                  {settings.weeklyWorkoutGoal} treinos/semana
                </strong>
              </span>
            </div>
            <div className="flex bg-white border border-slate-200 rounded-xl p-1 text-xs">
              {[
                { label: '7 Dias', val: 7 },
                { label: '30 Dias', val: 30 },
                { label: '90 Dias', val: 90 },
                { label: 'Tudo', val: 'all' as const },
              ].map((opt) => (
                <button
                  key={String(opt.val)}
                  onClick={() => setPeriodDays(opt.val)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    periodDays === opt.val
                      ? 'bg-[#0084FF] text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Mapa Muscular (Heatmap Anatômico)
                </h3>
                <p className="text-xs text-slate-500">
                  Toque em qualquer músculo no corpo para inspecionar séries e volume
                </p>
              </div>
              <BodyHeatmapSVG muscleScores={muscleDistribution} />
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-5 shadow-xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Equilíbrio Muscular (Radar & Séries)
                </h3>
                <p className="text-xs text-slate-500">
                  Proporção de séries efetivas entre grupamentos musculares
                </p>
              </div>

              <div className="flex justify-center py-2">
                <svg viewBox="0 0 260 220" className="w-64 h-52">
                  {[0.33, 0.66, 1].map((scale, sIdx) => {
                    const pts = radarAxes
                      .map((_, i) => {
                        const angle =
                          (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
                        const x = 130 + Math.cos(angle) * 75 * scale;
                        const y = 110 + Math.sin(angle) * 75 * scale;
                        return `${x},${y}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        key={sIdx}
                        points={pts}
                        fill="none"
                        stroke="#E2E8F0"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {radarAxes.map((axis, i) => {
                    const angle =
                      (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
                    const x2 = 130 + Math.cos(angle) * 75;
                    const y2 = 110 + Math.sin(angle) * 75;
                    const lx = 130 + Math.cos(angle) * 98;
                    const ly = 110 + Math.sin(angle) * 92;
                    return (
                      <g key={axis.label}>
                        <line
                          x1="130"
                          y1="110"
                          x2={x2}
                          y2={y2}
                          stroke="#E2E8F0"
                          strokeWidth="1"
                        />
                        <text
                          x={lx}
                          y={ly + 3}
                          textAnchor="middle"
                          fill="#475569"
                          fontSize="10"
                          fontWeight="bold"
                        >
                          {axis.label}
                        </text>
                      </g>
                    );
                  })}

                  <polygon
                    points={radarAxes
                      .map((axis, i) => {
                        const angle =
                          (Math.PI * 2 * i) / radarAxes.length - Math.PI / 2;
                        const r = Math.max(0.12, axis.norm) * 75;
                        const x = 130 + Math.cos(angle) * r;
                        const y = 110 + Math.sin(angle) * r;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                    fill="rgba(0, 132, 255, 0.22)"
                    stroke="#0084FF"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>

              <div className="space-y-2">
                {(Object.keys(muscleDistribution) as MuscleGroup[])
                  .filter((m) => muscleDistribution[m].score > 0)
                  .sort(
                    (a, b) =>
                      muscleDistribution[b].score - muscleDistribution[a].score
                  )
                  .slice(0, 6)
                  .map((m) => {
                    const item = muscleDistribution[m];
                    return (
                      <div key={m} className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-800">
                            {MUSCLE_LABELS[m]}
                          </span>
                          <span className="text-slate-500">
                            {item.primarySets} diretas + {item.secondarySets}{' '}
                            sin. (
                            <strong className="text-[#0084FF]">
                              {Math.round(item.volumeKg).toLocaleString(
                                'pt-BR'
                              )}{' '}
                              kg
                            </strong>
                            )
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#0084FF] rounded-full"
                            style={{
                              width: `${Math.min(100, item.score * 6)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#0084FF]" />
                  Evolução por Sessão de Treino
                </h3>
                <p className="text-xs text-slate-500">
                  Comparativo das últimas sessões registradas
                </p>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setChartType('volume')}
                  className={`px-3 py-1 rounded-lg font-semibold ${
                    chartType === 'volume'
                      ? 'bg-[#0084FF] text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Volume (kg)
                </button>
                <button
                  onClick={() => setChartType('duration')}
                  className={`px-3 py-1 rounded-lg font-semibold ${
                    chartType === 'duration'
                      ? 'bg-[#0084FF] text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Duração (min)
                </button>
                <button
                  onClick={() => setChartType('sets')}
                  className={`px-3 py-1 rounded-lg font-semibold ${
                    chartType === 'sets'
                      ? 'bg-[#0084FF] text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Séries
                </button>
              </div>
            </div>

            {filteredWorkouts.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                Complete um treino para visualizar o gráfico de evolução.
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-2 items-end h-44 pt-6 px-2 bg-slate-50 border border-slate-200 rounded-xl">
                {[...filteredWorkouts]
                  .slice(0, 8)
                  .reverse()
                  .map((w) => {
                    const val =
                      chartType === 'volume'
                        ? w.totalVolumeKg
                        : chartType === 'duration'
                        ? Math.round(w.durationSeconds / 60)
                        : w.totalSets;
                    const maxPossible =
                      chartType === 'volume'
                        ? 24000
                        : chartType === 'duration'
                        ? 90
                        : 24;
                    const pct = Math.max(
                      12,
                      Math.min(100, (val / maxPossible) * 100)
                    );
                    return (
                      <div
                        key={w.id}
                        className="flex flex-col items-center justify-end h-full gap-1.5"
                      >
                        <span className="text-[10px] font-bold text-slate-700">
                          {chartType === 'volume'
                            ? `${(val / 1000).toFixed(1)}k`
                            : val}
                        </span>
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full max-w-[34px] rounded-t-lg bg-[#0084FF] hover:bg-blue-600 transition-all"
                          title={`${w.title}: ${val}`}
                        />
                        <span className="text-[10px] text-slate-500 pb-1">
                          {new Date(w.startTime).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= ABA 2: MEDIDAS CORPORAIS & PESO ================= */}
      {subTab === 'measurements' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Rastreador de Medidas Corporais & Peso
              </h2>
              <p className="text-xs text-slate-500">
                Acompanhe a evolução de peso, percentual de gordura e circunferências
              </p>
            </div>
            <button
              onClick={() => setShowAddMeasurement(true)}
              className="px-4 py-2.5 rounded-full bg-[#0084FF] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar Medida
            </button>
          </div>

          {measurements.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <Scale className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                Nenhuma medida corporal registrada
              </h3>
              <p className="text-xs text-slate-500">
                Clique em &ldquo;Registrar Medida&rdquo; para acompanhar seu peso e medidas.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex flex-wrap gap-2">
                  {(
                    Object.keys(
                      MEASURE_LABELS
                    ) as (keyof typeof MEASURE_LABELS)[]
                  ).map((key) => (
                    <button
                      key={key}
                      onClick={() => setMeasureMetric(key)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                        measureMetric === key
                          ? 'bg-blue-50 border-[#0084FF] text-[#0084FF]'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {MEASURE_LABELS[key].label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                  {measurements.map((m) => {
                    const value = m[measureMetric];
                    return (
                      <div
                        key={m.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {new Date(m.date + 'T12:00:00').toLocaleDateString(
                              'pt-BR'
                            )}
                          </span>
                          <button
                            onClick={() => deleteBodyMeasurement(m.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xl font-extrabold text-slate-900 mt-2">
                          {value ?? '—'}{' '}
                          <span className="text-xs font-normal text-[#0084FF]">
                            {MEASURE_LABELS[measureMetric].unit}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Peso</th>
                      <th className="py-3 px-4">BF %</th>
                      <th className="py-3 px-4">Kcal</th>
                      <th className="py-3 px-4">Peito</th>
                      <th className="py-3 px-4">Bíceps</th>
                      <th className="py-3 px-4">Cintura</th>
                      <th className="py-3 px-4">Coxa</th>
                      <th className="py-3 px-4">Panturrilha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {[...measurements].reverse().map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold">
                          {new Date(m.date + 'T12:00:00').toLocaleDateString(
                            'pt-BR'
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {m.weightKg ? `${m.weightKg} kg` : '—'}
                        </td>
                        <td className="py-3 px-4 text-emerald-600 font-semibold">
                          {m.bodyFatPct ? `${m.bodyFatPct}%` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {m.caloricIntakeKcal
                            ? `${m.caloricIntakeKcal} kcal`
                            : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {m.chestCm ? `${m.chestCm} cm` : '—'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#0084FF]">
                          {m.rightBicepCm ? `${m.rightBicepCm} cm` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {m.waistCm ? `${m.waistCm} cm` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {m.rightThighCm ? `${m.rightThighCm} cm` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {m.calfCm ? `${m.calfCm} cm` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= ABA 3: FOTOS DE PROGRESSO ================= */}
      {subTab === 'photos' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Galeria de Fotos de Progresso
              </h2>
              <p className="text-xs text-slate-500">
                Adicione fotos associadas à data e ao seu peso corporal
              </p>
            </div>

            <label className="px-4 py-2.5 rounded-full bg-[#0084FF] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0">
              <Camera className="w-4 h-4" /> Adicionar Foto
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          {progressPhotos.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-3">
              <Camera className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">
                Nenhuma foto de progresso salva ainda
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Clique em &ldquo;Adicionar Foto&rdquo; acima para registrar sua evolução física.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {progressPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between shadow-xs"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        {photo.date}{' '}
                        {photo.weightKg ? `• ${photo.weightKg} kg` : ''}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {photo.caption}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteProgressPhoto(photo.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= ABA 4: EXPORTAÇÃO CSV & CONFIGURAÇÕES ================= */}
      {subTab === 'data' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-[#0084FF]" />
              Exportar & Gerenciar Dados
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Exporte todo o seu histórico de treinos em formato <code>.csv</code>{' '}
              ou limpe todos os dados armazenados no navegador.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2.5 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> Exportar Histórico CSV
              </button>

              <button
                onClick={() => {
                  if (
                    confirm(
                      'Deseja apagar todos os dados cadastrados e voltar ao estado inicial vazio?'
                    )
                  ) {
                    clearAllData();
                    setCsvFeedback('Todos os dados foram zerados.');
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-bold"
              >
                Zerar Todos os Dados
              </button>
            </div>

            {csvFeedback && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{csvFeedback}</span>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#0084FF]" />
              Preferências do Usuário & Treino
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Nome no Perfil
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => updateSettings({ name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Timer de Descanso Padrão
                  </label>
                  <select
                    value={settings.defaultRestSeconds}
                    onChange={(e) =>
                      updateSettings({
                        defaultRestSeconds: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                  >
                    <option value={60}>60 segundos</option>
                    <option value={90}>90 segundos</option>
                    <option value={120}>120 segundos</option>
                    <option value={150}>150 segundos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Peso Padrão da Barra
                  </label>
                  <select
                    value={settings.defaultBarWeightKg}
                    onChange={(e) =>
                      updateSettings({
                        defaultBarWeightKg: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                  >
                    <option value={20}>20 kg (Olímpica)</option>
                    <option value={15}>15 kg</option>
                    <option value={10}>10 kg</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-700 font-medium">
                  Alerta Sonoro ao Fim do Descanso
                </span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) =>
                    updateSettings({ soundEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#0084FF]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-slate-900 font-bold flex items-center gap-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#0084FF]" />
                      Notificações Push no iPhone / Segundo Plano
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Receba alerta na tela bloqueada quando o tempo de descanso acabar.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      notifStatus === 'granted'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {notifStatus === 'granted' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {notifStatus !== 'granted' ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await enableRestTimerNotifications();
                        setNotifStatus(getNotificationPermissionState());
                        if (res.granted) {
                          setNotifMessage(
                            'Notificações de descanso ativadas com sucesso!'
                          );
                        } else if (res.reason) {
                          setNotifMessage(res.reason);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5" /> Ativar Notificações de Descanso
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await triggerImmediateRestNotification('Supino Reto');
                        setNotifMessage('Notificação de teste enviada!');
                      }}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#0084FF]" /> Testar Notificação Agora
                    </button>
                  )}
                </div>

                {notifMessage && (
                  <p className="text-[11px] text-[#0084FF] font-medium">
                    {notifMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Medida Corporal */}
      {showAddMeasurement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveMeasurement}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#0084FF]" />
                Registrar Medidas Corporais
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMeasurement(false)}
                className="text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Peso Corporal (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mWeight}
                  onChange={(e) => setMWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Gordura BF (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mBodyFat}
                  onChange={(e) => setMBodyFat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Peito (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mChest}
                  onChange={(e) => setMChest(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Bíceps (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mBicep}
                  onChange={(e) => setMBicep(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Cintura (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mWaist}
                  onChange={(e) => setMWaist(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Coxa (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mThigh}
                  onChange={(e) => setMThigh(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Panturrilha (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mCalf}
                  onChange={(e) => setMCalf(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  Calorias (kcal)
                </label>
                <input
                  type="number"
                  value={mKcal}
                  onChange={(e) => setMKcal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F1F5F9] border border-slate-200 text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMeasurement(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#0084FF] text-xs font-bold text-white"
              >
                Salvar Medida
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
