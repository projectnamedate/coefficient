"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StakePool, SCORE_LABELS, SCORE_WEIGHTS, type PoolScores } from "@/lib/types";
import { ScoreBadge } from "@/components/ui/score-badge";
import { ScoreRadar } from "@/components/scorecard/score-radar";

function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

function getBarColor(s: number): string {
  if (s >= 70) return "bg-score-good";
  if (s >= 40) return "bg-score-mid";
  return "bg-score-bad";
}

function getTextColor(s: number): string {
  if (s >= 70) return "text-score-good";
  if (s >= 40) return "text-score-mid";
  return "text-score-bad";
}

const activeScoreKeys = (Object.entries(SCORE_WEIGHTS) as [keyof PoolScores, number][])
  .filter(([, w]) => w > 0);

export function CompareView({ pools, initialSelected = [] }: { pools: StakePool[]; initialSelected?: string[] }) {
  const [selected, setSelected] = useState<string[]>(
    initialSelected.filter((id) => pools.some((p) => p.id === id))
  );

  const router = useRouter();

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  // Sync URL with selection
  useEffect(() => {
    const params = selected.length > 0 ? `?pools=${selected.join(",")}` : "";
    router.replace(`/compare${params}`, { scroll: false });
  }, [selected, router]);

  const selectedPools = selected
    .map((id) => pools.find((p) => p.id === id))
    .filter(Boolean) as StakePool[];

  return (
    <div>
      {/* Pool selector */}
      <div className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm mb-6">
        <p className="text-xs text-beige/40 mb-3 font-mono">
          Select 2-3 pools to compare (click to toggle)
        </p>
        <div className="flex flex-wrap gap-2">
          {pools
            .sort((a, b) => b.networkHealthScore - a.networkHealthScore)
            .map((pool) => {
              const isSelected = selected.includes(pool.id);
              return (
                <button
                  key={pool.id}
                  onClick={() => toggle(pool.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                    isSelected
                      ? "bg-lavender/20 border-lavender/40 text-lavender"
                      : "bg-white/[0.03] border-white/[0.08] text-beige/50 hover:text-white hover:border-white/20"
                  }`}
                >
                  {pool.name}
                  <span className="ml-1.5 text-xs font-mono opacity-60">{pool.networkHealthScore}</span>
                </button>
              );
            })}
        </div>
      </div>

      {selectedPools.length < 2 ? (
        <div className="text-center py-16 text-beige/30 text-sm">
          Select at least 2 pools above to see the comparison.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Radar overlay */}
          {selectedPools.length === 2 && (
            <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-lavender/70" />
                  <span className="text-sm text-beige/60">{selectedPools[0].name}</span>
                </div>
                <span className="text-beige/20">vs</span>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-info/70" />
                  <span className="text-sm text-beige/60">{selectedPools[1].name}</span>
                </div>
              </div>
              <ScoreRadar
                scores={selectedPools[0].scores}
                compareScores={selectedPools[1].scores}
                compareName={selectedPools[1].name}
                size={320}
              />
            </div>
          )}

          {/* Side-by-side table */}
          <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">
                    Metric
                  </th>
                  {selectedPools.map((pool) => (
                    <th key={pool.id} className="px-4 py-3 text-center text-xs font-medium text-lavender uppercase tracking-wider">
                      {pool.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Overall score */}
                <tr className="border-b border-white/10 bg-lavender/[0.03]">
                  <td className="px-4 py-3 text-sm font-semibold text-white">Overall Score</td>
                  {selectedPools.map((pool) => (
                    <td key={pool.id} className="px-4 py-3 text-center">
                      <ScoreBadge score={pool.networkHealthScore} />
                    </td>
                  ))}
                </tr>

                {/* Sub-scores */}
                {activeScoreKeys.map(([key, weight]) => {
                  const scores = selectedPools.map((p) => p.scores[key]);
                  const best = Math.max(...scores);
                  return (
                    <tr key={key} className="border-b border-white/5 hover:bg-lavender/[0.02]">
                      <td className="px-4 py-3">
                        <span className="text-sm text-beige/60">{SCORE_LABELS[key]}</span>
                        <span className="text-[10px] text-beige/25 font-mono ml-2">
                          {(weight * 100).toFixed(0)}%
                        </span>
                      </td>
                      {selectedPools.map((pool) => {
                        const score = pool.scores[key];
                        const isBest = score === best && selectedPools.length > 1;
                        return (
                          <td key={pool.id} className="px-4 py-3 text-center">
                            <span className={`text-sm font-mono font-semibold ${getTextColor(score)} ${isBest ? "underline decoration-dotted underline-offset-2" : ""}`}>
                              {score}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Stats */}
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-sm text-beige/60">Total Stake</td>
                  {selectedPools.map((pool) => (
                    <td key={pool.id} className="px-4 py-3 text-center text-sm text-beige/50 font-mono">
                      {formatSol(pool.activeSolStaked)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-sm text-beige/60">Validators</td>
                  {selectedPools.map((pool) => (
                    <td key={pool.id} className="px-4 py-3 text-center text-sm text-beige/50 font-mono">
                      {pool.validatorCount}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="px-4 py-3 text-sm text-beige/60">Median APY</td>
                  {selectedPools.map((pool) => (
                    <td key={pool.id} className="px-4 py-3 text-center text-sm text-beige/50 font-mono">
                      {pool.medianApy}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm text-beige/60">Program</td>
                  {selectedPools.map((pool) => (
                    <td key={pool.id} className="px-4 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-beige/40 font-mono">
                        {pool.program}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
