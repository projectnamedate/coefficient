import { db } from "./index";
import { eq, desc, sql } from "drizzle-orm";
import {
  stakePools,
  poolScores,
  epochs,
  validators,
  validatorSnapshots,
  poolDelegations,
  sandwichList,
} from "./schema";
import type { StakePool, PoolScores } from "@/lib/types";

/** Get the latest epoch number that has scores */
export async function getLatestScoredEpoch(): Promise<number | null> {
  const result = await db
    .select({ epochNumber: poolScores.epochNumber })
    .from(poolScores)
    .orderBy(desc(poolScores.epochNumber))
    .limit(1);
  return result[0]?.epochNumber ?? null;
}

/** Get all pools with their scores for a given epoch */
export async function getPoolsWithScores(epochNumber?: number): Promise<StakePool[]> {
  const epoch = epochNumber ?? (await getLatestScoredEpoch());
  if (!epoch) return [];

  const rows = await db
    .select({
      id: stakePools.id,
      name: stakePools.name,
      lstTicker: stakePools.lstTicker,
      program: stakePools.program,
      networkHealthScore: poolScores.networkHealthScore,
      activeSolStaked: poolScores.activeSolStaked,
      validatorCount: poolScores.validatorCount,
      medianApy: poolScores.medianApy,
      smallValidatorBias: poolScores.smallValidatorBias,
      selfDealing: poolScores.selfDealing,
      mevSandwichPolicy: poolScores.mevSandwichPolicy,
      nakamotoImpact: poolScores.nakamotoImpact,
      validatorSetSize: poolScores.validatorSetSize,
      geographicDiversity: poolScores.geographicDiversity,
      commissionDiscipline: poolScores.commissionDiscipline,
      transparency: poolScores.transparency,
    })
    .from(stakePools)
    .innerJoin(poolScores, eq(stakePools.id, poolScores.poolId))
    .where(eq(poolScores.epochNumber, epoch));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    lstTicker: r.lstTicker,
    program: r.program,
    activeSolStaked: r.activeSolStaked ?? 0,
    validatorCount: r.validatorCount ?? 0,
    medianApy: r.medianApy ?? 0,
    networkHealthScore: r.networkHealthScore,
    scores: {
      smallValidatorBias: r.smallValidatorBias,
      selfDealing: r.selfDealing,
      mevSandwichPolicy: r.mevSandwichPolicy,
      nakamotoImpact: r.nakamotoImpact,
      validatorSetSize: r.validatorSetSize,
      geographicDiversity: r.geographicDiversity,
      commissionDiscipline: r.commissionDiscipline,
      transparency: r.transparency,
    },
  }));
}

/** Get epoch metadata */
export async function getEpochInfo(epochNumber: number) {
  const result = await db
    .select()
    .from(epochs)
    .where(eq(epochs.epochNumber, epochNumber))
    .limit(1);
  return result[0] ?? null;
}

/** Get validator leaderboard for an epoch */
export async function getValidatorLeaderboard(epochNumber?: number) {
  const epoch = epochNumber ?? (await getLatestScoredEpoch());
  if (!epoch) return [];

  const rows = await db
    .select({
      pubkey: validators.pubkey,
      name: validators.name,
      country: validators.country,
      city: validators.city,
      datacenter: validators.datacenter,
      client: validators.client,
      sfdpStatus: validators.sfdpStatus,
      activeStake: validatorSnapshots.activeStake,
      commission: validatorSnapshots.commission,
      skipRate: validatorSnapshots.skipRate,
      apy: validatorSnapshots.apy,
      wizScore: validatorSnapshots.wizScore,
      stakeTier: validatorSnapshots.stakeTier,
      isSuperminority: validatorSnapshots.isSuperminority,
    })
    .from(validators)
    .innerJoin(
      validatorSnapshots,
      eq(validators.pubkey, validatorSnapshots.validatorPubkey)
    )
    .where(eq(validatorSnapshots.epochNumber, epoch))
    .orderBy(desc(validatorSnapshots.wizScore));

  // Get sandwich status for all validators
  const sandwichRows = await db.select().from(sandwichList);
  const sandwichMap = new Map(sandwichRows.map((r) => [r.validatorPubkey, r]));

  // Get pool memberships
  const delegationRows = await db
    .select({
      validatorPubkey: poolDelegations.validatorPubkey,
      poolId: poolDelegations.poolId,
      poolName: stakePools.name,
      delegatedSol: poolDelegations.delegatedSol,
    })
    .from(poolDelegations)
    .innerJoin(stakePools, eq(poolDelegations.poolId, stakePools.id))
    .where(eq(poolDelegations.epochNumber, epoch));

  const poolMap = new Map<string, { poolId: string; poolName: string; delegatedSol: number }[]>();
  for (const d of delegationRows) {
    const existing = poolMap.get(d.validatorPubkey) ?? [];
    existing.push({ poolId: d.poolId, poolName: d.poolName, delegatedSol: d.delegatedSol });
    poolMap.set(d.validatorPubkey, existing);
  }

  return rows.map((r) => ({
    ...r,
    isSandwich: sandwichMap.has(r.pubkey),
    sandwichPercent: sandwichMap.get(r.pubkey)?.sandwichPercent ?? null,
    pools: poolMap.get(r.pubkey) ?? [],
  }));
}

/** Get delegation flows for the Sankey diagram */
export async function getDelegationFlows(epochNumber?: number) {
  const epoch = epochNumber ?? (await getLatestScoredEpoch());
  if (!epoch) return { pools: [], validators: [], flows: [] };

  const flows = await db
    .select({
      poolId: poolDelegations.poolId,
      poolName: stakePools.name,
      validatorPubkey: poolDelegations.validatorPubkey,
      validatorName: validators.name,
      delegatedSol: poolDelegations.delegatedSol,
    })
    .from(poolDelegations)
    .innerJoin(stakePools, eq(poolDelegations.poolId, stakePools.id))
    .innerJoin(validators, eq(poolDelegations.validatorPubkey, validators.pubkey))
    .where(eq(poolDelegations.epochNumber, epoch));

  const poolSet = new Map<string, string>();
  const validatorSet = new Map<string, string>();
  for (const f of flows) {
    poolSet.set(f.poolId, f.poolName);
    validatorSet.set(f.validatorPubkey, f.validatorName ?? f.validatorPubkey.slice(0, 8));
  }

  return {
    pools: Array.from(poolSet.entries()).map(([id, name]) => ({ id, name })),
    validators: Array.from(validatorSet.entries()).map(([pubkey, name]) => ({ pubkey, name })),
    flows: flows.map((f) => ({
      source: f.poolId,
      target: f.validatorPubkey,
      value: f.delegatedSol,
    })),
  };
}
