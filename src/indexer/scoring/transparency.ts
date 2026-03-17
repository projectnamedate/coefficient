/**
 * Transparency Score
 * Delegates to the shared formula in src/lib/transparency.ts,
 * loading pool overrides for the indexer context.
 */

import overridesData from "../data/pool-overrides.json";
import { computeTransparencyScore } from "../../lib/transparency";

const overrides = overridesData as Record<string, any>;

export function scoreTransparency(poolId: string, validatorCount: number): number {
  const ov = overrides[poolId];
  if (!ov) return 50;

  return computeTransparencyScore(
    {
      selfDealingScore: ov.selfDealingScore ?? 50,
      mevTipsToStakers: ov.mevTipsToStakers ?? false,
      jitoClient: ov.jitoClient ?? "unknown",
      mevCommissionCap: ov.mevCommissionCap ?? null,
    },
    validatorCount
  );
}
