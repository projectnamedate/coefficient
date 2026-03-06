/**
 * Score Orchestrator
 * Computes all 8 sub-scores and the weighted composite for each pool.
 */

import { SCORE_WEIGHTS } from "../../lib/types";
import { scoreSmallValidatorBias } from "./small-validator-bias";
import { scoreSelfDealing } from "./self-dealing";
import { scoreMevSandwich } from "./mev-sandwich";
import { scoreNakamotoImpact, computeNakamoto } from "./nakamoto-impact";
import { scoreValidatorSetSize } from "./validator-set-size";
import { scoreGeographicDiversity } from "./geographic-diversity";
import { scoreCommissionDiscipline } from "./commission-discipline";
import { log } from "../config";

interface DelegationEntry {
  validatorPubkey: string;
  delegatedSol: number;
}

interface ValidatorInfo {
  pubkey: string;
  activatedStake: number;
  commission: number;
  country: string | null;
  apy: number | null;
}

export interface PoolScoreResult {
  poolId: string;
  networkHealthScore: number;
  smallValidatorBias: number;
  selfDealing: number;
  mevSandwichPolicy: number;
  nakamotoImpact: number;
  validatorSetSize: number;
  geographicDiversity: number;
  commissionDiscipline: number;
  transparency: number;
  activeSolStaked: number;
  validatorCount: number;
  medianApy: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeAllPoolScores(
  poolDelegations: Map<string, DelegationEntry[]>, // poolId → delegations
  validators: ValidatorInfo[],
  sandwichValidators: Set<string>
): PoolScoreResult[] {
  // Build lookup maps
  const allStakes = new Map<string, number>();
  const commissions = new Map<string, number>();
  const countries = new Map<string, string>();
  const apys = new Map<string, number>();

  for (const v of validators) {
    allStakes.set(v.pubkey, v.activatedStake);
    commissions.set(v.pubkey, v.commission);
    if (v.country) countries.set(v.pubkey, v.country);
    if (v.apy != null) apys.set(v.pubkey, v.apy);
  }

  // Compute network-wide metrics
  const allStakeValues = Array.from(allStakes.values()).filter((s) => s > 0);
  const medianStake = median(allStakeValues);
  const totalNetworkCountries = new Set(countries.values()).size;

  // Superminority threshold: stake of the validator at cumulative 33.33%
  const sortedStakes = [...allStakeValues].sort((a, b) => b - a);
  const totalStake = sortedStakes.reduce((s, v) => s + v, 0);
  let cumulative = 0;
  let superminorityThreshold = sortedStakes[0] ?? 0;
  for (const stake of sortedStakes) {
    cumulative += stake;
    if (cumulative >= totalStake / 3) {
      superminorityThreshold = stake;
      break;
    }
  }

  const nakamotoCoefficient = computeNakamoto(allStakeValues);
  log(`Network: ${validators.length} validators, median stake ${(medianStake / 1000).toFixed(0)}K SOL, Nakamoto ${nakamotoCoefficient}, ${totalNetworkCountries} countries`);

  const results: PoolScoreResult[] = [];

  for (const [poolId, delegations] of poolDelegations) {
    const uniqueValidators = new Set(delegations.map((d) => d.validatorPubkey));
    const validatorCount = uniqueValidators.size;
    const activeSolStaked = delegations.reduce((sum, d) => sum + d.delegatedSol, 0);

    // Median APY of pool's validators
    const poolApys = delegations
      .map((d) => apys.get(d.validatorPubkey))
      .filter((a): a is number => a != null);
    const medianApy = median(poolApys);

    // Compute 8 sub-scores
    const smallValidatorBias = scoreSmallValidatorBias(delegations, allStakes, medianStake, superminorityThreshold);
    const selfDealing = scoreSelfDealing(poolId);
    const mevSandwichPolicy = scoreMevSandwich(delegations, sandwichValidators);
    const nakamotoImpact = scoreNakamotoImpact(delegations, allStakes);
    const validatorSetSizeScore = scoreValidatorSetSize(validatorCount);
    const geographicDiversity = scoreGeographicDiversity(delegations, countries, totalNetworkCountries);
    const commissionDiscipline = scoreCommissionDiscipline(delegations, commissions);
    const transparency = 0; // Removed — too subjective

    // Weighted composite
    const networkHealthScore = Math.round(
      smallValidatorBias * SCORE_WEIGHTS.smallValidatorBias +
      selfDealing * SCORE_WEIGHTS.selfDealing +
      mevSandwichPolicy * SCORE_WEIGHTS.mevSandwichPolicy +
      nakamotoImpact * SCORE_WEIGHTS.nakamotoImpact +
      validatorSetSizeScore * SCORE_WEIGHTS.validatorSetSize +
      geographicDiversity * SCORE_WEIGHTS.geographicDiversity +
      commissionDiscipline * SCORE_WEIGHTS.commissionDiscipline +
      transparency * SCORE_WEIGHTS.transparency
    );

    results.push({
      poolId,
      networkHealthScore,
      smallValidatorBias,
      selfDealing,
      mevSandwichPolicy,
      nakamotoImpact,
      validatorSetSize: validatorSetSizeScore,
      geographicDiversity,
      commissionDiscipline,
      transparency,
      activeSolStaked,
      validatorCount,
      medianApy: Math.round(medianApy * 100) / 100,
    });
  }

  return results;
}
