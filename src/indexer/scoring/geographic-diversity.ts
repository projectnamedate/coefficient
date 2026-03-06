/**
 * Geographic Diversity Score (10% weight)
 * Shannon entropy of stake-weighted country distribution.
 * Higher entropy = more evenly spread across countries = better.
 */

interface DelegationEntry {
  validatorPubkey: string;
  delegatedSol: number;
}

export function scoreGeographicDiversity(
  poolDelegations: DelegationEntry[],
  validatorCountries: Map<string, string>, // pubkey → country code
  totalNetworkCountries: number
): number {
  if (poolDelegations.length === 0) return 50;

  // Group stake by country
  const countryStake = new Map<string, number>();
  let totalStake = 0;

  for (const d of poolDelegations) {
    const country = validatorCountries.get(d.validatorPubkey) ?? "UNKNOWN";
    countryStake.set(country, (countryStake.get(country) ?? 0) + d.delegatedSol);
    totalStake += d.delegatedSol;
  }

  if (totalStake === 0 || countryStake.size <= 1) return 0;

  // Shannon entropy
  let entropy = 0;
  for (const stake of countryStake.values()) {
    const p = stake / totalStake;
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }

  // Normalize against maximum possible entropy
  const maxEntropy = Math.log2(Math.max(totalNetworkCountries, countryStake.size));
  if (maxEntropy === 0) return 0;

  const score = (entropy / maxEntropy) * 100;
  return Math.round(Math.max(0, Math.min(100, score)));
}
