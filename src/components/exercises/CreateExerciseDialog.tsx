'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import {
  EQUIPMENT_LABELS,
  EquipmentType,
  Exercise,
  ExerciseMeasurementType,
  MUSCLE_LABELS,
  MuscleGroup,
} from '@/types/workout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import { cn } from '@/lib/utils';

const MUSCLE_OPTIONS = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const EQUIPMENT_OPTIONS = Object.keys(EQUIPMENT_LABELS) as EquipmentType[];

export interface CreateExerciseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (exercise: Omit<Exercise, 'id' | 'isCustom'>) => void;
}

export function CreateExerciseDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateExerciseDialogProps) {
  const [title, setTitle] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('chest');
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType>('barbell');
  const [measurementType, setMeasurementType] =
    useState<ExerciseMeasurementType>('weight_reps');
  const [instructions, setInstructions] = useState('');

  const resetForm = () => {
    setTitle('');
    setPrimaryMuscle('chest');
    setSecondaryMuscles([]);
    setEquipment('barbell');
    setMeasurementType('weight_reps');
    setInstructions('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  const handlePrimaryMuscleChange = (nextMuscle: MuscleGroup) => {
    setPrimaryMuscle(nextMuscle);
    setSecondaryMuscles((prev) => prev.filter((m) => m !== nextMuscle));
  };

  const toggleSecondaryMuscle = (muscle: MuscleGroup) => {
    setSecondaryMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    onCreate({
      title: trimmed,
      primaryMuscle,
      secondaryMuscles,
      equipment,
      measurementType,
      instructions: instructions
        .split('\n')
        .map((step) => step.trim())
        .filter(Boolean),
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Novo Exercício
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Cadastre um exercício personalizado na sua biblioteca local.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="custom-exercise-title">Nome do Exercício *</Label>
              <Input
                id="custom-exercise-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Supino Reto (Barra)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="custom-exercise-primary">
                  Músculo Primário
                </Label>
                <Select
                  value={primaryMuscle}
                  onValueChange={(value) =>
                    handlePrimaryMuscleChange(value as MuscleGroup)
                  }
                >
                  <SelectTrigger id="custom-exercise-primary">
                    <SelectValue placeholder="Selecione o músculo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {MUSCLE_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="custom-exercise-equipment">Equipamento</Label>
                <Select
                  value={equipment}
                  onValueChange={(value) =>
                    setEquipment(value as EquipmentType)
                  }
                >
                  <SelectTrigger id="custom-exercise-equipment">
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_OPTIONS.map((eq) => (
                      <SelectItem key={eq} value={eq}>
                        {EQUIPMENT_LABELS[eq]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-exercise-measurement">
                Tipo de Medição
              </Label>
              <Select
                value={measurementType}
                onValueChange={(value) =>
                  setMeasurementType(value as ExerciseMeasurementType)
                }
              >
                <SelectTrigger id="custom-exercise-measurement">
                  <SelectValue placeholder="Selecione a medição" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight_reps">
                    Peso (kg) + Repetições
                  </SelectItem>
                  <SelectItem value="bodyweight_reps">
                    Peso Corporal + Repetições
                  </SelectItem>
                  <SelectItem value="duration">
                    Duração / Tempo (Segundos)
                  </SelectItem>
                  <SelectItem value="distance_duration">
                    Distância (km) + Tempo
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Músculos Secundários (Opcional)</Label>
              <div className="flex flex-wrap gap-1.5">
                {MUSCLE_OPTIONS.filter((m) => m !== primaryMuscle).map((m) => {
                  const active = secondaryMuscles.includes(m);
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => toggleSecondaryMuscle(m)}
                      aria-pressed={active}
                      className={cn(
                        'min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer',
                        active
                          ? 'bg-primary/15 border-primary text-blue-700 dark:text-blue-400'
                          : 'bg-secondary border-border text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                      )}
                    >
                      {MUSCLE_LABELS[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-exercise-instructions">
                Instruções de Execução (Opcional, 1 passo por linha)
              </Label>
              <Textarea
                id="custom-exercise-instructions"
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={'Ajuste a altura do banco...\nEmpurre controlando a fase excêntrica...'}
              />
            </div>
          </div>

          <ResponsiveDialogFooter>
            <Button
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit">Salvar Exercício</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
