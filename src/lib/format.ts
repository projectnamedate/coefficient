/** Shared SOL formatting utilities. */

/** Format large SOL amounts: 1.2M, 345K, or whole numbers. */
export function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return Math.round(amount).toString();
}

/**
 * Format SOL with decimal precision for smaller amounts.
 * Uses abs() so negative values get the right threshold.
 */
export function formatSolPrecise(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(1)}K`;
  if (Math.abs(amount) >= 1) return amount.toFixed(2);
  return amount.toFixed(4);
}
