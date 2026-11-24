'use client';

import React, { useState } from 'react';
import {
  Calculator,
  Check,
  ChevronDown,
  Clock,
  Dumbbell,
  FilePlus2,
  Gauge,
  MoreVertical,
  Plus,
} from 'lucide-react';
import {
  Exercise,
  RPEValue,
  SetType,
  WorkoutExercise,
  WorkoutSet,
} from '@/types/workout';
import {
  convertWeightFromKg,
  convertWeightToKg,
  formatWeightWithUnit,
} from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  DecimalInput,
  formatPtBrNumber,
  IntegerInput,
} from '@/components/ui/NumericInputs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ExerciseIllustrationBadge } from '@/components/workout/MiniAnatomyFigures';
import { SwipeableSetRow } from '@/components/workout/SwipeableSetRow';

const REST_OPTIONS = [
  { label: 'Desligado', val: 0 },
  { label: '45s', val: 45 },
  { label: '1m', val: 60 },
  { label: '1m 30s', val: 90 },
  { label: '2m', val: 120 },
  { label: '3m', val: 180 },
] as const;

export function formatRestLabel(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Desligado';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0 && secs > 0) return `${mins}min ${secs}s`;
  if (mins > 0) return `${mins}min`;
  return `${secs}s`;
}

function getSupersetBadgeVariant(
  supersetId: number
): 'purple' | 'info' | 'warning' | 'success' {
  const variants: ('purple' | 'info' | 'warning' | 'success')[] = [
    'purple',
    'info',
    'warning',
    'success',
  ];
  return variants[(Math.max(1, supersetId) - 1) % variants.length];
}

export interface WorkoutExerciseCardProps {
  workoutExercise: WorkoutExercise;
  exerciseMeta?: Exercise;
  prevSets: WorkoutSet[];
  showRpeColumn: boolean;
  weightUnit: 'kg' | 'lbs';
  unitLabel: string;
  onInspectExercise: (exercise: Exercise) => void;
  onOpenMenu: (workoutExerciseId: string) => void;
  onOpenPlateCalculator: (workoutExercise: WorkoutExercise) => void;
  onUpdateNotesOrRest: (
    workoutExerciseId: string,
    patch: { notes?: string; restTimerSeconds?: number }
  ) => void;
  onOpenSetSheet: (payload: {
    workoutExerciseId: string;
    setId: string;
    setNumberLabel: string;
    currentType: SetType;
  }) => void;
  onOpenRpePicker: (payload: {
    workoutExerciseId: string;
    setId: string;
    currentRpe: RPEValue;
  }) => void;
  onUpdateSet: (
    workoutExerciseId: string,
    setId: string,
    patch: Partial<WorkoutSet>
  ) => void;
  onToggleCompleteSet: (workoutExerciseId: string, setId: string) => void;
  onRemoveSet: (workoutExerciseId: string, setId: string) => void;
  onAddSet: (workoutExerciseId: string) => void;
}

