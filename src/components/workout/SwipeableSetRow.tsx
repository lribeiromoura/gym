'use client';

import React, { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SwipeableSetRowProps {
  setId: string;
  completed: boolean;
  showRpeColumn: boolean;
  onDelete: () => void;
  children: React.ReactNode;
}

/**
 * Linha de série com suporte a arrastar para a esquerda (Swipe-to-Delete).
 * Revela fundo vermelho "Excluir" ao arrastar para a esquerda; arrastar bastante exclui direto,
 * ou arrastar parcialmente trava aberto o botão vermelho "Excluir".
 */
export function SwipeableSetRow({
  setId,
  completed,
  showRpeColumn,
  onDelete,
  children,
}: SwipeableSetRowProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const offsetXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const baseOffsetRef = useRef(0);
  const directionLockedRef = useRef<'horizontal' | 'vertical' | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const REVEAL_WIDTH = 92;
  const FULL_SWIPE_DELETE_THRESHOLD = 185;

  const updateOffset = (val: number) => {
    offsetXRef.current = val;
    setOffsetX(val);
  };

  const finishDrag = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    activePointerIdRef.current = null;
    setIsDragging(false);
    directionLockedRef.current = null;

    const currentOffset = offsetXRef.current;
    if (currentOffset <= -FULL_SWIPE_DELETE_THRESHOLD) {
      updateOffset(-400);
      setTimeout(() => {
        onDelete();
      }, 150);
    } else if (currentOffset <= -40) {
      updateOffset(-REVEAL_WIDTH);
    } else {
      updateOffset(0);
    }
  };

  const beginDrag = (clientX: number, clientY: number) => {
    startXRef.current = clientX;
    startYRef.current = clientY;
    baseOffsetRef.current = offsetXRef.current;
    directionLockedRef.current = null;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const moveDrag = (
    clientX: number,
    clientY: number,
    onHorizontalLock?: () => void
  ) => {
    if (!isDraggingRef.current) return;
    const dx = clientX - startXRef.current;
    const dy = clientY - startYRef.current;

    if (!directionLockedRef.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      directionLockedRef.current =
        Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      if (directionLockedRef.current === 'horizontal') {
        onHorizontalLock?.();
      }
    }

    if (directionLockedRef.current === 'vertical') return;

    const next = Math.min(0, Math.max(-260, baseOffsetRef.current + dx));
    updateOffset(next);
  };

  // Touch Events (iPhone / Android / Mobile Webview)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    beginDrag(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    moveDrag(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    finishDrag();
  };

  // Pointer & Mouse Events (Desktop / Trackpad) — nunca captura cliques em botões ou inputs
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // handled by touch events
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, a')) return;
    activePointerIdRef.current = e.pointerId;
    beginDrag(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    moveDrag(e.clientX, e.clientY, () => {
      if (activePointerIdRef.current !== null) {
        try {
          e.currentTarget.setPointerCapture?.(activePointerIdRef.current);
        } catch {
          // Ignore if pointer already released
        }
      }
    });
  };

  const handlePointerUpOrCancel = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (
      activePointerIdRef.current !== null &&
      e.currentTarget.hasPointerCapture?.(activePointerIdRef.current)
    ) {
      try {
        e.currentTarget.releasePointerCapture?.(activePointerIdRef.current);
      } catch {
        // Ignore
      }
    }
    finishDrag();
  };

  return (
    <div
      data-testid={`set-row-${setId}`}
      className="relative overflow-hidden select-none touch-pan-y"
    >
      {/* Fundo Vermelho de Exclusão revelado ao arrastar para a esquerda */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 flex items-center justify-end bg-destructive text-destructive-foreground transition-opacity',
          offsetX < 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        style={{ width: `${Math.max(REVEAL_WIDTH, Math.abs(offsetX))}px` }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Excluir série"
          className="h-full w-full px-4 flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider text-destructive-foreground cursor-pointer"
        >
          <Trash2 className="w-4 h-4 shrink-0" />
          <span>Excluir</span>
        </button>
      </div>

      {/* Conteúdo Principal da Série que desliza para a esquerda */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onClick={() => {
          if (offsetXRef.current < -10 && !isDraggingRef.current) {
            updateOffset(0);
          }
        }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDragging
            ? 'none'
            : 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        className={cn(
          'relative z-10 grid items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 transition-colors',
          showRpeColumn
            ? 'grid-cols-[44px_minmax(0,1fr)_56px_48px_44px_44px] sm:grid-cols-[48px_minmax(0,1fr)_88px_76px_52px_44px]'
            : 'grid-cols-[44px_minmax(0,1fr)_68px_60px_44px] sm:grid-cols-[48px_minmax(0,1fr)_96px_84px_44px]',
          completed
            ? 'bg-emerald-500/15 border-l-3 border-l-emerald-500'
            : 'bg-card'
        )}
      >
        {children}
      </div>
    </div>
  );
}
