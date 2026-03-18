"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { StakePool, SCORE_LABELS, SCORE_WEIGHTS, PoolScores } from "@/lib/types";
import { getBarColor } from "@/lib/grades";
import { ScoreBadge } from "@/components/ui/score-badge";
import { AnimatedBar } from "@/components/ui/motion";
import { formatSol, formatSolPrecise } from "@/lib/format";

function ScoreBar({ score, label, weight, index }: { score: number; label: string; weight: number; index: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 text-xs text-beige/60 shrink-0 flex justify-between">
        <span>{label}</span>
        <span className="text-beige/25">{(weight * 100).toFixed(0)}%</span>
      </div>
      <AnimatedBar
        percentage={score}
        delay={index * 0.06}
        colorClass={getBarColor(score)}
      />
      <span className="text-xs font-mono w-8 text-right text-beige/50">{score}</span>
    </div>
  );
}

function ExpandedRow({ pool }: { pool: StakePool }) {
  const scoreEntries = (Object.entries(pool.scores) as [keyof PoolScores, number][])
    .filter(([key]) => SCORE_WEIGHTS[key] > 0);

  return (
    <motion.tr
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
    >
      <td colSpan={8} className="px-6 py-4 bg-lavender/[0.03]">
        <div className="max-w-2xl space-y-2">
          <h4 className="text-sm font-semibold text-lavender mb-3">Score Breakdown</h4>
          {scoreEntries.map(([key, score], i) => (
            <ScoreBar
              key={key}
              score={score}
              label={SCORE_LABELS[key]}
              weight={SCORE_WEIGHTS[key]}
              index={i}
            />
          ))}
        </div>
      </td>
    </motion.tr>
  );
}

type SortKey = "networkHealthScore" | "activeSolStaked" | "validatorCount" | "medianApy" | "epochRevenueSol";

export function PoolTable({ pools }: { pools: StakePool[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("networkHealthScore");
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = [...pools].sort((a, b) => {
    const aVal = a[sortKey] ?? 0;
    const bVal = b[sortKey] ?? 0;
    const diff = (aVal as number) - (bVal as number);
    return sortDesc ? -diff : diff;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const SortHeader = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(k)}
      className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider cursor-pointer hover:text-lavender transition-colors duration-200 select-none"
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey === k && (
          <span className="text-lavender">{sortDesc ? "\u2193" : "\u2191"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider w-8">
              #
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">
              Pool
            </th>
            <SortHeader k="networkHealthScore">Score</SortHeader>
            <th onClick={() => handleSort("activeSolStaked")} className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider cursor-pointer hover:text-lavender transition-colors duration-200 select-none hidden sm:table-cell">
              <span className="inline-flex items-center gap-1">Stake{sortKey === "activeSolStaked" && <span className="text-lavender">{sortDesc ? "\u2193" : "\u2191"}</span>}</span>
            </th>
            <th onClick={() => handleSort("validatorCount")} className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider cursor-pointer hover:text-lavender transition-colors duration-200 select-none hidden sm:table-cell">
              <span className="inline-flex items-center gap-1">Validators{sortKey === "validatorCount" && <span className="text-lavender">{sortDesc ? "\u2193" : "\u2191"}</span>}</span>
            </th>
            <th onClick={() => handleSort("medianApy")} className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider cursor-pointer hover:text-lavender transition-colors duration-200 select-none hidden md:table-cell">
              <span className="inline-flex items-center gap-1">APY{sortKey === "medianApy" && <span className="text-lavender">{sortDesc ? "\u2193" : "\u2191"}</span>}</span>
            </th>
            <th onClick={() => handleSort("epochRevenueSol")} className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider cursor-pointer hover:text-lavender transition-colors duration-200 select-none hidden lg:table-cell">
              <span className="inline-flex items-center gap-1">Revenue/Epoch{sortKey === "epochRevenueSol" && <span className="text-lavender">{sortDesc ? "\u2193" : "\u2191"}</span>}</span>
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider hidden xl:table-cell">
              Program
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pool, index) => (
            <Fragment key={pool.id}>
              <motion.tr
                onClick={() =>
                  setExpandedId(expandedId === pool.id ? null : pool.id)
                }
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className={`border-b border-white/5 cursor-pointer transition-all duration-200 hover:bg-lavender/[0.04] ${
                  expandedId === pool.id ? "bg-lavender/[0.06]" : index % 2 === 1 ? "bg-white/[0.01]" : ""
                }`}
              >
                <td className="px-4 py-3.5 text-sm text-beige/25 font-mono tabular-nums">
                  {index + 1}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/pool/${pool.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm font-semibold text-white hover:text-lavender transition-colors"
                    >
                      {pool.name}
                    </Link>
                    <span className="text-xs text-lavender/40 font-mono hidden sm:inline">
                      {pool.lstTicker}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <ScoreBadge score={pool.networkHealthScore} size="sm" />
                </td>
                <td className="px-4 py-3.5 text-sm text-beige/60 font-mono tabular-nums hidden sm:table-cell">
                  {formatSol(pool.activeSolStaked)}
                </td>
                <td className="px-4 py-3.5 text-sm text-beige/60 font-mono tabular-nums hidden sm:table-cell">
                  {pool.validatorCount}
                </td>
                <td className="px-4 py-3.5 text-sm text-beige/60 font-mono tabular-nums hidden md:table-cell">
                  {pool.medianApy}%
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  {pool.epochRevenueSol != null ? (
                    <div className="flex flex-col">
                      <span className="text-sm text-beige/60 font-mono tabular-nums">
                        {formatSolPrecise(pool.epochRevenueSol)} SOL
                      </span>
                      {pool.epochFeePercent != null && (
                        <span className="text-[10px] text-beige/25 font-mono">
                          {(pool.epochFeePercent * 100).toFixed(1)}% fee{pool.feeSource === "estimated" ? " (est)" : ""}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-beige/20">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 hidden xl:table-cell">
                  <span className="text-xs px-2 py-0.5 rounded border border-white/[0.06] bg-white/5 text-beige/40 font-mono">
                    {pool.program}
                  </span>
                </td>
              </motion.tr>
              <AnimatePresence>
                {expandedId === pool.id && (
                  <ExpandedRow pool={pool} />
                )}
              </AnimatePresence>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
