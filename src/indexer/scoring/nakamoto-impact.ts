/**
 * Nakamoto Impact Score (20% weight)
 * Simulates removing a pool's delegations and measures the impact on the Nakamoto coefficient.
 * Positive impact (removing pool hurts decentralization) = high score.
 * Negative impact (removing pool helps decentralization) = low score.
 */

interface DelegationEntry {
  validatorPubkey: string;
  delegatedSol: number;
}

function computeNakamoto(stakes: number[]): number {
  if (stakes.length === 0) return 0;
  const sorted = [...stakes].sort((a, b) => b - a);
  const totalStake = sorted.reduce((sum, s) => sum + s, 0);
  if (totalStake === 0) return 0;

  const threshold = totalStake / 3; // 33.33%
  let cumulative = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i];
    if (cumulative >= threshold) return i + 1;
  }
  return sorted.length;
}

export function scoreNakamotoImpact(
  poolDelegations: DelegationEntry[],
  allValidatorStakes: Map<string, number> // pubkey → total SOL
): number {
  if (poolDelegations.length === 0) return 50;

  // Current Nakamoto coefficient
  const currentStakes = Array.from(allValidatorStakes.values());
  const currentNakamoto = computeNakamoto(currentStakes);

  // Simulate removing this pool's delegations
  const simulatedStakes = new Map(allValidatorStakes);
  for (const d of poolDelegations) {
    const current = simulatedStakes.get(d.validatorPubkey) ?? 0;
    simulatedStakes.set(d.validatorPubkey, Math.max(0, current - d.delegatedSol));
  }
  const simulatedNakamoto = computeNakamoto(Array.from(simulatedStakes.values()));

  // Impact: positive = pool helps (removing it hurts)
  const impact = currentNakamoto - simulatedNakamoto;
  const score = 50 + impact * 10;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export { computeNakamoto };
