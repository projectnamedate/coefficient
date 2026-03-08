"use client";

import { SCORE_LABELS, SCORE_WEIGHTS, type PoolScores } from "@/lib/types";

interface ScoreRadarProps {
  scores: PoolScores;
  size?: number;
  className?: string;
  compareScores?: PoolScores;
  compareName?: string;
}

const ACTIVE_KEYS = (Object.entries(SCORE_WEIGHTS) as [keyof PoolScores, number][])
  .filter(([, w]) => w > 0)
  .map(([k]) => k);

export function ScoreRadar({ scores, size = 280, compareScores, className = "" }: ScoreRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 40;
  const n = ACTIVE_KEYS.length;

  function polarToCart(angle: number, radius: number) {
    const a = (angle - 90) * (Math.PI / 180);
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  }

  const angleStep = 360 / n;

  // Grid rings
  const rings = [25, 50, 75, 100];

  // Build polygon points
  function buildPolygon(s: PoolScores) {
    return ACTIVE_KEYS.map((key, i) => {
      const val = s[key] ?? 0;
      const pt = polarToCart(i * angleStep, (val / 100) * r);
      return `${pt.x},${pt.y}`;
    }).join(" ");
  }

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[280px] mx-auto">
        {/* Grid rings */}
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={ACTIVE_KEYS.map((_, i) => {
              const pt = polarToCart(i * angleStep, (ring / 100) * r);
              return `${pt.x},${pt.y}`;
            }).join(" ")}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={0.5}
          />
        ))}

        {/* Axis lines */}
        {ACTIVE_KEYS.map((_, i) => {
          const pt = polarToCart(i * angleStep, r);
          return (
            <line
              key={i}
              x1={cx} y1={cy} x2={pt.x} y2={pt.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Compare polygon (behind) */}
        {compareScores && (
          <polygon
            points={buildPolygon(compareScores)}
            fill="rgba(78,95,171,0.15)"
            stroke="rgba(78,95,171,0.6)"
            strokeWidth={1.5}
          />
        )}

        {/* Main polygon */}
        <polygon
          points={buildPolygon(scores)}
          fill="rgba(181,178,217,0.15)"
          stroke="rgba(181,178,217,0.7)"
          strokeWidth={2}
        />

        {/* Score dots */}
        {ACTIVE_KEYS.map((key, i) => {
          const val = scores[key] ?? 0;
          const pt = polarToCart(i * angleStep, (val / 100) * r);
          return (
            <circle
              key={key}
              cx={pt.x} cy={pt.y} r={3}
              fill="#b5b2d9"
              stroke="#1a1a1a"
              strokeWidth={1}
            />
          );
        })}

        {/* Labels */}
        {ACTIVE_KEYS.map((key, i) => {
          const pt = polarToCart(i * angleStep, r + 20);
          const label = SCORE_LABELS[key].replace("MEV/Sandwich Policy", "MEV").replace("Commission Discipline", "Commission");
          return (
            <text
              key={key}
              x={pt.x} y={pt.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-beige/40 text-[9px] font-mono"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
