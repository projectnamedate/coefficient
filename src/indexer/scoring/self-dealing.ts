/**
 * Self-Dealing Score (10% weight)
 * Flags pools that require validators to buy pool tokens/LSTs to receive delegation.
 * Lookup from manual overrides.
 */

import overridesData from "../data/pool-overrides.json";

const overrides = overridesData as Record<string, { selfDealingScore?: number }>;

export function scoreSelfDealing(poolId: string): number {
  return overrides[poolId]?.selfDealingScore ?? 50;
}
