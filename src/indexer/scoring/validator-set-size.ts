/**
 * Stake Distribution Score (15% weight)
 * Measures how evenly a pool distributes its stake across validators,
 * with a small bonus for delegating to more validators.
 *
 * 80% of score: Normalized Shannon entropy of stake distribution (evenness)
 * 20% of score: Diminishing-returns count bonus (breadth)
 */

interface DelegationEntry {
  validatorPubkey: string;
  delegatedSol: number;
}

function shannonEntropy(shares: number[]): number {
  let h = 0;
  for (const p of shares) {
    if (p > 0) h -= p * Math.log(p);
  }
  return h;
}

export function scoreStakeDistribution(delegations: DelegationEntry[]): number {
  if (delegations.length <= 1) return 0;

  // Aggregate stake per unique validator
  const stakeByValidator = new Map<string, number>();
  for (const d of delegations) {
    stakeByValidator.set(
      d.validatorPubkey,
      (stakeByValidator.get(d.validatorPubkey) ?? 0) + d.delegatedSol
    );
  }

  const stakes = Array.from(stakeByValidator.values());
  const n = stakes.length;
  if (n <= 1) return 0;

  const totalStake = stakes.reduce((sum, s) => sum + s, 0);
  if (totalStake === 0) return 0;

  // Normalized entropy: 0 (all to one) → 1 (perfectly even)
  const shares = stakes.map((s) => s / totalStake);
  const entropy = shannonEntropy(shares);
  const maxEntropy = Math.log(n);
  const evenness = entropy / maxEntropy; // 0..1

  // Count bonus: diminishing returns, plateaus around 50 validators
  const countBonus = (1 - Math.exp(-n / 50)) * 100;

  const score = evenness * 80 + countBonus * 0.2;
  return Math.round(Math.max(0, Math.min(100, score)));
}

// Keep old export name for backwards compatibility in scoring/index.ts
export const scoreValidatorSetSize = scoreStakeDistribution;
