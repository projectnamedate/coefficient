/**
 * Transparency Score
 * Now formula-based using self-dealing, MEV policy, and validator count.
 */

import overridesData from "../data/pool-overrides.json";

const overrides = overridesData as Record<string, any>;

export function scoreTransparency(poolId: string, validatorCount: number): number {
  const ov = overrides[poolId];
  if (!ov) return 50;

  const selfDealingScore: number = ov.selfDealingScore ?? 50;
  const mevTipsToStakers: boolean = ov.mevTipsToStakers ?? false;
  const jitoClient: boolean | string = ov.jitoClient ?? "unknown";
  const mevCommissionCap: number | null = ov.mevCommissionCap ?? null;

  // MEV score (0-100)
  let mevScore: number;
  if (mevTipsToStakers) {
    if (jitoClient === true || jitoClient === "true") {
      mevScore = mevCommissionCap != null ? 100 : 90;
    } else if (jitoClient === "partial") {
      mevScore = 75;
    } else {
      mevScore = 60;
    }
  } else {
    if (jitoClient === true || jitoClient === "true") {
      mevScore = 40;
    } else if (jitoClient === "partial") {
      mevScore = 25;
    } else {
      mevScore = 10;
    }
  }

  // Governance score (0-100) — validator set breadth
  const governanceScore = Math.min(validatorCount, 100);

  // Weighted composite
  const score = selfDealingScore * 0.45 + mevScore * 0.25 + governanceScore * 0.30;
  return Math.round(Math.max(0, Math.min(100, score)));
}
