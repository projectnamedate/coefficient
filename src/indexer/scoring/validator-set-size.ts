/**
 * Validator Set Size Score (10% weight)
 * Normalized count with diminishing returns above ~100.
 * Uses exponential curve: score = (1 - exp(-count / 80)) * 100
 */

export function scoreValidatorSetSize(validatorCount: number): number {
  if (validatorCount <= 0) return 0;
  const score = (1 - Math.exp(-validatorCount / 80)) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}
