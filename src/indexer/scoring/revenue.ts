/**
 * Pool Revenue Calculator
 * Computes how much SOL each pool operator earns per epoch from fees.
 */

import type { PoolFeeData } from "../fetchers/stake-pools";
import { EPOCHS_PER_YEAR, log } from "../config";

// Marinade doesn't use SPL epoch fee — estimate at 6% of staking rewards
const MARINADE_ESTIMATED_FEE_PERCENT = 0.06;

export interface PoolRevenueResult {
  poolId: string;
  epochFeePercent: number;
  epochRevenueSol: number;
  cumulativeRevenueSol: number;
  feeSource: "on-chain" | "estimated";
  managerFeeAccount: string | null;
  totalPoolLamports: number;
  lastEpochTotalLamports: number;
}

export function computePoolRevenue(
  poolId: string,
  feeData: PoolFeeData | undefined,
  activeSolStaked: number,
  medianApy: number,
  previousCumulative: number,
  program: string,
): PoolRevenueResult {
  // Marinade: use estimated fee since it has a custom program
  if (program === "marinade" || !feeData) {
    const safeApy = Math.max(0, medianApy ?? 0);
    const epochYieldRate = (safeApy / 100) / EPOCHS_PER_YEAR;
    const epochRewards = activeSolStaked * epochYieldRate;
    const epochRevenueSol = epochRewards * MARINADE_ESTIMATED_FEE_PERCENT;

    return {
      poolId,
      epochFeePercent: MARINADE_ESTIMATED_FEE_PERCENT,
      epochRevenueSol: Math.max(0, epochRevenueSol),
      cumulativeRevenueSol: previousCumulative + Math.max(0, epochRevenueSol),
      feeSource: "estimated",
      managerFeeAccount: null,
      totalPoolLamports: 0,
      lastEpochTotalLamports: 0,
    };
  }

  // SPL / Sanctum-multi: use on-chain fee data
  const epochFeePercent = feeData.epochFeeDenominator > 0
    ? feeData.epochFeeNumerator / feeData.epochFeeDenominator
    : 0;

  // Estimate revenue from APY-based reward calculation.
  // Note: on-chain totalLamports growth includes both rewards and deposits,
  // so we can't use it directly. The epoch fee is only applied to reward growth.
  const safeApy = Math.max(0, medianApy ?? 0);
  const epochYieldRate = (safeApy / 100) / EPOCHS_PER_YEAR;
  const epochRewards = activeSolStaked * epochYieldRate;
  const epochRevenueSol = epochRewards * epochFeePercent;

  return {
    poolId,
    epochFeePercent,
    epochRevenueSol: Math.max(0, epochRevenueSol),
    cumulativeRevenueSol: previousCumulative + Math.max(0, epochRevenueSol),
    feeSource: "on-chain",
    managerFeeAccount: feeData.managerFeeAccount || null,
    totalPoolLamports: feeData.totalLamports,
    lastEpochTotalLamports: feeData.lastEpochTotalLamports,
  };
}

export function computeAllPoolRevenue(
  poolDelegations: { poolId: string; feeData?: PoolFeeData; program: string }[],
  scoreResults: { poolId: string; activeSolStaked: number; medianApy: number }[],
  previousCumulatives: Map<string, number>,
): PoolRevenueResult[] {
  const scoreMap = new Map(scoreResults.map((s) => [s.poolId, s]));
  const results: PoolRevenueResult[] = [];

  for (const pool of poolDelegations) {
    const score = scoreMap.get(pool.poolId);
    if (!score) continue;

    const prevCumulative = previousCumulatives.get(pool.poolId) ?? 0;
    const revenue = computePoolRevenue(
      pool.poolId,
      pool.feeData,
      score.activeSolStaked,
      score.medianApy,
      prevCumulative,
      pool.program,
    );

    results.push(revenue);
  }

  // Log summary
  const totalRevenue = results.reduce((s, r) => s + r.epochRevenueSol, 0);
  log(`Revenue: ${results.length} pools, ${totalRevenue.toFixed(2)} SOL total this epoch`);
  for (const r of results.sort((a, b) => b.epochRevenueSol - a.epochRevenueSol)) {
    const feeStr = (r.epochFeePercent * 100).toFixed(1);
    const src = r.feeSource === "estimated" ? " (est)" : "";
    log(`  ${r.poolId.padEnd(16)} ${feeStr}% fee${src} → ${r.epochRevenueSol.toFixed(2)} SOL/epoch`);
  }

  return results;
}
