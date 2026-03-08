"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, useSpring, useTransform, useMotionValue } from "framer-motion";

interface PoolData {
  id: string;
  name: string;
  activeSolStaked: number;
  validatorCount: number;
  networkHealthScore: number;
}

interface Delegation {
  poolId: string;
  validatorPubkey: string;
  delegatedSol: number;
}

interface ValidatorStake {
  pubkey: string;
  activeStake: number;
}

interface Props {
  pools: PoolData[];
  currentNakamoto: number;
  validatorStakes: ValidatorStake[];
  delegations: Delegation[];
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

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toString());
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    return display.on("change", (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [display]);

  return <span ref={ref}>{Math.round(value)}</span>;
}

export function WhatIfSimulator({ pools, currentNakamoto, validatorStakes, delegations }: Props) {
  const [multipliers, setMultipliers] = useState<Record<string, number>>(
    Object.fromEntries(pools.map((p) => [p.id, 1.0]))
  );

  // Pre-compute per-validator delegation breakdown (only once)
  const { baseStakes, delegationsByValidator } = useMemo(() => {
    // Group delegations by validator
    const delByVal = new Map<string, { poolId: string; delegatedSol: number }[]>();
    for (const d of delegations) {
      const existing = delByVal.get(d.validatorPubkey) ?? [];
      existing.push({ poolId: d.poolId, delegatedSol: d.delegatedSol });
      delByVal.set(d.validatorPubkey, existing);
    }

    // Compute base stake (non-pool stake) for each validator
    const bases = new Map<string, number>();
    for (const v of validatorStakes) {
      const poolTotal = (delByVal.get(v.pubkey) ?? []).reduce((s, d) => s + d.delegatedSol, 0);
      bases.set(v.pubkey, Math.max(0, v.activeStake - poolTotal));
    }

    return { baseStakes: bases, delegationsByValidator: delByVal };
  }, [validatorStakes, delegations]);

  const simulated = useMemo(() => {
    const anyChange = Object.values(multipliers).some((m) => m !== 1.0);
    if (!anyChange) {
      return { newNakamoto: currentNakamoto, nakamotoDelta: 0 };
    }

    // For each validator: simulated = base + sum(delegation * multiplier)
    const stakes: number[] = [];
    for (const v of validatorStakes) {
      const base = baseStakes.get(v.pubkey) ?? 0;
      const dels = delegationsByValidator.get(v.pubkey) ?? [];
      let poolStake = 0;
      for (const d of dels) {
        poolStake += d.delegatedSol * (multipliers[d.poolId] ?? 1);
      }
      stakes.push(base + poolStake);
    }

    const newNakamoto = computeNakamoto(stakes);
    return { newNakamoto, nakamotoDelta: newNakamoto - currentNakamoto };
  }, [multipliers, currentNakamoto, validatorStakes, baseStakes, delegationsByValidator]);

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
                <AnimatedNumber value={simulated.newNakamoto} />
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
        Uses real per-validator delegation data · {validatorStakes.length} validators · {delegations.length} active delegations
      </p>
    </div>
  );
}
