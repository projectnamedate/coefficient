/**
 * Sandwich Policy Score (15% weight)
 * Measures what percentage of a pool's delegated stake goes to known sandwich validators.
 * 0% sandwich stake = 100 score. Higher sandwich exposure = lower score.
 */

import type { DelegationEntry } from "./types";

export function scoreMevSandwich(
  poolDelegations: DelegationEntry[],
  sandwichValidators: Set<string>
): number {
  if (poolDelegations.length === 0) return 50;

  let sandwichStake = 0;
  let totalStake = 0;

  for (const d of poolDelegations) {
    totalStake += d.delegatedSol;
    if (sandwichValidators.has(d.validatorPubkey)) {
      sandwichStake += d.delegatedSol;
    }
  }

  if (totalStake === 0) return 50;

  const sandwichRatio = sandwichStake / totalStake;
  return Math.round((1 - sandwichRatio) * 100);
}
