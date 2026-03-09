/**
 * Shared stake tier classification.
 * Used by both the CLI indexer (run.ts) and the cron entry point (cron-entry.ts).
 */
export function classifyStakeTier(
  stake: number,
  medianStake: number,
  superminorityThreshold: number
): string {
  if (stake >= superminorityThreshold) return "superminority";
  if (stake >= medianStake * 1.5) return "large";
  if (stake >= medianStake * 0.75) return "medium";
  return "small";
}
