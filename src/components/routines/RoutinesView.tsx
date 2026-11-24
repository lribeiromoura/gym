'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Dumbbell,
  Edit3,
  Flame,
  Folder,
  FolderPlus,
  Layers,
  Play,
  Plus,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  EQUIPMENT_LABELS,
  EquipmentType,
  MUSCLE_LABELS,
  MuscleGroup,
  Routine,
  RoutineFolder,
  SetType,
  WorkoutExercise,
} from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import {
  calculateWeeklyStreakStats,
  convertWeightFromKg,
  convertWeightToKg,
  createDefaultSetValues,
  formatSetSummary,
  getRoutineLastTrainedInfo,
  getWeightUnitLabel,
} from '@/lib/calculations';
import {
  buildShareUrl,
  encodeFolderShareToken,
  encodeRoutineShareToken,
  shareOrCopyLink,
} from '@/lib/share';
import { searchExerciseDB } from '@/lib/exercisedb';
import {
  DecimalInput,
  IntegerInput,
} from '@/components/ui/NumericInputs';

const uid = (p = 'id') =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

export function RoutinesView() {
  const folders = useWorkoutStore((s) => s.folders);
  const routines = useWorkoutStore((s) => s.routines);
  const exercises = useWorkoutStore((s) => s.exercises);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const settings = useWorkoutStore((s) => s.settings);

  const startEmptyWorkout = useWorkoutStore((s) => s.startEmptyWorkout);
  const startRoutineWorkout = useWorkoutStore((s) => s.startRoutineWorkout);
  const createFolder = useWorkoutStore((s) => s.createFolder);
  const deleteFolder = useWorkoutStore((s) => s.deleteFolder);
  const saveRoutine = useWorkoutStore((s) => s.saveRoutine);
  const duplicateRoutine = useWorkoutStore((s) => s.duplicateRoutine);
  const deleteRoutine = useWorkoutStore((s) => s.deleteRoutine);
  const addCustomExercise = useWorkoutStore((s) => s.addCustomExercise);
  const importExercisesBatch = useWorkoutStore((s) => s.importExercisesBatch);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [sharedFeedbackId, setSharedFeedbackId] = useState<string | null>(null);

  const handleShareRoutine = async (routine: Routine) => {
    const token = encodeRoutineShareToken(routine, exercises, settings.name);
    const url = buildShareUrl(token);
    await shareOrCopyLink({
      title: `Treino: ${routine.title}`,
      text: `Confira e importe o treino "${routine.title}" no IronPulse:`,
      url,
    });
    setSharedFeedbackId(routine.id);
    setTimeout(() => setSharedFeedbackId(null), 2500);
  };

  const handleShareFolder = async (
    folder: RoutineFolder,
    folderRoutines: Routine[]
  ) => {
    const token = encodeFolderShareToken(
      folder,
      folderRoutines,
      exercises,
      settings.name
    );
    const url = buildShareUrl(token);
    await shareOrCopyLink({
      title: `Pasta de Treinos: ${folder.name}`,
      text: `Confira e importe a pasta "${folder.name}" (${folderRoutines.length} treinos) no IronPulse:`,
      url,
    });
    setSharedFeedbackId(folder.id);
    setTimeout(() => setSharedFeedbackId(null), 2500);
  };

  const [editingRoutine, setEditingRoutine] = useState<{
    id?: string;
    title: string;
    folderId: string | null;
    description: string;
    exercises: WorkoutExercise[];
  } | null>(null);
  const [showExSearch, setShowExSearch] = useState(false);
  const [exQuery, setExQuery] = useState('');
  const [quickExMuscle, setQuickExMuscle] = useState<MuscleGroup>('chest');
  const [quickExEquip, setQuickExEquip] = useState<EquipmentType>('barbell');

  useEffect(() => {
    const q = exQuery.trim();
    if (!showExSearch || q.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await searchExerciseDB(q);
      if (!cancelled && results.length > 0) {
        importExercisesBatch(results);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exQuery, showExSearch, importExercisesBatch]);

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );
  const weightUnit = settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const unitLabel = getWeightUnitLabel(weightUnit);

  const openNewRoutineEditor = (
    folderId: string | null = folders[0]?.id ?? null
  ) => {
    setEditingRoutine({
      title: '',
      folderId,
      description: '',
      exercises: [],
    });
  };

  const openEditRoutine = (r: Routine) => {
    setEditingRoutine({
      id: r.id,
      title: r.title,
      folderId: r.folderId,
      description: r.description,
      exercises: JSON.parse(JSON.stringify(r.exercises)),
    });
  };

  const handleSaveRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoutine || !editingRoutine.title.trim()) return;
    saveRoutine({
      id: editingRoutine.id,
      title: editingRoutine.title.trim(),
      folderId: editingRoutine.folderId,
      description: editingRoutine.description.trim(),
      exercises: editingRoutine.exercises,
    });
    setEditingRoutine(null);
  };

  const addExerciseToDraft = (exerciseId: string) => {
    if (!editingRoutine) return;
    const meta = exerciseMap.get(exerciseId);
    const defaults = createDefaultSetValues(meta?.measurementType);
    const nextEx: WorkoutExercise = {
      id: uid('re'),
      exerciseId,
      supersetId: null,
      restTimerSeconds: settings.defaultRestSeconds || 90,
      notes: '',
      sets: [
        { id: uid('s'), type: 'normal', ...defaults, completed: false },
        { id: uid('s'), type: 'normal', ...defaults, completed: false },
        { id: uid('s'), type: 'normal', ...defaults, completed: false },
      ],
    };
    setEditingRoutine({
      ...editingRoutine,
      exercises: [...editingRoutine.exercises, nextEx],
    });
    setShowExSearch(false);
    setExQuery('');
  };

  const [expandedRoutineIds, setExpandedRoutineIds] = useState<
    Record<string, boolean>
  >({});

  const toggleRoutineExpanded = (id: string) =>
    setExpandedRoutineIds((prev) => ({ ...prev, [id]: !prev[id] }));

  const weeklyStats = useMemo(
    () =>
      calculateWeeklyStreakStats(
        workoutHistory,
        settings.weeklyWorkoutGoal || 4
      ),
    [workoutHistory, settings.weeklyWorkoutGoal]
  );

  const routineLastTrainedMap = useMemo(() => {
    const map = new Map<
      string,
      ReturnType<typeof getRoutineLastTrainedInfo>
    >();
    for (const r of routines) {
      map.set(r.id, getRoutineLastTrainedInfo(r, workoutHistory));
    }
    return map;
  }, [routines, workoutHistory]);

  const suggestedRoutineId = useMemo(() => {
    if (routines.length === 0) return null;
    let oldestId = routines[0].id;
    let oldestTime =
      routineLastTrainedMap.get(routines[0].id)?.timestamp ?? Infinity;

    for (const r of routines) {
      const info = routineLastTrainedMap.get(r.id);
      const t = info?.timestamp ?? 0;
      if (t < oldestTime) {
        oldestTime = t;
        oldestId = r.id;
      }
    }
    return oldestId;
  }, [routines, routineLastTrainedMap]);

  const renderRoutineCard = (routine: Routine) => {
    const totalSets = routine.exercises.reduce(
      (acc, e) => acc + e.sets.length,
      0
    );
    const muscles = Array.from(
      new Set(
        routine.exercises
          .map((e) => exerciseMap.get(e.exerciseId)?.primaryMuscle)
          .filter(Boolean)
      )
    );
    const isExpanded = !!expandedRoutineIds[routine.id];
    const musclesLabel = muscles
      .map((m) => (m ? MUSCLE_LABELS[m] : ''))
      .filter(Boolean)
      .join(' • ');
    const lastInfo = routineLastTrainedMap.get(routine.id);
    const isSuggested = suggestedRoutineId === routine.id;

    return (
      <div
        key={routine.id}
        className={`bg-white border rounded-2xl shadow-xs overflow-hidden transition ${
          isSuggested ? 'border-[#3B82F6]/60' : 'border-slate-200'
        }`}
      >
        {/* Cabeçalho do card (toque para expandir/recolher) */}
        <button
          type="button"
          onClick={() => toggleRoutineExpanded(routine.id)}
          aria-expanded={isExpanded}
          className="w-full text-left px-4 pt-4 pb-3 flex items-start justify-between gap-3 active:bg-slate-50"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {isSuggested && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#3B82F6] font-extrabold text-[11px]">
                  <Sparkles className="w-3 h-3" /> Próximo sugerido
                </span>
              )}
              {lastInfo && (
                <span className="text-xs font-medium text-slate-500">
                  {isSuggested ? `• ${lastInfo.label}` : lastInfo.label}
                </span>
              )}
            </div>

            <h4 className="text-lg font-extrabold text-slate-900 leading-snug line-clamp-2">
              {routine.title}
            </h4>
            <p className="text-[13px] text-slate-500">
              {routine.exercises.length}{' '}
              {routine.exercises.length === 1 ? 'exercício' : 'exercícios'} •{' '}
              {totalSets} séries
            </p>
            {musclesLabel && (
              <p className="text-[13px] font-semibold text-[#3B82F6] truncate">
                {musclesLabel}
              </p>
            )}
          </div>
          <span className="w-11 h-11 rounded-full bg-[#F1F5F9] flex items-center justify-center shrink-0 text-slate-600">
            <ChevronDown
              className={`w-5 h-5 transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </span>
        </button>

        {/* Botão principal sempre visível */}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => startRoutineWorkout(routine.id)}
            className="w-full h-12 rounded-xl bg-[#2563EB] hover:bg-blue-600 active:bg-blue-700 text-white font-bold text-[15px] flex items-center justify-center gap-2 transition"
          >
            <Play className="w-4 h-4 fill-current" /> Iniciar Rotina
          </button>
        </div>

        {/* Conteúdo expandido */}
        {isExpanded && (
          <div className="border-t border-slate-100 px-4 py-4 space-y-4 bg-slate-50/50">
            {routine.description && (
              <p className="text-[13px] text-slate-600">
                {routine.description}
              </p>
            )}

            {routine.exercises.length > 0 && (
              <div className="space-y-2.5">
                {routine.exercises.map((ex) => {
                  const meta = exerciseMap.get(ex.exerciseId);
                  return (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between gap-3 text-[14px] text-slate-800"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[#0084FF] font-bold shrink-0">
                          {ex.sets.length}×
                        </span>
                        <span className="truncate font-medium">
                          {meta?.title || 'Exercício'}
                        </span>
                        {ex.supersetId && (
                          <span className="px-1.5 rounded bg-purple-100 text-purple-700 text-[10px] font-bold shrink-0">
                            SS
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[13px] shrink-0">
                        {ex.sets[0]
                          ? formatSetSummary(
                              ex.sets[0],
                              meta?.measurementType,
                              weightUnit
                            )
                          : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ações secundárias em botões grandes */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleShareRoutine(routine)}
                className="h-12 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0084FF] text-[14px] font-bold flex items-center justify-center gap-2 transition"
              >
                {sharedFeedbackId === routine.id ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-600" />
                    <span className="text-emerald-700">Link copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-5 h-5" />
                    <span>Compartilhar</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => openEditRoutine(routine)}
                className="h-12 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[14px] font-bold flex items-center justify-center gap-2 transition"
              >
                <Edit3 className="w-5 h-5" /> Editar
              </button>
              <button
                type="button"
                onClick={() => duplicateRoutine(routine.id)}
                className="h-12 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[14px] font-bold flex items-center justify-center gap-2 transition"
              >
                <Copy className="w-5 h-5" /> Duplicar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Excluir a rotina "${routine.title}"?`)) {
                    deleteRoutine(routine.id);
                  }
                }}
                className="h-12 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-[14px] font-bold flex items-center justify-center gap-2 transition"
              >
                <Trash2 className="w-5 h-5" /> Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-28">
      {/* Widget Discreto de Meta Semanal e Ofensiva (Streak) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-slate-900">
              Meta Semanal: {weeklyStats.workoutsThisWeek} de{' '}
              {weeklyStats.weeklyGoal} treinos
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {weeklyStats.consecutiveWeeks}{' '}
              {weeklyStats.consecutiveWeeks === 1
                ? 'semana na meta'
                : 'semanas seguidas'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weeklyStats.days.map((d) => (
            <div
              key={d.dateKey}
              className={`py-2 px-1 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition ${
                d.trained
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : d.isToday
                  ? 'bg-blue-50 border-[#3B82F6] text-[#3B82F6]'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <span className="text-[11px] font-bold uppercase">{d.label}</span>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-extrabold">
                {d.trained ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : d.isToday ? (
                  '○'
                ) : (
                  '·'
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cabeçalho e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Treino & Rotinas
          </h1>
          <p className="text-sm text-slate-500">
            Escolha a próxima rotina sugerida ou inicie um treino livre
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFolderModal(true)}
            className="h-11 px-3.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <FolderPlus className="w-4 h-4 text-slate-600" /> Nova Pasta
          </button>
          <button
            onClick={() => openNewRoutineEditor()}
            className="h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" /> Nova Rotina
          </button>
        </div>
      </div>

      {/* Barra Compacta de Treino Livre (Em Branco) */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="min-w-0">
          <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
            Iniciar Treino Livre (Em Branco)
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Adicione exercícios na hora, com descanso e recordes automáticos
          </p>
        </div>
        <button
          onClick={() => startEmptyWorkout('Treino Livre')}
          className="h-11 px-4 rounded-xl bg-[#F1F5F9] hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition"
        >
          <Play className="w-3.5 h-3.5 fill-current text-[#3B82F6]" /> Iniciar Vazio
        </button>
      </div>

      {/* Estado Vazio Inicial ou Listagem de Pastas e Rotinas */}
      {folders.length === 0 && routines.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-4">
          <Dumbbell className="w-10 h-10 text-slate-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Nenhuma rotina ou pasta cadastrada
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Crie sua primeira rotina ou pasta de treinos usando os botões acima, ou inicie um treino livre em branco.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setShowFolderModal(true)}
              className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center"
            >
              + Criar Pasta
            </button>
            <button
              onClick={() => openNewRoutineEditor()}
              className="h-11 px-4 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-xs font-bold text-white flex items-center justify-center"
            >
              + Criar Rotina
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {folders.map((folder) => {
            const folderRoutines = routines.filter(
              (r) => r.folderId === folder.id
            );
            return (
              <div key={folder.id} className="space-y-3">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <Folder className="w-5 h-5 text-[#0084FF]" />
                    <h3 className="text-[15px] font-extrabold uppercase tracking-wider text-slate-800 truncate">
                      {folder.name}
                    </h3>
                    <span className="text-sm text-slate-400">
                      ({folderRoutines.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {folderRoutines.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleShareFolder(folder, folderRoutines)
                        }
                        title="Compartilhar Link da Pasta"
                        className="flex-1 h-11 rounded-xl bg-blue-50 hover:bg-blue-100 text-[13px] text-[#0084FF] font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        {sharedFeedbackId === folder.id ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-700">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-4 h-4" /> Compartilhar
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openNewRoutineEditor(folder.id)}
                      className="flex-1 h-11 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[13px] text-slate-700 font-bold flex items-center justify-center gap-1.5 transition"
                    >
                      <Plus className="w-4 h-4" /> Rotina
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir a pasta "${folder.name}"?`)) {
                          deleteFolder(folder.id);
                        }
                      }}
                      title="Excluir Pasta"
                      aria-label="Excluir Pasta"
                      className="w-11 h-11 rounded-xl bg-white border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-500 flex items-center justify-center shrink-0 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {folderRoutines.length === 0 ? (
                  <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-center text-xs text-slate-400">
                    Nenhuma rotina nesta pasta. Clique em &ldquo;+ Rotina&rdquo; para criar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {folderRoutines.map(renderRoutineCard)}
                  </div>
                )}
              </div>
            );
          })}

          {routines.some((r) => !r.folderId) && (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-500">
                Minhas Rotinas
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {routines.filter((r) => !r.folderId).map(renderRoutineCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Criar Nova Pasta */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newFolderName.trim()) return;
              createFolder(newFolderName.trim());
              setNewFolderName('');
              setShowFolderModal(false);
            }}
            className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl"
          >
            <h3 className="text-base font-bold text-slate-900">
              Criar Nova Pasta
            </h3>
            <input
              type="text"
              autoFocus
              required
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta..."
              className="w-full h-11 px-3.5 rounded-xl bg-[#F1F5F9] border border-slate-200 text-base text-slate-900 focus:outline-none focus:border-[#0084FF]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="h-11 px-4 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="h-11 px-4 rounded-xl bg-[#0084FF] text-xs font-bold text-white"
              >
                Criar Pasta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Construtor / Editor de Rotina Completo */}
      {editingRoutine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-extrabold text-slate-900">
                {editingRoutine.id ? 'Editar Rotina' : 'Criar Nova Rotina'}
              </h3>
              <button
                onClick={() => setEditingRoutine(null)}
                aria-label="Fechar editor de rotina"
                className="w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveRoutine}
              className="flex-1 overflow-y-auto p-5 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Título da Rotina *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRoutine.title}
                    onChange={(e) =>
                      setEditingRoutine({
                        ...editingRoutine,
                        title: e.target.value,
                      })
                    }
                    placeholder="Ex: Treino A — Superiores"
                    className="w-full h-11 px-3.5 rounded-xl bg-[#F1F5F9] border border-slate-200 text-base text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pasta
                  </label>
                  <select
                    value={editingRoutine.folderId ?? ''}
                    onChange={(e) =>
                      setEditingRoutine({
                        ...editingRoutine,
                        folderId: e.target.value || null,
                      })
                    }
                    className="w-full h-11 px-3 rounded-xl bg-[#F1F5F9] border border-slate-200 text-base text-slate-900"
                  >
                    <option value="">Sem Pasta</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descrição / Observações da Rotina
                </label>
                <input
                  type="text"
                  value={editingRoutine.description}
                  onChange={(e) =>
                    setEditingRoutine({
                      ...editingRoutine,
                      description: e.target.value,
                    })
                  }
                  placeholder="Observações..."
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F1F5F9] border border-slate-200 text-base text-slate-900"
                />
              </div>

              <div className="space-y-4">
                {editingRoutine.exercises.map((ex, exIdx) => {
                  const meta = exerciseMap.get(ex.exerciseId);
                  return (
                    <div
                      key={ex.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-[#0084FF]" />
                          <span className="font-bold text-sm text-slate-900">
                            {meta?.title || 'Exercício'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                            <Layers className="w-3 h-3 text-purple-600 mr-1" />
                            <select
                              value={ex.supersetId ?? ''}
                              onChange={(e) => {
                                const updated = [...editingRoutine.exercises];
                                updated[exIdx] = {
                                  ...ex,
                                  supersetId: e.target.value
                                    ? Number(e.target.value)
                                    : null,
                                };
                                setEditingRoutine({
                                  ...editingRoutine,
                                  exercises: updated,
                                });
                              }}
                              className="bg-transparent text-slate-700 focus:outline-none"
                            >
                              <option value="">Sem Superset</option>
                              <option value="1">Superset A</option>
                              <option value="2">Superset B</option>
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingRoutine({
                                ...editingRoutine,
                                exercises: editingRoutine.exercises.filter(
                                  (_, i) => i !== exIdx
                                ),
                              })
                            }
                            className="p-1 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {ex.sets.map((s, sIdx) => (
                          <div
                            key={s.id}
                            className="grid grid-cols-10 gap-2 items-center text-xs bg-white border border-slate-200 p-2 rounded-xl"
                          >
                            <select
                              value={s.type}
                              onChange={(e) => {
                                const nextType = e.target.value as SetType;
                                setEditingRoutine((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        exercises: prev.exercises.map(
                                          (item, i) =>
                                            i === exIdx
                                              ? {
                                                  ...item,
                                                  sets: item.sets.map(
                                                    (st, j) =>
                                                      j === sIdx
                                                        ? {
                                                            ...st,
                                                            type: nextType,
                                                          }
                                                        : st
                                                  ),
                                                }
                                              : item
                                        ),
                                      }
                                    : null
                                );
                              }}
                              className="col-span-3 bg-slate-100 rounded-lg px-2 py-1 text-slate-900 font-semibold"
                            >
                              <option value="normal">Série {sIdx + 1}</option>
                              <option value="warmup">W (Aquecimento)</option>
                              <option value="dropset">D (Dropset)</option>
                              <option value="failure">F (Falha)</option>
                            </select>

                            <div className="col-span-3 flex items-center gap-1">
                              {meta?.measurementType === 'distance_duration' ? (
                                <>
                                  <DecimalInput
                                    value={s.distanceKm ?? 0}
                                    ariaLabel="Distância (km)"
                                    onChange={(val) => {
                                      setEditingRoutine((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              exercises: prev.exercises.map(
                                                (item, i) =>
                                                  i === exIdx
                                                    ? {
                                                        ...item,
                                                        sets: item.sets.map(
                                                          (st, j) =>
                                                            j === sIdx
                                                              ? {
                                                                  ...st,
                                                                  distanceKm:
                                                                    val ?? 0,
                                                                }
                                                              : st
                                                        ),
                                                      }
                                                    : item
                                              ),
                                            }
                                          : null
                                      );
                                    }}
                                    className="w-full text-center bg-slate-100 rounded-lg py-1 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#0084FF]"
                                  />
                                  <span className="text-slate-500">km</span>
                                </>
                              ) : (
                                <>
                                  <DecimalInput
                                    value={
                                      convertWeightFromKg(
                                        s.weightKg ?? 0,
                                        weightUnit
                                      ) ?? 0
                                    }
                                    ariaLabel={`Peso (${unitLabel})`}
                                    onChange={(val) => {
                                      const kgVal =
                                        convertWeightToKg(
                                          val ?? 0,
                                          weightUnit
                                        ) ?? 0;
                                      setEditingRoutine((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              exercises: prev.exercises.map(
                                                (item, i) =>
                                                  i === exIdx
                                                    ? {
                                                        ...item,
                                                        sets: item.sets.map(
                                                          (st, j) =>
                                                            j === sIdx
                                                              ? {
                                                                  ...st,
                                                                  weightKg:
                                                                    kgVal,
                                                                }
                                                              : st
                                                        ),
                                                      }
                                                    : item
                                              ),
                                            }
                                          : null
                                      );
                                    }}
                                    className="w-full text-center bg-slate-100 rounded-lg py-1 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#0084FF]"
                                  />
                                  <span className="text-slate-500">
                                    {unitLabel}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="col-span-3 flex items-center gap-1">
                              {meta?.measurementType === 'duration' ||
                              meta?.measurementType === 'distance_duration' ? (
                                <>
                                  <IntegerInput
                                    value={s.durationSeconds ?? 30}
                                    ariaLabel="Duração (segundos)"
                                    onChange={(val) => {
                                      setEditingRoutine((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              exercises: prev.exercises.map(
                                                (item, i) =>
                                                  i === exIdx
                                                    ? {
                                                        ...item,
                                                        sets: item.sets.map(
                                                          (st, j) =>
                                                            j === sIdx
                                                              ? {
                                                                  ...st,
                                                                  durationSeconds:
                                                                    val ?? 0,
                                                                }
                                                              : st
                                                        ),
                                                      }
                                                    : item
                                              ),
                                            }
                                          : null
                                      );
                                    }}
                                    className="w-full text-center bg-slate-100 rounded-lg py-1 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#0084FF]"
                                  />
                                  <span className="text-slate-500">seg</span>
                                </>
                              ) : (
                                <>
                                  <IntegerInput
                                    value={s.reps ?? 10}
                                    ariaLabel="Repetições"
                                    onChange={(val) => {
                                      setEditingRoutine((prev) =>
                                        prev
                                          ? {
                                              ...prev,
                                              exercises: prev.exercises.map(
                                                (item, i) =>
                                                  i === exIdx
                                                    ? {
                                                        ...item,
                                                        sets: item.sets.map(
                                                          (st, j) =>
                                                            j === sIdx
                                                              ? {
                                                                  ...st,
                                                                  reps:
                                                                    val ?? 0,
                                                                }
                                                              : st
                                                        ),
                                                      }
                                                    : item
                                              ),
                                            }
                                          : null
                                      );
                                    }}
                                    className="w-full text-center bg-slate-100 rounded-lg py-1 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-[#0084FF]"
                                  />
                                  <span className="text-slate-500">reps</span>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              aria-label="Remover série"
                              onClick={() => {
                                setEditingRoutine((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        exercises: prev.exercises.map(
                                          (item, i) =>
                                            i === exIdx
                                              ? {
                                                  ...item,
                                                  sets: item.sets.filter(
                                                    (_, j) => j !== sIdx
                                                  ),
                                                }
                                              : item
                                        ),
                                      }
                                    : null
                                );
                              }}
                              className="col-span-1 text-right text-slate-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4 inline" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingRoutine((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  exercises: prev.exercises.map((item, i) => {
                                    if (i !== exIdx) return item;
                                    const last =
                                      item.sets[item.sets.length - 1];
                                    const defaults = createDefaultSetValues(
                                      meta?.measurementType,
                                      last
                                    );
                                    return {
                                      ...item,
                                      sets: [
                                        ...item.sets,
                                        {
                                          id: uid('s'),
                                          type: 'normal',
                                          ...defaults,
                                          completed: false,
                                        },
                                      ],
                                    };
                                  }),
                                }
                              : null
                          );
                        }}
                        className="text-xs font-bold text-[#0084FF] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Série
                      </button>
                    </div>
                  );
                })}

                {showExSearch ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={exQuery}
                        onChange={(e) => setExQuery(e.target.value)}
                        placeholder="Digite o nome do exercício para buscar ou criar..."
                        className="w-full h-11 bg-transparent text-base text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        aria-label="Fechar busca de exercício"
                        onClick={() => setShowExSearch(false)}
                        className="w-11 h-11 flex items-center justify-center text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {exQuery.trim().length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={quickExMuscle}
                            onChange={(e) =>
                              setQuickExMuscle(e.target.value as MuscleGroup)
                            }
                            className="px-2 py-1 rounded-lg bg-slate-100 text-xs text-slate-900"
                          >
                            {MUSCLE_OPTIONS.map((m) => (
                              <option key={m} value={m}>
                                {MUSCLE_LABELS[m]}
                              </option>
                            ))}
                          </select>
                          <select
                            value={quickExEquip}
                            onChange={(e) =>
                              setQuickExEquip(e.target.value as EquipmentType)
                            }
                            className="px-2 py-1 rounded-lg bg-slate-100 text-xs text-slate-900"
                          >
                            {EQUIPMENT_OPTIONS.map((eq) => (
                              <option key={eq} value={eq}>
                                {EQUIPMENT_LABELS[eq]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const created = addCustomExercise({
                              title: exQuery.trim(),
                              primaryMuscle: quickExMuscle,
                              secondaryMuscles: [],
                              equipment: quickExEquip,
                              measurementType: 'weight_reps',
                              instructions: [],
                            });
                            addExerciseToDraft(created.id);
                          }}
                          className="w-full py-1.5 rounded-lg bg-[#0084FF] text-white text-xs font-bold"
                        >
                          + Criar &ldquo;{exQuery.trim()}&rdquo; e Adicionar
                        </button>
                      </div>
                    )}

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {exercises
                        .filter(
                          (e) =>
                            e.title
                              .toLowerCase()
                              .includes(exQuery.toLowerCase()) ||
                            (e.englishTitle &&
                              e.englishTitle
                                .toLowerCase()
                                .includes(exQuery.toLowerCase())) ||
                            MUSCLE_LABELS[e.primaryMuscle]
                              .toLowerCase()
                              .includes(exQuery.toLowerCase())
                        )
                        .map((e) => (
                          <button
                            type="button"
                            key={e.id}
                            onClick={() => addExerciseToDraft(e.id)}
                            className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-200/70 text-xs text-slate-900 flex items-center justify-between gap-2"
                          >
                            <span className="font-semibold truncate">
                              {e.title}
                            </span>
                            <span className="text-slate-500 shrink-0">
                              {MUSCLE_LABELS[e.primaryMuscle]} •{' '}
                              {EQUIPMENT_LABELS[e.equipment]}
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowExSearch(true)}
                    className="w-full py-3 rounded-xl border border-dashed border-[#0084FF]/50 text-[#0084FF] hover:bg-blue-50 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Exercício à Rotina
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRoutine(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0084FF] hover:bg-blue-600 text-xs font-bold text-white"
                >
                  Salvar Rotina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
