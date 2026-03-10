/**
 * Small Validator Bias Score (20% weight)
 * Measures whether the pool delegates to validators that need stake,
 * or piles onto already-large ones.
 */

interface DelegationEntry {
  validatorPubkey: string;
  delegatedSol: number;
}

export function scoreSmallValidatorBias(
  poolDelegations: DelegationEntry[],
  allValidatorStakes: Map<string, number>, // pubkey → total SOL staked
  medianStake: number,
  superminorityThreshold: number
): number {
  if (poolDelegations.length === 0) return 50;

  let stakeToSmall = 0;
  let stakeToSuper = 0;
  let totalDelegated = 0;

  for (const d of poolDelegations) {
    const validatorTotalStake = allValidatorStakes.get(d.validatorPubkey) ?? 0;
    totalDelegated += d.delegatedSol;

    if (validatorTotalStake < medianStake * 0.75) {
      stakeToSmall += d.delegatedSol;
    }
    if (validatorTotalStake > superminorityThreshold) {
      stakeToSuper += d.delegatedSol;
    }
  }

  if (totalDelegated === 0) return 50;

  const smallRatio = stakeToSmall / totalDelegated;
  const superRatio = stakeToSuper / totalDelegated;

  const score = smallRatio * 100 - superRatio * 50;
  return Math.round(Math.max(0, Math.min(100, score)));
}
