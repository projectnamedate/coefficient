export interface StakePool {
  id: string;
  name: string;
  lstTicker: string;
  program: string;
  activeSolStaked: number;
  validatorCount: number;
  medianApy: number;
  networkHealthScore: number;
  scores: PoolScores;
}

export interface PoolScores {
  smallValidatorBias: number;
  selfDealing: number;
  mevSandwichPolicy: number;
  nakamotoImpact: number;
  validatorSetSize: number;
  geographicDiversity: number;
  commissionDiscipline: number;
  transparency: number;
}

export interface Validator {
  pubkey: string;
  name: string;
  activeStake: number;
  commission: number;
  voteCredits: number;
  skipRate: number;
  wizScore: number;
  stakeTier: "small" | "medium" | "large" | "superminority";
  isSandwich: boolean;
  country: string;
  city: string;
  client: string;
  sfdpStatus: string;
  poolMemberships: string[];
}

export interface PoolDelegation {
  poolId: string;
  validatorPubkey: string;
  delegatedSol: number;
  epoch: number;
}

export const SCORE_WEIGHTS = {
  smallValidatorBias: 0.15,
  selfDealing: 0.20,
  mevSandwichPolicy: 0.15,
  nakamotoImpact: 0.15,
  validatorSetSize: 0.15,
  geographicDiversity: 0.10,
  commissionDiscipline: 0.10,
  transparency: 0,
} as const;

export const SCORE_LABELS: Record<keyof PoolScores, string> = {
  smallValidatorBias: "Small Validator Bias",
  selfDealing: "Self-Dealing",
  mevSandwichPolicy: "MEV/Sandwich Policy",
  nakamotoImpact: "Nakamoto Impact",
  validatorSetSize: "Validator Set Size",
  geographicDiversity: "Geographic Diversity",
  commissionDiscipline: "Commission Discipline",
  transparency: "Transparency", // weight=0, kept for schema compat
};
