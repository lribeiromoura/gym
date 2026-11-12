'use client';

import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
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
      <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1D8FE1] to-purple-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg shadow-[#1D8FE1]/20 shrink-0">
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
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0B0D14] border border-[#1D8FE1] text-sm font-bold text-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#1D8FE1] text-white text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Sua bio ou objetivo (opcional)..."
                className="w-full px-3 py-1.5 rounded-xl bg-[#0B0D14] border border-slate-800 text-xs text-slate-300 focus:outline-none"
              />
            </form>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white">
                  {settings.name || 'Usuário'}
                </h1>
                <button
                  onClick={() => {
                    setNameInput(settings.name);
                    setBioInput(settings.bio);
                    setIsEditingName(true);
                  }}
                  title="Alterar Nome"
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-[#38BDF8] flex items-center gap-1 transition"
                >
                  <Edit3 className="w-3 h-3" /> Alterar Nome
                </button>
              </div>
              {settings.bio && (
                <p className="text-xs text-slate-300 mt-1">{settings.bio}</p>
              )}
            </div>
          )}
        </div>

        {/* KPIs Globais */}
        <div className="grid grid-cols-3 gap-3 sm:gap-5 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
          <div className="text-center">
            <span className="text-lg font-extrabold text-white">
              {totalStats.totalWorkouts}
            </span>
            <p className="text-[11px] text-slate-400">Treinos</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-extrabold text-[#38BDF8]">
              {(totalStats.totalVolume / 1000).toFixed(1)}t
            </span>
            <p className="text-[11px] text-slate-400">Volume Total</p>
          </div>
          <div className="text-center">
            <span className="text-lg font-extrabold text-amber-400">
              {totalStats.totalPRs}
            </span>
            <p className="text-[11px] text-slate-400">Recordes (PRs)</p>
          </div>
        </div>
      </div>

      {/* Navegação de Sub-Abas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#12151F] p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setSubTab('analytics')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subTab === 'analytics'
              ? 'bg-[#1D8FE1] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Analytics & Heatmap
        </button>
        <button
          onClick={() => setSubTab('measurements')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subTab === 'measurements'
              ? 'bg-[#1D8FE1] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Ruler className="w-4 h-4" /> Medidas Corporais
        </button>
        <button
          onClick={() => setSubTab('photos')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subTab === 'photos'
              ? 'bg-[#1D8FE1] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4" /> Fotos de Progresso
        </button>
        <button
          onClick={() => setSubTab('data')}
          className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            subTab === 'data'
              ? 'bg-[#1D8FE1] text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" /> CSV & Configurações
        </button>
      </div>

      {/* ================= ABA 1: ANALYTICS, HEATMAP & RADAR ================= */}
      {subTab === 'analytics' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>
                Meta Semanal:{' '}
                <strong>{settings.weeklyWorkoutGoal} treinos/semana</strong>
              </span>
            </div>
            <div className="flex bg-[#12151F] border border-slate-800 rounded-xl p-1 text-xs">
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
                      ? 'bg-[#1D8FE1] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Mapa Muscular (Heatmap Anatômico)
                </h3>
                <p className="text-xs text-slate-400">
                  Clique em qualquer músculo no corpo para inspecionar séries e volume
                </p>
              </div>
              <BodyHeatmapSVG muscleScores={muscleDistribution} />
            </div>

            <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-5">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Equilíbrio Muscular (Radar & Séries)
                </h3>
                <p className="text-xs text-slate-400">
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
                        stroke="#1E293B"
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
                          stroke="#1E293B"
                          strokeWidth="1"
                        />
                        <text
                          x={lx}
                          y={ly + 3}
                          textAnchor="middle"
                          fill="#CBD5E1"
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
                    fill="rgba(29, 143, 225, 0.32)"
                    stroke="#1D8FE1"
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
                          <span className="font-semibold text-slate-200">
                            {MUSCLE_LABELS[m]}
                          </span>
                          <span className="text-slate-400">
                            {item.primarySets} diretas + {item.secondarySets}{' '}
                            sin. (
                            <strong className="text-[#38BDF8]">
                              {Math.round(item.volumeKg).toLocaleString(
                                'pt-BR'
                              )}{' '}
                              kg
                            </strong>
                            )
                          </span>
                        </div>
                        <div className="w-full h-2 bg-[#0B0D14] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1D8FE1] rounded-full"
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

          <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#1D8FE1]" />
                  Evolução por Sessão de Treino
                </h3>
                <p className="text-xs text-slate-400">
                  Comparativo das últimas sessões registradas
                </p>
              </div>

              <div className="flex bg-[#0B0D14] border border-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setChartType('volume')}
                  className={`px-3 py-1 rounded-lg font-semibold ${
                    chartType === 'volume'
                      ? 'bg-[#1D8FE1] text-white'
                      : 'text-slate-400'
                  }`}
                >
                  Volume (kg)
                </button>
                <button
                  onClick={() => setChartType('duration')}
                  className={`px-3 py-1 rounded-lg font-semibold ${
                    chartType === 'duration'
                      ? 'bg-[#1D8FE1] text-white'
                      : 'text-slate-400'
                  }`}
                >
                  Duração (min)
                </button>
                <button
                  onClick={() => setChartType('sets')}
                  className={`px-3 py-1 rounded-lg font-semibold ${
                    chartType === 'sets'
                      ? 'bg-[#1D8FE1] text-white'
                      : 'text-slate-400'
                  }`}
                >
                  Séries
                </button>
              </div>
            </div>

            {filteredWorkouts.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                Complete um treino para visualizar o gráfico de evolução.
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-2 items-end h-44 pt-6 px-2 bg-[#0B0D14] border border-slate-800/80 rounded-xl">
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
                        <span className="text-[10px] font-bold text-slate-300">
                          {chartType === 'volume'
                            ? `${(val / 1000).toFixed(1)}k`
                            : val}
                        </span>
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full max-w-[34px] rounded-t-lg bg-gradient-to-t from-[#1E3A8A] to-[#1D8FE1] hover:to-[#38BDF8] transition-all"
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
              <h2 className="text-lg font-extrabold text-white">
                Rastreador de Medidas Corporais & Peso
              </h2>
              <p className="text-xs text-slate-400">
                Acompanhe a evolução de peso, percentual de gordura e circunferências
              </p>
            </div>
            <button
              onClick={() => setShowAddMeasurement(true)}
              className="px-4 py-2.5 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar Medida
            </button>
          </div>

          {measurements.length === 0 ? (
            <div className="bg-[#12151F] border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <Scale className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                Nenhuma medida corporal registrada
              </h3>
              <p className="text-xs text-slate-400">
                Clique em &ldquo;Registrar Medida&rdquo; para acompanhar seu peso e medidas.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-5 space-y-4">
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
                          ? 'bg-[#1D8FE1]/20 border-[#1D8FE1] text-[#38BDF8]'
                          : 'bg-[#0B0D14] border-slate-800 text-slate-400 hover:text-white'
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
                        className="bg-[#0B0D14] border border-slate-800 rounded-xl p-3 flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {new Date(m.date + 'T12:00:00').toLocaleDateString(
                              'pt-BR'
                            )}
                          </span>
                          <button
                            onClick={() => deleteBodyMeasurement(m.id)}
                            className="text-slate-600 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xl font-extrabold text-white mt-2">
                          {value ?? '—'}{' '}
                          <span className="text-xs font-normal text-[#38BDF8]">
                            {MEASURE_LABELS[measureMetric].unit}
                          </span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#12151F] border border-slate-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0D14] text-slate-400 uppercase text-[10px]">
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
                  <tbody className="divide-y divide-slate-800/70 text-slate-200">
                    {[...measurements].reverse().map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-semibold">
                          {new Date(m.date + 'T12:00:00').toLocaleDateString(
                            'pt-BR'
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {m.weightKg ? `${m.weightKg} kg` : '—'}
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-semibold">
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
                        <td className="py-3 px-4 font-semibold text-[#38BDF8]">
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
          <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Galeria de Fotos de Progresso
              </h2>
              <p className="text-xs text-slate-400">
                Adicione fotos associadas à data e ao seu peso corporal
              </p>
            </div>

            <label className="px-4 py-2.5 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold flex items-center gap-2 cursor-pointer shrink-0">
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
            <div className="bg-[#12151F] border border-dashed border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <Camera className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">
                Nenhuma foto de progresso salva ainda
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Clique em &ldquo;Adicionar Foto&rdquo; acima para registrar sua evolução física.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {progressPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="bg-[#12151F] border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <img
                    src={photo.dataUrl}
                    alt={photo.caption}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">
                        {photo.date}{' '}
                        {photo.weightKg ? `• ${photo.weightKg} kg` : ''}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {photo.caption}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteProgressPhoto(photo.id)}
                      className="text-slate-500 hover:text-red-400 p-1"
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
          <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-[#1D8FE1]" />
              Exportar & Gerenciar Dados
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Exporte todo o seu histórico de treinos em formato <code>.csv</code>{' '}
              ou limpe todos os dados armazenados no navegador.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2.5 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold flex items-center gap-2"
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
                className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-bold"
              >
                Zerar Todos os Dados
              </button>
            </div>

            {csvFeedback && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{csvFeedback}</span>
              </div>
            )}
          </div>

          <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#1D8FE1]" />
              Preferências do Usuário & Treino
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">
                  Nome no Perfil
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => updateSettings({ name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Timer de Descanso Padrão
                  </label>
                  <select
                    value={settings.defaultRestSeconds}
                    onChange={(e) =>
                      updateSettings({
                        defaultRestSeconds: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                  >
                    <option value={60}>60 segundos</option>
                    <option value={90}>90 segundos</option>
                    <option value={120}>120 segundos</option>
                    <option value={150}>150 segundos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Peso Padrão da Barra
                  </label>
                  <select
                    value={settings.defaultBarWeightKg}
                    onChange={(e) =>
                      updateSettings({
                        defaultBarWeightKg: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                  >
                    <option value={20}>20 kg (Olímpica)</option>
                    <option value={15}>15 kg</option>
                    <option value={10}>10 kg</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-300 font-medium">
                  Alerta Sonoro ao Fim do Descanso
                </span>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) =>
                    updateSettings({ soundEnabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#1D8FE1]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Medida Corporal */}
      {showAddMeasurement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveMeasurement}
            className="bg-[#12151F] border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#1D8FE1]" />
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
                <label className="block text-slate-400 mb-1">Data</label>
                <input
                  type="date"
                  value={mDate}
                  onChange={(e) => setMDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Peso Corporal (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mWeight}
                  onChange={(e) => setMWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Gordura BF (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mBodyFat}
                  onChange={(e) => setMBodyFat(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Peito (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={mChest}
                  onChange={(e) => setMChest(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Bíceps (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={mBicep}
                  onChange={(e) => setMBicep(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Cintura (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mWaist}
                  onChange={(e) => setMWaist(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Coxa (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={mThigh}
                  onChange={(e) => setMThigh(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Panturrilha (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={mCalf}
                  onChange={(e) => setMCalf(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">
                  Calorias (kcal)
                </label>
                <input
                  type="number"
                  value={mKcal}
                  onChange={(e) => setMKcal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddMeasurement(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#1D8FE1] text-xs font-bold text-white"
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
