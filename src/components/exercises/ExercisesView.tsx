'use client';

import React, { useMemo, useState } from 'react';
import {
  ChevronRight,
  Dumbbell,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import {
  EQUIPMENT_LABELS,
  EquipmentType,
  Exercise,
  ExerciseMeasurementType,
  MUSCLE_LABELS,
  MuscleGroup,
} from '@/types/workout';
import { useWorkoutStore } from '@/store/useWorkoutStore';
import { getExerciseRecords } from '@/lib/calculations';
import { ExerciseDetailModal } from './ExerciseDetailModal';

const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

export function ExercisesView() {
  const exercises = useWorkoutStore((s) => s.exercises);
  const workoutHistory = useWorkoutStore((s) => s.workoutHistory);
  const activeWorkout = useWorkoutStore((s) => s.activeWorkout);
  const addExerciseToActiveWorkout = useWorkoutStore(
    (s) => s.addExerciseToActiveWorkout
  );
  const addCustomExercise = useWorkoutStore((s) => s.addCustomExercise);
  const deleteExercise = useWorkoutStore((s) => s.deleteExercise);

  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>(
    'all'
  );
  const [selectedEquipment, setSelectedEquipment] = useState<
    EquipmentType | 'all'
  >('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [customTitle, setCustomTitle] = useState('');
  const [customPrimary, setCustomPrimary] = useState<MuscleGroup>('chest');
  const [customSecondary, setCustomSecondary] = useState<MuscleGroup[]>([]);
  const [customEquipment, setCustomEquipment] =
    useState<EquipmentType>('barbell');
  const [customMeasurement, setCustomMeasurement] =
    useState<ExerciseMeasurementType>('weight_reps');
  const [customInstructions, setCustomInstructions] = useState('');

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch = ex.title
        .toLowerCase()
        .includes(search.trim().toLowerCase());
      const matchesMuscle =
        selectedMuscle === 'all' ||
        ex.primaryMuscle === selectedMuscle ||
        ex.secondaryMuscles.includes(selectedMuscle);
      const matchesEquip =
        selectedEquipment === 'all' || ex.equipment === selectedEquipment;
      return matchesSearch && matchesMuscle && matchesEquip;
    });
  }, [exercises, search, selectedMuscle, selectedEquipment]);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    addCustomExercise({
      title: customTitle.trim(),
      primaryMuscle: customPrimary,
      secondaryMuscles: customSecondary,
      equipment: customEquipment,
      measurementType: customMeasurement,
      instructions: customInstructions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setCustomTitle('');
    setCustomSecondary([]);
    setCustomInstructions('');
    setShowCustomModal(false);
  };

  const toggleSecondaryMuscle = (m: MuscleGroup) => {
    setCustomSecondary((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Biblioteca de Exercícios
          </h1>
          <p className="text-sm text-slate-400">
            {exercises.length} {exercises.length === 1 ? 'exercício cadastrado' : 'exercícios cadastrados'}
          </p>
        </div>
        <button
          onClick={() => setShowCustomModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white font-bold text-sm shadow-lg shadow-[#1D8FE1]/20 transition"
        >
          <Plus className="w-4 h-4" />
          Novo Exercício
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-[#12151F] border border-slate-800/90 rounded-2xl p-4 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar exercício..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0D14] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#1D8FE1]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[#1D8FE1]" /> Grupo Muscular
            </label>
            <select
              value={selectedMuscle}
              onChange={(e) =>
                setSelectedMuscle(e.target.value as MuscleGroup | 'all')
              }
              className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-[#1D8FE1]"
            >
              <option value="all">Todos os Músculos</option>
              {MUSCLE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABELS[m]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Dumbbell className="w-3 h-3 text-[#1D8FE1]" /> Equipamento
            </label>
            <select
              value={selectedEquipment}
              onChange={(e) =>
                setSelectedEquipment(e.target.value as EquipmentType | 'all')
              }
              className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-[#1D8FE1]"
            >
              <option value="all">Todos os Equipamentos</option>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {EQUIPMENT_LABELS[eq]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Exercícios ou Estado Vazio */}
      {exercises.length === 0 ? (
        <div className="bg-[#12151F] border border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-4">
          <Dumbbell className="w-10 h-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Nenhum exercício cadastrado ainda
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Seu banco de exercícios está limpo. Clique em &ldquo;Novo Exercício&rdquo; para cadastrar seus exercícios.
            </p>
          </div>
          <button
            onClick={() => setShowCustomModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeiro Exercício
          </button>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="bg-[#12151F] border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
          Nenhum exercício encontrado para os filtros aplicados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredExercises.map((ex) => {
            const rec = getExerciseRecords(ex.id, workoutHistory);
            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className="group bg-[#12151F] hover:bg-[#171B28] border border-slate-800/80 hover:border-[#1D8FE1]/50 rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#1D8FE1]/15 border border-[#1D8FE1]/30 flex items-center justify-center text-[#38BDF8] shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm truncate group-hover:text-[#38BDF8] transition">
                      {ex.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="text-[#38BDF8] font-medium">
                        {MUSCLE_LABELS[ex.primaryMuscle]}
                      </span>
                      <span>•</span>
                      <span>{EQUIPMENT_LABELS[ex.equipment]}</span>
                      {rec.best1RM && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                            <Trophy className="w-3 h-3" /> 1RM:{' '}
                            {rec.best1RM.value}kg
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeWorkout && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addExerciseToActiveWorkout(ex.id);
                      }}
                      title="Adicionar ao Treino Ativo"
                      className="px-2.5 py-1.5 rounded-lg bg-[#1D8FE1]/20 hover:bg-[#1D8FE1] text-[#38BDF8] hover:text-white text-xs font-bold transition"
                    >
                      + Treino
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteExercise(ex.id);
                    }}
                    title="Excluir Exercício"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Detalhes do Exercício */}
      <ExerciseDetailModal
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />

      {/* Modal Criar Exercício */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#12151F] border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1D8FE1]" />
                Novo Exercício
              </h2>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateCustom}
              className="p-5 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Nome do Exercício *
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Ex: Supino Reto (Barra)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0D14] border border-slate-800 text-sm text-white focus:outline-none focus:border-[#1D8FE1]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Músculo Primário
                  </label>
                  <select
                    value={customPrimary}
                    onChange={(e) =>
                      setCustomPrimary(e.target.value as MuscleGroup)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-xs text-white"
                  >
                    {MUSCLE_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {MUSCLE_LABELS[m]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Equipamento
                  </label>
                  <select
                    value={customEquipment}
                    onChange={(e) =>
                      setCustomEquipment(e.target.value as EquipmentType)
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-xs text-white"
                  >
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <option key={eq} value={eq}>
                        {EQUIPMENT_LABELS[eq]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tipo de Medição
                </label>
                <select
                  value={customMeasurement}
                  onChange={(e) =>
                    setCustomMeasurement(
                      e.target.value as ExerciseMeasurementType
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-xs text-white"
                >
                  <option value="weight_reps">Peso (kg) + Repetições</option>
                  <option value="bodyweight_reps">
                    Peso Corporal + Repetições
                  </option>
                  <option value="duration">Duração / Tempo (Segundos)</option>
                  <option value="distance_duration">
                    Distância (km) + Tempo
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Músculos Secundários (Opcional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_OPTIONS.filter((m) => m !== customPrimary).map(
                    (m) => {
                      const active = customSecondary.includes(m);
                      return (
                        <button
                          type="button"
                          key={m}
                          onClick={() => toggleSecondaryMuscle(m)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            active
                              ? 'bg-[#1D8FE1]/25 border-[#1D8FE1] text-[#38BDF8]'
                              : 'bg-[#0B0D14] border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {MUSCLE_LABELS[m]}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Instruções de Execução (Opcional, 1 passo por linha)
                </label>
                <textarea
                  rows={3}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="Ajuste a altura do banco...&#10;Empurre controlando a fase excêntrica..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0B0D14] border border-slate-800 text-xs text-white focus:outline-none focus:border-[#1D8FE1]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1D8FE1] hover:bg-[#167AC6] text-white text-xs font-bold"
                >
                  Salvar Exercício
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
