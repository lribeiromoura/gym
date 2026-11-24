'use client';

import React from 'react';
import { ChevronUp, Dumbbell, Timer } from 'lucide-react';
import { formatTimerClock } from '@/lib/calculations';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface MinimizedWorkoutBarProps {
  title: string;
  elapsedLabel: string;
  restTimer: {
    isActive: boolean;
    remainingSeconds: number;
  };
  onResume: () => void;
}

/**
 * Mini-player persistente ancorado acima da barra de navegação inferior mobile
 * quando o treino ativo está minimizado.
 */
export function MinimizedWorkoutBar({
  title,
  elapsedLabel,
  restTimer,
  onResume,
}: MinimizedWorkoutBarProps) {
  return (
    <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-4 inset-x-0 md:left-72 md:right-6 z-40 px-2 md:px-0">
      <div className="bg-card/95 backdrop-blur-md text-card-foreground border border-border border-t-2 border-t-primary rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center justify-between gap-3">
        <div
          role="button"
          tabIndex={0}
          onClick={onResume}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onResume();
            }
          }}
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 min-h-11 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="info" className="px-2 py-0.5 text-[11px] gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Em andamento
              </Badge>
              <span className="text-xs font-mono font-semibold text-muted-foreground tabular-nums">
                • {elapsedLabel}
              </span>
            </div>
            <p className="text-sm font-bold text-foreground truncate mt-0.5">
              {title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {restTimer.isActive && (
            <Badge
              variant="info"
              className="h-11 px-3 rounded-xl text-xs font-mono font-bold gap-1 tabular-nums"
            >
              <Timer className="w-3.5 h-3.5" />
              {formatTimerClock(restTimer.remainingSeconds)}
            </Badge>
          )}
          <Button
            onClick={onResume}
            size="default"
            className="px-4 text-xs font-bold gap-1"
          >
            <ChevronUp className="w-4 h-4" /> Retomar
          </Button>
        </div>
      </div>
    </div>
  );
}
