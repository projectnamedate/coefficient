"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface PoolData {
  id: string;
  name: string;
  activeSolStaked: number;
  validatorCount: number;
  networkHealthScore: number;
}

interface Props {
  pools: PoolData[];
  currentNakamoto: number;
  totalNetworkStake: number;
}

function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

function computeNakamoto(stakes: number[]): number {
  const sorted = [...stakes].sort((a, b) => b - a);
  const total = sorted.reduce((s, v) => s + v, 0);
  if (total === 0) return 0;
  let cumulative = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i];
    if (cumulative > total / 3) return i + 1;
  }
  return sorted.length;
}

export function WhatIfSimulator({ pools, currentNakamoto, totalNetworkStake }: Props) {
  // Each pool gets a multiplier (1.0 = current, 2.0 = doubled, 0.5 = halved)
  const [multipliers, setMultipliers] = useState<Record<string, number>>(
    Object.fromEntries(pools.map((p) => [p.id, 1.0]))
  );

  const simulated = useMemo(() => {
    // Approximate: if a pool's stake doubles, it's distributed proportionally
    // across its existing validators, increasing their stake
    const poolStakes = pools.map((p) => ({
      ...p,
      newStake: p.activeSolStaked * (multipliers[p.id] ?? 1),
    }));

    const totalPoolStake = poolStakes.reduce((s, p) => s + p.newStake, 0);
    const nonPoolStake = totalNetworkStake - pools.reduce((s, p) => s + p.activeSolStaked, 0);

    // Simulate stake distribution: each pool's validators get equal shares
    // This is simplified — real impact depends on validator overlap
    const validatorStakes: number[] = [];

    for (const p of poolStakes) {
      if (p.validatorCount === 0) continue;
      const perValidator = p.newStake / p.validatorCount;
      for (let i = 0; i < p.validatorCount; i++) {
        validatorStakes.push(perValidator);
      }
    }

    // Add non-pool stake distributed across ~400 other validators
    const otherValidators = 400;
    const perOther = nonPoolStake / otherValidators;
    for (let i = 0; i < otherValidators; i++) {
      validatorStakes.push(perOther);
    }

    const newNakamoto = computeNakamoto(validatorStakes);
    const nakamotoDelta = newNakamoto - currentNakamoto;

    return { totalPoolStake, newNakamoto, nakamotoDelta };
  }, [multipliers, pools, currentNakamoto, totalNetworkStake]);

  const hasChanges = Object.values(multipliers).some((m) => m !== 1.0);

  return (
    <div>
      {/* Result banner */}
      <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-beige/40 uppercase tracking-wider">Simulated Nakamoto Coefficient</p>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="text-4xl font-bold text-white font-mono">
                {simulated.newNakamoto}
              </span>
              {hasChanges && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-lg font-mono font-semibold ${
                    simulated.nakamotoDelta > 0
                      ? "text-score-good"
                      : simulated.nakamotoDelta < 0
                        ? "text-score-bad"
                        : "text-beige/40"
                  }`}
                >
                  {simulated.nakamotoDelta > 0 ? "+" : ""}
                  {simulated.nakamotoDelta}
                </motion.span>
              )}
            </div>
            <p className="text-xs text-beige/30 mt-1">
              Current: {currentNakamoto} · {hasChanges ? "Drag sliders to simulate" : "Adjust pool stake below"}
            </p>
          </div>
          {hasChanges && (
            <button
              onClick={() => setMultipliers(Object.fromEntries(pools.map((p) => [p.id, 1.0])))}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.05] text-beige/50 hover:text-white border border-white/[0.08] transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Pool sliders */}
      <div className="space-y-3">
        {pools
          .sort((a, b) => b.activeSolStaked - a.activeSolStaked)
          .map((pool) => {
            const mult = multipliers[pool.id] ?? 1;
            const newStake = pool.activeSolStaked * mult;
            const changed = mult !== 1.0;

            return (
              <div
                key={pool.id}
                className={`gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm transition-all ${
                  changed ? "ring-1 ring-lavender/20" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-white">{pool.name}</span>
                    <span className="text-xs text-beige/30 font-mono">
                      {pool.validatorCount} vals
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-mono ${changed ? "text-lavender" : "text-beige/50"}`}>
                      {formatSol(newStake)} SOL
                    </span>
                    {changed && (
                      <span className="text-xs font-mono text-lavender/60">
                        ({mult.toFixed(1)}x)
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={mult}
                  onChange={(e) =>
                    setMultipliers((prev) => ({
                      ...prev,
                      [pool.id]: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-lavender"
                />
                <div className="flex justify-between text-[10px] text-beige/20 font-mono mt-1">
                  <span>0x</span>
                  <span>1x</span>
                  <span>2x</span>
                  <span>3x</span>
                  <span>4x</span>
                  <span>5x</span>
                </div>
              </div>
            );
          })}
      </div>

      <p className="text-xs text-beige/20 mt-4 text-center font-mono">
        Simplified simulation — assumes proportional stake distribution within each pool
      </p>
    </div>
  );
}