export function WorkoutExerciseCard({
  workoutExercise,
  exerciseMeta,
  prevSets,
  showRpeColumn,
  weightUnit,
  unitLabel,
  onInspectExercise,
  onOpenMenu,
  onOpenPlateCalculator,
  onUpdateNotesOrRest,
  onOpenSetSheet,
  onOpenRpePicker,
  onUpdateSet,
  onToggleCompleteSet,
  onRemoveSet,
  onAddSet,
}: WorkoutExerciseCardProps) {
  const [noteManuallyOpen, setNoteManuallyOpen] = useState(false);
  const [restPopoverOpen, setRestPopoverOpen] = useState(false);

  const prevWorkingSets = prevSets.filter((ps) => ps.type !== 'warmup');
  const prevWarmupSets = prevSets.filter((ps) => ps.type === 'warmup');
  const isNoteOpen = noteManuallyOpen || Boolean(workoutExercise.notes);

  let normalSetCounter = 0;
  let workingSetCounter = 0;
  let warmupSetCounter = 0;

  const canUsePlateCalculator =
    exerciseMeta?.measurementType !== 'duration' &&
    exerciseMeta?.measurementType !== 'distance_duration' &&
    exerciseMeta?.measurementType !== 'bodyweight_reps';

  return (
    <Card className="rounded-none sm:rounded-2xl border-x-0 sm:border-x py-5 space-y-3.5 shadow-none sm:shadow-xs overflow-hidden">
      {/* Linha 1: Avatar Ilustrativo + Nome + Menu 3 Pontos (⋮) */}
      <div className="px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <ExerciseIllustrationBadge
            muscle={exerciseMeta?.primaryMuscle}
            gifUrl={exerciseMeta?.gifUrl}
            title={exerciseMeta?.title}
          />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => exerciseMeta && onInspectExercise(exerciseMeta)}
              className="text-[17px] font-bold text-blue-600 dark:text-blue-400 hover:underline text-left truncate block cursor-pointer"
            >
              {exerciseMeta?.title || 'Exercício'}
            </button>
            {workoutExercise.supersetId && (
              <Badge
                variant={getSupersetBadgeVariant(workoutExercise.supersetId)}
                className="mt-1 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider"
              >
                Superset {workoutExercise.supersetId}
              </Badge>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Opções do exercício"
          onClick={() => onOpenMenu(workoutExercise.id)}
          className="rounded-full shrink-0 text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>

      {/* Linha 2: Pílulas [Descanso] [Anilhas] e [Nota] */}
      <div className="px-4 flex flex-wrap items-center gap-2">
        <Popover open={restPopoverOpen} onOpenChange={setRestPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              className="min-h-11 h-11 px-3.5 rounded-xl text-sm font-medium gap-2"
            >
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>
                Descanso: {formatRestLabel(workoutExercise.restTimerSeconds)}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform',
                  restPopoverOpen && 'rotate-180'
                )}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-3 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Tempo de descanso
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {REST_OPTIONS.map((opt) => {
                const isSelected =
                  workoutExercise.restTimerSeconds === opt.val;
                return (
                  <Button
                    key={opt.val}
                    variant={isSelected ? 'default' : 'outline'}
                    className="min-h-11 h-11 px-2 text-xs font-bold"
                    onClick={() => {
                      onUpdateNotesOrRest(workoutExercise.id, {
                        restTimerSeconds: opt.val,
                      });
                      setRestPopoverOpen(false);
                    }}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {canUsePlateCalculator && (
          <Button
            variant="secondary"
            onClick={() => onOpenPlateCalculator(workoutExercise)}
            className="min-h-11 h-11 px-3.5 rounded-xl text-sm font-medium gap-2"
          >
            <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Anilhas</span>
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={() => setNoteManuallyOpen((prev) => !prev)}
          className="min-h-11 h-11 px-3.5 rounded-xl text-sm font-medium gap-2"
        >
          <FilePlus2 className="w-4 h-4 text-muted-foreground" />
          <span>Nota</span>
        </Button>
      </div>

      {/* Campo de Nota quando ativo */}
      {isNoteOpen && (
        <div className="px-4">
          <Input
            type="text"
            value={workoutExercise.notes}
            onChange={(e) =>
              onUpdateNotesOrRest(workoutExercise.id, {
                notes: e.target.value,
              })
            }
            placeholder="Adicionar nota ao exercício (ex: ajuste do banco, pegada...)"
          />
        </div>
      )}

      {/* Tabela de Séries (SÉRIE | ANTERIOR | KG/LBS | REPS | [RPE] | ✓) */}
      <div className="space-y-1 pt-1">
        <div
          className={cn(
            'grid items-center gap-1 sm:gap-1.5 px-3 sm:px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
            showRpeColumn
              ? 'grid-cols-[44px_minmax(0,1fr)_56px_48px_44px_44px] sm:grid-cols-[48px_minmax(0,1fr)_88px_76px_52px_44px]'
              : 'grid-cols-[44px_minmax(0,1fr)_68px_60px_44px] sm:grid-cols-[48px_minmax(0,1fr)_96px_84px_44px]'
          )}
        >
          <div className="text-center">SÉRIE</div>
          <div className="text-left pl-1">ANTERIOR</div>
          <div className="text-center flex items-center justify-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
            <span>
              {exerciseMeta?.measurementType === 'distance_duration'
                ? 'KM'
                : exerciseMeta?.measurementType === 'duration'
                ? 'EXTRA'
                : unitLabel.toUpperCase()}
            </span>
          </div>
          <div className="text-center">
            {exerciseMeta?.measurementType === 'duration' ||
            exerciseMeta?.measurementType === 'distance_duration'
              ? 'SEG'
              : 'REPS'}
          </div>
          {showRpeColumn && <div className="text-center">RPE</div>}
          <div className="text-center">✓</div>
        </div>

        {workoutExercise.sets.map((s) => {
          if (s.type === 'normal') normalSetCounter += 1;
          if (s.type === 'warmup') {
            warmupSetCounter += 1;
          } else {
            workingSetCounter += 1;
          }

          const prevSet =
            s.type === 'warmup'
              ? prevWarmupSets[warmupSetCounter - 1]
              : prevWorkingSets[workingSetCounter - 1];

          const hasPrevValues =
            Boolean(prevSet) &&
            ((prevSet?.weightKg ?? 0) > 0 ||
              (prevSet?.reps ?? 0) > 0 ||
              (prevSet?.durationSeconds ?? 0) > 0 ||
              (prevSet?.distanceKm ?? 0) > 0);

          const setLabel =
            s.type === 'warmup'
              ? 'W'
              : s.type === 'dropset'
              ? 'D'
              : s.type === 'failure'
              ? 'F'
              : String(normalSetCounter);

          const prevDisplayText = (() => {
            if (!prevSet) return '';
            if (exerciseMeta?.measurementType === 'duration') {
              return `${prevSet.durationSeconds ?? 0}s`;
            }
            if (exerciseMeta?.measurementType === 'distance_duration') {
              return `${formatPtBrNumber(prevSet.distanceKm ?? 0)}km • ${prevSet.durationSeconds ?? 0}s`;
            }
            if (
              (exerciseMeta?.measurementType === 'bodyweight_reps' ||
                exerciseMeta?.measurementType === 'assisted_bodyweight') &&
              (prevSet.weightKg ?? 0) <= 0
            ) {
              return `${prevSet.reps ?? 0} reps`;
            }
            return `${formatWeightWithUnit(
              prevSet.weightKg ?? 0,
              weightUnit
            )} × ${prevSet.reps ?? 0}`;
          })();

          const numericInputClass = cn(
            'w-full h-11 px-1 text-center rounded-xl text-base tabular-nums font-semibold transition-colors',
            s.completed
              ? 'bg-transparent text-foreground font-bold border border-transparent'
              : 'bg-secondary/70 border border-input text-foreground'
          );

          return (
            <SwipeableSetRow
              key={s.id}
              setId={s.id}
              completed={s.completed}
              showRpeColumn={showRpeColumn}
              onDelete={() => onRemoveSet(workoutExercise.id, s.id)}
            >
              {/* SÉRIE (1, 2, 3, W, D, F) — Abre Bottom Sheet de Série */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  aria-label={`Opções e tipo da série ${setLabel}`}
                  onClick={() =>
                    onOpenSetSheet({
                      workoutExerciseId: workoutExercise.id,
                      setId: s.id,
                      setNumberLabel: setLabel,
                      currentType: s.type,
                    })
                  }
                  className={cn(
                    'w-11 h-11 rounded-xl font-bold text-[15px] flex items-center justify-center border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    s.completed
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : s.type === 'warmup'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-800 dark:text-amber-400'
                      : s.type === 'dropset'
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-700 dark:text-purple-400'
                      : s.type === 'failure'
                      ? 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-400'
                      : 'bg-secondary border-border text-foreground'
                  )}
                >
                  {setLabel}
                </button>
              </div>

              {/* ANTERIOR (min-h-11 com ícone sutil ↵) */}
              <div className="min-w-0 pl-1">
                <button
                  type="button"
                  aria-label="Copiar valores da série anterior"
                  onClick={() => {
                    if (prevSet) {
                      onUpdateSet(workoutExercise.id, s.id, {
                        weightKg: prevSet.weightKg,
                        reps: prevSet.reps,
                        distanceKm: prevSet.distanceKm ?? null,
                        durationSeconds: prevSet.durationSeconds ?? null,
                      });
                    }
                  }}
                  className="min-h-11 w-full text-xs sm:text-sm text-muted-foreground font-medium flex items-center gap-1 text-left tabular-nums cursor-pointer hover:text-foreground transition-colors"
                >
                  {hasPrevValues && prevSet ? (
                    <>
                      <span className="truncate">{prevDisplayText}</span>
                      <span
                        aria-hidden="true"
                        className="text-xs text-blue-600 dark:text-blue-400 shrink-0"
                      >
                        ↵
                      </span>
                    </>
                  ) : s.type === 'warmup' ? (
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold truncate">
                      Aquecimento
                    </span>
                  ) : (
                    <span>—</span>
                  )}
                </button>
              </div>

              {/* KG / LBS / KM */}
              <div className="min-w-0">
                {exerciseMeta?.measurementType === 'distance_duration' ? (
                  <DecimalInput
                    value={s.distanceKm}
                    ariaLabel="Distância (km)"
                    onChange={(val) =>
                      onUpdateSet(workoutExercise.id, s.id, {
                        distanceKm: val,
                      })
                    }
                    className={numericInputClass}
                  />
                ) : (
                  <DecimalInput
                    value={convertWeightFromKg(s.weightKg, weightUnit)}
                    placeholder={
                      exerciseMeta?.measurementType === 'duration' ? '—' : '0'
                    }
                    ariaLabel={`Peso (${unitLabel})`}
                    onChange={(val) =>
                      onUpdateSet(workoutExercise.id, s.id, {
                        weightKg: convertWeightToKg(val, weightUnit),
                      })
                    }
                    className={numericInputClass}
                  />
                )}
              </div>

              {/* REPS / SEG */}
              <div className="min-w-0">
                {exerciseMeta?.measurementType === 'duration' ||
                exerciseMeta?.measurementType === 'distance_duration' ? (
                  <IntegerInput
                    value={s.durationSeconds}
                    ariaLabel="Duração (segundos)"
                    onChange={(val) =>
                      onUpdateSet(workoutExercise.id, s.id, {
                        durationSeconds: val,
                      })
                    }
                    className={numericInputClass}
                  />
                ) : (
                  <IntegerInput
                    value={s.reps}
                    ariaLabel="Repetições"
                    onChange={(val) =>
                      onUpdateSet(workoutExercise.id, s.id, {
                        reps: val,
                      })
                    }
                    className={numericInputClass}
                  />
                )}
              </div>

              {/* RPE (Opcional — Divulgação Progressiva) */}
              {showRpeColumn && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenRpePicker({
                        workoutExerciseId: workoutExercise.id,
                        setId: s.id,
                        currentRpe: s.rpe ?? null,
                      })
                    }
                    aria-label="Selecionar RPE"
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      s.completed
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-foreground'
                        : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {s.rpe ? (
                      <span className="text-foreground font-bold">{s.rpe}</span>
                    ) : (
                      <Gauge className="w-4 h-4 stroke-[1.8]" />
                    )}
                  </button>
                </div>
              )}

              {/* Checkbox ✓ (w-11 h-11 = 44x44px) */}
              <div className="flex justify-center">
                <button
                  type="button"
                  aria-label="Marcar série como concluída"
                  onClick={() =>
                    onToggleCompleteSet(workoutExercise.id, s.id)
                  }
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    s.completed
                      ? 'bg-success text-success-foreground shadow-sm'
                      : 'bg-secondary border border-border text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </SwipeableSetRow>
          );
        })}
      </div>

      {/* Botão Largo [+ Adicionar série] (h-11) */}
      <div className="px-4 pt-1">
        <Button
          variant="secondary"
          onClick={() => onAddSet(workoutExercise.id)}
          className="w-full h-11 rounded-xl font-semibold text-[15px] gap-2"
        >
          <Plus className="w-4 h-4 stroke-[2.2]" />
          <span>Adicionar série</span>
        </Button>
      </div>
    </Card>
  );
}
