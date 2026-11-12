'use client';

import React, { useMemo, useState } from 'react';
import {
  Copy,
  Dumbbell,
  Edit3,
  Folder,
  FolderPlus,
  Layers,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  EQUIPMENT_LABELS,
  EquipmentType,
  MUSCLE_LABELS,
  MuscleGroup,
  Routine,
  SetType,
  WorkoutExercise,
} from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';

const uid = (p = 'id') =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

export function RoutinesView() {
  const folders = useWorkoutStore((s) => s.folders);
  const routines = useWorkoutStore((s) => s.routines);
  const exercises = useWorkoutStore((s) => s.exercises);

  const startEmptyWorkout = useWorkoutStore((s) => s.startEmptyWorkout);
  const startRoutineWorkout = useWorkoutStore((s) => s.startRoutineWorkout);
  const createFolder = useWorkoutStore((s) => s.createFolder);
  const deleteFolder = useWorkoutStore((s) => s.deleteFolder);
  const saveRoutine = useWorkoutStore((s) => s.saveRoutine);
  const duplicateRoutine = useWorkoutStore((s) => s.duplicateRoutine);
  const deleteRoutine = useWorkoutStore((s) => s.deleteRoutine);
  const addCustomExercise = useWorkoutStore((s) => s.addCustomExercise);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

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

  const exerciseMap = useMemo(
    () => new Map(exercises.map((e) => [e.id, e])),
    [exercises]
  );

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
    const nextEx: WorkoutExercise = {
      id: uid('re'),
      exerciseId,
      supersetId: null,
      restTimerSeconds: 90,
      notes: '',
      sets: [
        { id: uid('s'), type: 'normal', weightKg: 20, reps: 10, completed: false },
        { id: uid('s'), type: 'normal', weightKg: 20, reps: 10, completed: false },
        { id: uid('s'), type: 'normal', weightKg: 20, reps: 10, completed: false },
      ],
    };
    setEditingRoutine({
      ...editingRoutine,
      exercises: [...editingRoutine.exercises, nextEx],
    });
    setShowExSearch(false);
    setExQuery('');
  };

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

    return (
      <div
        key={routine.id}
        className="bg-[#12151F] border border-slate-800/90 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4 transition"
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-base font-extrabold text-white">
                {routine.title}
              </h4>
              {routine.description && (
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                  {routine.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openEditRoutine(routine)}
                title="Editar Rotina"
                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => duplicateRoutine(routine.id)}
                title="Duplicar Rotina"
                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => deleteRoutine(routine.id)}
                title="Excluir Rotina"
                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold">
              {routine.exercises.length} exercícios • {totalSets} séries
            </span>
            {muscles.map((m) =>
              m ? (
                <span
                  key={m}
                  className="px-2 py-0.5 rounded-md bg-[#1D8FE1]/15 text-[#38BDF8] text-[11px] font-medium"
                >
                  {MUSCLE_LABELS[m]}
                </span>
              ) : null
            )}
          </div>

          {routine.exercises.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-slate-800/70">
              {routine.exercises.map((ex) => {
                const meta = exerciseMap.get(ex.exerciseId);
                return (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between text-xs text-slate-300"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[#1D8FE1] font-bold">
                        {ex.sets.length}×
                      </span>
                      <span className="truncate">
                        {meta?.title || 'Exercício'}
                      </span>
                      {ex.supersetId && (
                        <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                          SS
                        </span>
                      )}
                    </div>
                    <span className="text-slate-500 shrink-0">
                      {ex.sets[0]?.weightKg
                        ? `${ex.sets[0].weightKg}kg × ${ex.sets[0].reps}`
                        : `${ex.sets[0]?.reps || 10} reps`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={() => startRoutineWorkout(routine.id)}
          className="w-full py-2.5 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition"
        >
          <Play className="w-4 h-4 fill-current" /> Iniciar Rotina
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Cabeçalho e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Treino & Rotinas
          </h1>
          <p className="text-sm text-slate-400">
            Inicie um treino imediato ou monte suas pastas e rotinas personalizadas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFolderModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <FolderPlus className="w-4 h-4" /> Nova Pasta
          </button>
          <button
            onClick={() => openNewRoutineEditor()}
            className="px-4 py-2 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#1D8FE1]/20 transition"
          >
            <Plus className="w-4 h-4" /> Nova Rotina
          </button>
        </div>
      </div>

      {/* Card de Início Rápido (Treino Livre Vazio) */}
      <div className="bg-gradient-to-r from-[#131C2E] via-[#152238] to-[#121622] border border-[#1D8FE1]/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full bg-[#1D8FE1]/20 text-[#38BDF8] text-[10px] font-extrabold uppercase tracking-wider">
            Início Rápido
          </span>
          <h2 className="text-lg font-extrabold text-white">
            Iniciar Treino Livre (Em Branco)
          </h2>
          <p className="text-xs text-slate-300">
            Adicione exercícios conforme treina, com cronômetro, calculadora de anilhas e detecção de PRs.
          </p>
        </div>
        <button
          onClick={() => startEmptyWorkout('Treino Livre')}
          className="px-5 py-3 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-extrabold text-sm flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-[#1D8FE1]/25 transition"
        >
          <Play className="w-4 h-4 fill-current" /> Iniciar Treino Vazio
        </button>
      </div>

      {/* Estado Vazio Inicial ou Listagem de Pastas e Rotinas */}
      {folders.length === 0 && routines.length === 0 ? (
        <div className="bg-[#12151F] border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <Dumbbell className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Nenhuma rotina ou pasta cadastrada
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Crie sua primeira rotina ou pasta de treinos usando os botões acima, ou inicie um treino livre em branco.
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setShowFolderModal(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200"
            >
              + Criar Pasta
            </button>
            <button
              onClick={() => openNewRoutineEditor()}
              className="px-4 py-2 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-xs font-bold text-white"
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
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-[#38BDF8]" />
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                      {folder.name}
                    </h3>
                    <span className="text-xs text-slate-500">
                      ({folderRoutines.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openNewRoutineEditor(folder.id)}
                      className="text-xs text-[#38BDF8] hover:underline font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Rotina
                    </button>
                    <button
                      onClick={() => deleteFolder(folder.id)}
                      title="Excluir Pasta"
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {folderRoutines.length === 0 ? (
                  <div className="bg-[#12151F]/60 border border-dashed border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
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
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newFolderName.trim()) return;
              createFolder(newFolderName.trim());
              setNewFolderName('');
              setShowFolderModal(false);
            }}
            className="bg-[#12151F] border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-white">Criar Nova Pasta</h3>
            <input
              type="text"
              autoFocus
              required
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nome da pasta..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D14] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#1D8FE1]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#1D8FE1] text-xs font-bold text-white"
              >
                Criar Pasta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Construtor / Editor de Rotina Completo */}
      {editingRoutine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4">
          <div className="bg-[#12151F] border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h3 className="text-base font-extrabold text-white">
                {editingRoutine.id ? 'Editar Rotina' : 'Criar Nova Rotina'}
              </h3>
              <button
                onClick={() => setEditingRoutine(null)}
                className="p-1 text-slate-400 hover:text-white"
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
                  <label className="block text-xs font-bold text-slate-300 mb-1">
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
                    className="w-full px-3.5 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
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
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-sm text-white"
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
                <label className="block text-xs font-bold text-slate-300 mb-1">
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
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-xs text-white"
                />
              </div>

              <div className="space-y-4">
                {editingRoutine.exercises.map((ex, exIdx) => {
                  const meta = exerciseMap.get(ex.exerciseId);
                  return (
                    <div
                      key={ex.id}
                      className="bg-[#171B26] border border-slate-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Dumbbell className="w-4 h-4 text-[#38BDF8]" />
                          <span className="font-bold text-sm text-white">
                            {meta?.title || 'Exercício'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-[#0B0D14] border border-slate-800 rounded-lg px-2 py-1 text-[11px]">
                            <Layers className="w-3 h-3 text-purple-400 mr-1" />
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
                              className="bg-transparent text-slate-300 focus:outline-none"
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
                            className="p-1 text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {ex.sets.map((s, sIdx) => (
                          <div
                            key={s.id}
                            className="grid grid-cols-10 gap-2 items-center text-xs bg-[#0D0F17] p-2 rounded-lg"
                          >
                            <select
                              value={s.type}
                              onChange={(e) => {
                                const updated = [...editingRoutine.exercises];
                                updated[exIdx].sets[sIdx].type = e.target
                                  .value as SetType;
                                setEditingRoutine({
                                  ...editingRoutine,
                                  exercises: updated,
                                });
                              }}
                              className="col-span-3 bg-[#151926] border border-slate-800 rounded px-2 py-1 text-white"
                            >
                              <option value="normal">Série {sIdx + 1}</option>
                              <option value="warmup">W (Aquecimento)</option>
                              <option value="dropset">D (Dropset)</option>
                              <option value="failure">F (Falha)</option>
                            </select>

                            <div className="col-span-3 flex items-center gap-1">
                              <input
                                type="number"
                                value={s.weightKg ?? 0}
                                onChange={(e) => {
                                  const updated = [...editingRoutine.exercises];
                                  updated[exIdx].sets[sIdx].weightKg = Number(
                                    e.target.value
                                  );
                                  setEditingRoutine({
                                    ...editingRoutine,
                                    exercises: updated,
                                  });
                                }}
                                className="w-full text-center bg-[#151926] border border-slate-800 rounded py-1 text-white font-bold"
                              />
                              <span className="text-slate-500">kg</span>
                            </div>

                            <div className="col-span-3 flex items-center gap-1">
                              <input
                                type="number"
                                value={s.reps ?? 10}
                                onChange={(e) => {
                                  const updated = [...editingRoutine.exercises];
                                  updated[exIdx].sets[sIdx].reps = Number(
                                    e.target.value
                                  );
                                  setEditingRoutine({
                                    ...editingRoutine,
                                    exercises: updated,
                                  });
                                }}
                                className="w-full text-center bg-[#151926] border border-slate-800 rounded py-1 text-white font-bold"
                              />
                              <span className="text-slate-500">reps</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...editingRoutine.exercises];
                                updated[exIdx].sets = updated[
                                  exIdx
                                ].sets.filter((_, i) => i !== sIdx);
                                setEditingRoutine({
                                  ...editingRoutine,
                                  exercises: updated,
                                });
                              }}
                              className="col-span-1 text-right text-slate-500 hover:text-red-400"
                            >
                              <X className="w-4 h-4 inline" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...editingRoutine.exercises];
                          const last =
                            updated[exIdx].sets[updated[exIdx].sets.length - 1];
                          updated[exIdx].sets.push({
                            id: uid('s'),
                            type: 'normal',
                            weightKg: last?.weightKg ?? 20,
                            reps: last?.reps ?? 10,
                            completed: false,
                          });
                          setEditingRoutine({
                            ...editingRoutine,
                            exercises: updated,
                          });
                        }}
                        className="text-xs font-bold text-[#38BDF8] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar Série
                      </button>
                    </div>
                  );
                })}

                {showExSearch ? (
                  <div className="bg-[#0B0D14] border border-slate-800 rounded-xl p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        autoFocus
                        value={exQuery}
                        onChange={(e) => setExQuery(e.target.value)}
                        placeholder="Digite o nome do exercício para buscar ou criar..."
                        className="w-full bg-transparent text-xs text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowExSearch(false)}
                        className="text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {exQuery.trim().length > 0 && (
                      <div className="bg-[#141824] border border-slate-800 rounded-lg p-2.5 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={quickExMuscle}
                            onChange={(e) =>
                              setQuickExMuscle(e.target.value as MuscleGroup)
                            }
                            className="px-2 py-1 rounded bg-[#0B0D14] border border-slate-800 text-xs text-white"
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
                            className="px-2 py-1 rounded bg-[#0B0D14] border border-slate-800 text-xs text-white"
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
                          className="w-full py-1.5 rounded bg-[#1D8FE1] text-white text-xs font-bold"
                        >
                          + Criar &ldquo;{exQuery.trim()}&rdquo; e Adicionar
                        </button>
                      </div>
                    )}

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {exercises
                        .filter((e) =>
                          e.title.toLowerCase().includes(exQuery.toLowerCase())
                        )
                        .map((e) => (
                          <button
                            type="button"
                            key={e.id}
                            onClick={() => addExerciseToDraft(e.id)}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-xs text-white flex items-center justify-between"
                          >
                            <span>{e.title}</span>
                            <span className="text-slate-400">
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
                    className="w-full py-3 rounded-xl border border-dashed border-[#1D8FE1]/50 text-[#38BDF8] hover:bg-[#1D8FE1]/10 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Adicionar Exercício à Rotina
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRoutine(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-xs font-bold text-white"
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
