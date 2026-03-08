"use client";

import { motion } from "framer-motion";

interface HistoryPoint {
  epochNumber: number;
  networkHealthScore: number;
}

interface Props {
  history: HistoryPoint[];
  className?: string;
}

export function ScoreHistoryChart({ history, className = "" }: Props) {
  if (history.length < 2) {
    return (
      <div className={`text-center text-beige/30 text-sm py-8 ${className}`}>
        Score trends will appear after multiple epochs are indexed.
      </div>
    );
  }

  const width = 600;
  const height = 200;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const minEpoch = history[0].epochNumber;
  const maxEpoch = history[history.length - 1].epochNumber;
  const epochRange = maxEpoch - minEpoch || 1;

  const scores = history.map((h) => h.networkHealthScore);
  const minScore = Math.max(Math.min(...scores) - 10, 0);
  const maxScore = Math.min(Math.max(...scores) + 10, 100);
  const scoreRange = maxScore - minScore || 1;

  function x(epoch: number) {
    return pad.left + ((epoch - minEpoch) / epochRange) * chartW;
  }
  function y(score: number) {
    return pad.top + chartH - ((score - minScore) / scoreRange) * chartH;
  }

  const linePath = history
    .map((h, i) => `${i === 0 ? "M" : "L"} ${x(h.epochNumber)} ${y(h.networkHealthScore)}`)
    .join(" ");

  const areaPath =
    linePath +
    ` L ${x(maxEpoch)} ${pad.top + chartH}` +
    ` L ${x(minEpoch)} ${pad.top + chartH} Z`;

  // Y-axis ticks
  const yTicks = [minScore, Math.round((minScore + maxScore) / 2), maxScore];

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left} y1={y(tick)} x2={width - pad.right} y2={y(tick)}
              stroke="rgba(255,255,255,0.06)" strokeWidth={0.5}
            />
            <text
              x={pad.left - 6} y={y(tick)}
              textAnchor="end" dominantBaseline="middle"
              className="fill-beige/30 text-[10px] font-mono"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="url(#scoreGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="#b5b2d9"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Dots */}
        {history.map((h, i) => (
          <motion.circle
            key={h.epochNumber}
            cx={x(h.epochNumber)}
            cy={y(h.networkHealthScore)}
            r={3}
            fill="#b5b2d9"
            stroke="#1a1a1a"
            strokeWidth={1.5}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          />
        ))}

        {/* Epoch labels */}
        {history.map((h) => (
          <text
            key={h.epochNumber}
            x={x(h.epochNumber)}
            y={height - 8}
            textAnchor="middle"
            className="fill-beige/30 text-[9px] font-mono"
          >
            {h.epochNumber}
          </text>
        ))}

        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(181,178,217,0.2)" />
            <stop offset="100%" stopColor="rgba(181,178,217,0)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
