/**
 * Commission Discipline Score (10% weight)
 * Percentage of pool's delegated validators that have commission ≤ 10%.
 */

import type { DelegationEntry } from "./types";

export function scoreCommissionDiscipline(
  poolDelegations: DelegationEntry[],
  validatorCommissions: Map<string, number> // pubkey → commission (0-100)
): number {
  if (poolDelegations.length === 0) return 50;

  const uniqueValidators = new Set(poolDelegations.map((d) => d.validatorPubkey));
  let goodCount = 0;

  for (const pubkey of uniqueValidators) {
    const commission = validatorCommissions.get(pubkey) ?? 100;
    if (commission <= 10) goodCount++;
  }

  const score = (goodCount / uniqueValidators.size) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}
