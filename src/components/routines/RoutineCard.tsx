'use client';

import React from 'react';
import {
  Check,
  ChevronDown,
  Copy,
  Edit3,
  MoreVertical,
  Play,
  Share2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Exercise, MUSCLE_LABELS, Routine } from '@/types/workout';
import { formatSetSummary } from '@/lib/calculations';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface RoutineCardProps {
  routine: Routine;
  exerciseMap: Map<string, Exercise>;
  weightUnit: 'kg' | 'lbs';
  isExpanded: boolean;
  isSuggested: boolean;
  lastTrainedLabel?: string | null;
  isSharedFeedback?: boolean;
  onToggleExpand: () => void;
  onStart: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function RoutineCard({
  routine,
  exerciseMap,
  weightUnit,
  isExpanded,
  isSuggested,
  lastTrainedLabel,
  isSharedFeedback = false,
  onToggleExpand,
  onStart,
  onShare,
  onEdit,
  onDuplicate,
  onDelete,
}: RoutineCardProps) {
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
  const musclesLabel = muscles
    .map((m) => (m ? MUSCLE_LABELS[m] : ''))
    .filter(Boolean)
    .join(' • ');

  return (
    <Card
      className={cn(
        'overflow-hidden transition-colors',
        isSuggested && 'border-primary/60 ring-1 ring-primary/20'
      )}
    >
      {/* Cabeçalho do card */}
      <div className="flex items-start gap-2 px-4 pt-4 pb-3">
        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          className="min-w-0 flex-1 text-left space-y-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          {(isSuggested || lastTrainedLabel) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {isSuggested && (
                <Badge variant="info" className="text-[11px] font-extrabold">
                  <Sparkles className="size-3" /> Próximo sugerido
                </Badge>
              )}
              {lastTrainedLabel && (
                <span className="text-xs font-medium text-muted-foreground">
                  {isSuggested ? `• ${lastTrainedLabel}` : lastTrainedLabel}
                </span>
              )}
            </div>
          )}

          <h4 className="text-lg font-extrabold text-foreground leading-snug line-clamp-2">
            {routine.title}
          </h4>
          <p className="text-[13px] text-muted-foreground">
            {routine.exercises.length}{' '}
            {routine.exercises.length === 1 ? 'exercício' : 'exercícios'} •{' '}
            {totalSets} séries
          </p>
          {musclesLabel && (
            <p className="text-[13px] font-semibold text-blue-600 dark:text-blue-400 truncate">
              {musclesLabel}
            </p>
          )}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Mais ações da rotina ${routine.title}`}
              >
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Edit3 />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onShare}>
                <Share2 />
                Compartilhar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="secondary"
            size="icon"
            onClick={onToggleExpand}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded
                ? `Recolher detalhes de ${routine.title}`
                : `Expandir detalhes de ${routine.title}`
            }
            className="rounded-full"
          >
            <ChevronDown
              className={cn(
                'size-5 transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </Button>
        </div>
      </div>

      {/* Botão principal sempre visível */}
      <div className="px-4 pb-4">
        <Button size="lg" onClick={onStart} className="w-full text-[15px]">
          <Play className="size-4 fill-current" /> Iniciar Rotina
        </Button>
      </div>

      {/* Conteúdo expandido */}
      {isExpanded && (
        <>
          <Separator />
          <div className="px-4 py-4 space-y-4 bg-secondary/40">
            {routine.description && (
              <p className="text-[13px] text-muted-foreground">
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
                      className="flex items-center justify-between gap-3 text-[14px] text-foreground"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-blue-600 dark:text-blue-400 font-bold shrink-0 tabular-nums">
                          {ex.sets.length}×
                        </span>
                        <span className="truncate font-medium">
                          {meta?.title || 'Exercício'}
                        </span>
                        {ex.supersetId && (
                          <Badge
                            variant="purple"
                            className="rounded-md px-1.5 py-0 text-[10px] shrink-0"
                          >
                            SS
                          </Badge>
                        )}
                      </div>
                      <span className="text-muted-foreground text-[13px] shrink-0 tabular-nums">
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
              <Button
                variant="secondary"
                size="lg"
                onClick={onShare}
                className={cn(
                  'text-sm',
                  isSharedFeedback
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-primary/15 border-primary/30 text-blue-700 dark:text-blue-400 hover:bg-primary/25'
                )}
              >
                {isSharedFeedback ? (
                  <>
                    <Check className="size-5" />
                    <span>Link copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="size-5" />
                    <span>Compartilhar</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onEdit}
                className="text-sm"
              >
                <Edit3 className="size-5" /> Editar
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={onDuplicate}
                className="text-sm"
              >
                <Copy className="size-5" /> Duplicar
              </Button>
              <Button
                variant="destructive-outline"
                size="lg"
                onClick={onDelete}
                className="text-sm"
              >
                <Trash2 className="size-5" /> Excluir
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
