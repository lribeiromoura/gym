'use client';

import React, { useState } from 'react';
import { MuscleGroup } from '@/types/workout';

/**
 * Mini silhueta anatômica (frente e costas) para a barra de estatísticas do treino
 */
export function MiniAnatomyFigures({
  activeMuscles,
}: {
  activeMuscles: Set<MuscleGroup>;
}) {
  const isChest = activeMuscles.has('chest');
  const isShoulders = activeMuscles.has('shoulders');
  const isArms = activeMuscles.has('biceps') || activeMuscles.has('triceps');
  const isAbs = activeMuscles.has('abs');
  const isQuads = activeMuscles.has('quads');
  const isBack =
    activeMuscles.has('lats') ||
    activeMuscles.has('upper_back') ||
    activeMuscles.has('lower_back') ||
    activeMuscles.has('traps');
  const isGlutesHamstrings =
    activeMuscles.has('glutes') || activeMuscles.has('hamstrings');
  const isCalves = activeMuscles.has('calves');

  const hi = '#3B82F6';
  const base = 'currentColor';

  return (
    <div
      className="flex items-center gap-1.5 select-none text-muted-foreground/35"
      aria-hidden="true"
    >
      {/* Frente */}
      <svg viewBox="0 0 60 120" className="w-6 h-11">
        <circle cx="30" cy="11" r="7" fill="#94A3B8" />
        {/* Ombros */}
        <rect
          x="11"
          y="21"
          width="8"
          height="13"
          rx="4"
          fill={isShoulders ? hi : base}
        />
        <rect
          x="41"
          y="21"
          width="8"
          height="13"
          rx="4"
          fill={isShoulders ? hi : base}
        />
        {/* Peito */}
        <rect
          x="19"
          y="20"
          width="22"
          height="14"
          rx="3"
          fill={isChest ? hi : base}
        />
        {/* Abdômen */}
        <rect
          x="21"
          y="36"
          width="18"
          height="20"
          rx="3"
          fill={isAbs ? hi : base}
        />
        {/* Braços */}
        <rect
          x="9"
          y="35"
          width="7"
          height="22"
          rx="3"
          fill={isArms ? hi : base}
        />
        <rect
          x="44"
          y="35"
          width="7"
          height="22"
          rx="3"
          fill={isArms ? hi : base}
        />
        {/* Quadríceps */}
        <rect
          x="19"
          y="58"
          width="9"
          height="27"
          rx="4"
          fill={isQuads ? hi : base}
        />
        <rect
          x="32"
          y="58"
          width="9"
          height="27"
          rx="4"
          fill={isQuads ? hi : base}
        />
        {/* Panturrilhas */}
        <rect
          x="20"
          y="87"
          width="7"
          height="24"
          rx="3"
          fill={isCalves ? hi : base}
        />
        <rect
          x="33"
          y="87"
          width="7"
          height="24"
          rx="3"
          fill={isCalves ? hi : base}
        />
      </svg>

      {/* Costas */}
      <svg viewBox="0 0 60 120" className="w-6 h-11">
        <circle cx="30" cy="11" r="7" fill="#94A3B8" />
        {/* Ombros post */}
        <rect
          x="11"
          y="21"
          width="8"
          height="13"
          rx="4"
          fill={isShoulders ? hi : base}
        />
        <rect
          x="41"
          y="21"
          width="8"
          height="13"
          rx="4"
          fill={isShoulders ? hi : base}
        />
        {/* Dorsais / Costas */}
        <rect
          x="19"
          y="20"
          width="22"
          height="34"
          rx="4"
          fill={isBack ? hi : base}
        />
        {/* Braços */}
        <rect
          x="9"
          y="35"
          width="7"
          height="22"
          rx="3"
          fill={isArms ? hi : base}
        />
        <rect
          x="44"
          y="35"
          width="7"
          height="22"
          rx="3"
          fill={isArms ? hi : base}
        />
        {/* Glúteos e Posterior */}
        <rect
          x="19"
          y="56"
          width="9"
          height="29"
          rx="4"
          fill={isGlutesHamstrings ? hi : base}
        />
        <rect
          x="32"
          y="56"
          width="9"
          height="29"
          rx="4"
          fill={isGlutesHamstrings ? hi : base}
        />
        {/* Panturrilhas */}
        <rect
          x="20"
          y="87"
          width="7"
          height="24"
          rx="3"
          fill={isCalves ? hi : base}
        />
        <rect
          x="33"
          y="87"
          width="7"
          height="24"
          rx="3"
          fill={isCalves ? hi : base}
        />
      </svg>
    </div>
  );
}

/**
 * Avatar ilustrativo do exercício no estilo circular limpo (exibe GIF da ExerciseDB quando disponível)
 */
export function ExerciseIllustrationBadge({
  muscle,
  gifUrl,
  title,
}: {
  muscle?: MuscleGroup;
  gifUrl?: string;
  title?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="w-11 h-11 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0 overflow-hidden">
      {gifUrl && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={gifUrl}
          alt={title || 'Exercício'}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <svg viewBox="0 0 48 48" className="w-8 h-8">
          {/* Banco / Máquina estilizada */}
          <rect x="10" y="32" width="28" height="4" rx="2" fill="#64748B" />
          <rect x="14" y="12" width="4" height="22" rx="1.5" fill="#94A3B8" />
          {/* Silhueta com destaque laranja/azul no músculo */}
          <circle cx="26" cy="14" r="4" fill="#64748B" />
          <rect
            x="22"
            y="19"
            width="9"
            height="12"
            rx="3"
            fill={muscle === 'chest' ? '#F97316' : '#3B82F6'}
          />
          <line
            x1="18"
            y1="22"
            x2="36"
            y2="22"
            stroke="#475569"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="17" cy="22" r="3.5" fill="#334155" />
          <circle cx="37" cy="22" r="3.5" fill="#334155" />
        </svg>
      )}
    </div>
  );
}
