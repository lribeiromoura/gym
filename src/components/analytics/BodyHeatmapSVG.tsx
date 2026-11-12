'use client';

import React, { useState } from 'react';
import { MUSCLE_LABELS, MuscleGroup } from '@/types/workout';

interface BodyHeatmapSVGProps {
  muscleScores?: Record<
    MuscleGroup,
    { primarySets: number; secondarySets: number; score: number; volumeKg: number }
  >;
  highlightPrimary?: MuscleGroup;
  highlightSecondary?: MuscleGroup[];
  compact?: boolean;
}

export function BodyHeatmapSVG({
  muscleScores,
  highlightPrimary,
  highlightSecondary = [],
  compact = false,
}: BodyHeatmapSVGProps) {
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

  const getMuscleColor = (muscle: MuscleGroup): string => {
    if (highlightPrimary) {
      if (muscle === highlightPrimary) return '#0084FF';
      if (highlightSecondary.includes(muscle)) return '#60A5FA';
      return '#CBD5E1';
    }

    if (!muscleScores || !muscleScores[muscle]) return '#CBD5E1';
    const score = muscleScores[muscle].score;
    if (score <= 0) return '#CBD5E1';
    if (score < 3) return '#93C5FD';
    if (score < 6) return '#3B82F6';
    if (score < 10) return '#0084FF';
    return '#1D4ED8';
  };

  const handleSelect = (muscle: MuscleGroup) => {
    if (compact) return;
    setSelectedMuscle((prev) => (prev === muscle ? null : muscle));
  };

  const activeInfo =
    selectedMuscle && muscleScores ? muscleScores[selectedMuscle] : null;

  return (
    <div className="flex flex-col items-center w-full">
      <div
        className={`grid grid-cols-2 gap-3 sm:gap-6 items-center justify-items-center w-full ${
          compact ? 'max-w-[240px]' : 'max-w-[440px]'
        }`}
      >
        {/* ================= VISTA FRONTAL ================= */}
        <div className="flex flex-col items-center w-full">
          {!compact && (
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Frente
            </span>
          )}
          <svg
            viewBox="0 0 200 420"
            className={`w-full ${compact ? 'h-44' : 'h-64 sm:h-72'} select-none`}
          >
            <circle cx="100" cy="30" r="20" fill="#94A3B8" />
            <rect x="92" y="48" width="16" height="14" rx="4" fill="#94A3B8" />

            <path
              d="M72 62 L92 52 L108 52 L128 62 L118 68 L82 68 Z"
              fill={getMuscleColor('traps')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('traps')}
            />

            <path
              d="M50 68 Q56 58 74 62 L76 92 Q56 92 48 82 Z"
              fill={getMuscleColor('shoulders')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('shoulders')}
            />
            <path
              d="M150 68 Q144 58 126 62 L124 92 Q144 92 152 82 Z"
              fill={getMuscleColor('shoulders')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('shoulders')}
            />

            <path
              d="M75 66 L99 66 L99 108 Q82 112 73 98 Z"
              fill={getMuscleColor('chest')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('chest')}
            />
            <path
              d="M101 66 L125 66 L127 98 Q118 112 101 108 Z"
              fill={getMuscleColor('chest')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('chest')}
            />

            <rect
              x="46"
              y="94"
              width="20"
              height="42"
              rx="9"
              fill={getMuscleColor('biceps')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('biceps')}
            />
            <rect
              x="134"
              y="94"
              width="20"
              height="42"
              rx="9"
              fill={getMuscleColor('biceps')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('biceps')}
            />

            <path
              d="M44 139 L64 139 L59 185 L42 185 Z"
              fill={getMuscleColor('forearms')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('forearms')}
            />
            <path
              d="M136 139 L156 139 L158 185 L141 185 Z"
              fill={getMuscleColor('forearms')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('forearms')}
            />

            <g
              fill={getMuscleColor('abs')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('abs')}
            >
              <rect x="81" y="112" width="17" height="19" rx="4" />
              <rect x="102" y="112" width="17" height="19" rx="4" />
              <rect x="81" y="134" width="17" height="19" rx="4" />
              <rect x="102" y="134" width="17" height="19" rx="4" />
              <rect x="83" y="156" width="15" height="22" rx="4" />
              <rect x="102" y="156" width="15" height="22" rx="4" />
            </g>

            <path
              d="M68 178 L80 178 L77 215 L65 208 Z"
              fill={getMuscleColor('abductors')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('abductors')}
            />
            <path
              d="M120 178 L132 178 L135 208 L123 215 Z"
              fill={getMuscleColor('abductors')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('abductors')}
            />

            <path
              d="M89 190 L98 190 L95 250 L87 245 Z"
              fill={getMuscleColor('adductors')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('adductors')}
            />
            <path
              d="M102 190 L111 190 L113 245 L105 250 Z"
              fill={getMuscleColor('adductors')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('adductors')}
            />

            <path
              d="M66 196 L88 188 L88 282 L68 282 Q60 238 66 196 Z"
              fill={getMuscleColor('quads')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('quads')}
            />
            <path
              d="M112 188 L134 196 Q140 238 132 282 L112 282 Z"
              fill={getMuscleColor('quads')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('quads')}
            />

            <path
              d="M68 294 L88 294 L84 375 L71 375 Z"
              fill={getMuscleColor('calves')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('calves')}
            />
            <path
              d="M112 294 L132 294 L129 375 L116 375 Z"
              fill={getMuscleColor('calves')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('calves')}
            />
          </svg>
        </div>

        {/* ================= VISTA POSTERIOR ================= */}
        <div className="flex flex-col items-center w-full">
          {!compact && (
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
              Costas
            </span>
          )}
          <svg
            viewBox="0 0 200 420"
            className={`w-full ${compact ? 'h-44' : 'h-64 sm:h-72'} select-none`}
          >
            <circle cx="100" cy="30" r="20" fill="#94A3B8" />

            <path
              d="M72 56 L100 48 L128 56 L112 96 L88 96 Z"
              fill={getMuscleColor('traps')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('traps')}
            />

            <path
              d="M48 68 Q56 58 72 60 L74 90 L48 84 Z"
              fill={getMuscleColor('shoulders')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('shoulders')}
            />
            <path
              d="M152 68 Q144 58 128 60 L126 90 L152 84 Z"
              fill={getMuscleColor('shoulders')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('shoulders')}
            />

            <path
              d="M74 68 L87 95 L98 95 L98 70 Z"
              fill={getMuscleColor('upper_back')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('upper_back')}
            />
            <path
              d="M126 68 L113 95 L102 95 L102 70 Z"
              fill={getMuscleColor('upper_back')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('upper_back')}
            />

            <path
              d="M72 96 L98 96 L96 146 L78 138 Z"
              fill={getMuscleColor('lats')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('lats')}
            />
            <path
              d="M102 96 L128 96 L122 138 L104 146 Z"
              fill={getMuscleColor('lats')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('lats')}
            />

            <rect
              x="84"
              y="147"
              width="32"
              height="32"
              rx="6"
              fill={getMuscleColor('lower_back')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('lower_back')}
            />

            <rect
              x="46"
              y="92"
              width="20"
              height="44"
              rx="9"
              fill={getMuscleColor('triceps')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('triceps')}
            />
            <rect
              x="134"
              y="92"
              width="20"
              height="44"
              rx="9"
              fill={getMuscleColor('triceps')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('triceps')}
            />

            <path
              d="M44 139 L64 139 L59 185 L42 185 Z"
              fill={getMuscleColor('forearms')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('forearms')}
            />
            <path
              d="M136 139 L156 139 L158 185 L141 185 Z"
              fill={getMuscleColor('forearms')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('forearms')}
            />

            <path
              d="M70 182 L99 182 L99 224 Q74 226 68 205 Z"
              fill={getMuscleColor('glutes')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('glutes')}
            />
            <path
              d="M101 182 L130 182 L132 205 Q126 226 101 224 Z"
              fill={getMuscleColor('glutes')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('glutes')}
            />

            <path
              d="M68 228 L95 228 L90 292 L70 292 Z"
              fill={getMuscleColor('hamstrings')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('hamstrings')}
            />
            <path
              d="M105 228 L132 228 L130 292 L110 292 Z"
              fill={getMuscleColor('hamstrings')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('hamstrings')}
            />

            <path
              d="M68 298 L90 298 Q93 335 84 378 L72 378 Q63 335 68 298 Z"
              fill={getMuscleColor('calves')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('calves')}
            />
            <path
              d="M110 298 L132 298 Q137 335 128 378 L116 378 Q107 335 110 298 Z"
              fill={getMuscleColor('calves')}
              className="cursor-pointer transition-colors hover:opacity-80"
              onClick={() => handleSelect('calves')}
            />
          </svg>
        </div>
      </div>

      {!compact && !highlightPrimary && (
        <div className="w-full mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#CBD5E1]" /> 0 séries
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#93C5FD]" /> 1–3 séries
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#3B82F6]" /> 4–6 séries
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#0084FF]" /> 7–10 séries
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#1D4ED8]" /> 10+ (Alta Carga)
            </span>
          </div>

          {selectedMuscle && activeInfo && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs animate-fadeIn">
              <div>
                <p className="font-semibold text-slate-900">
                  {MUSCLE_LABELS[selectedMuscle]}
                </p>
                <p className="text-slate-500">
                  {activeInfo.primarySets} séries diretas •{' '}
                  {activeInfo.secondarySets} séries sinergistas
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#0084FF] font-bold">
                  {activeInfo.score.toFixed(1)} pts
                </p>
                <p className="text-slate-500">
                  {Math.round(activeInfo.volumeKg).toLocaleString('pt-BR')} kg
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
