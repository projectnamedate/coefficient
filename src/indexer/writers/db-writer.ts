import { db } from "../../db/index";
import { eq, sql, inArray } from "drizzle-orm";
import * as schema from "../../db/schema";
import { log, warn } from "../config";
import type { PoolScoreResult } from "../scoring/index";

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, (i + 1) * size)
  );
}

export async function isEpochIndexed(epochNumber: number): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.poolScores)
    .where(eq(schema.poolScores.epochNumber, epochNumber));
  return (result[0]?.count ?? 0) > 0;
}

export async function writeEpoch(epoch: {
  epochNumber: number;
  startSlot: number;
  totalStake: number;
  nakamotoCoefficient: number;
}) {
  const now = new Date().toISOString();
  await db.insert(schema.epochs).values({
    epochNumber: epoch.epochNumber,
    startSlot: epoch.startSlot,
    startedAt: now,
    totalStake: epoch.totalStake,
    nakamotoCoefficient: epoch.nakamotoCoefficient,
  }).onConflictDoNothing();
  log(`Wrote epoch ${epoch.epochNumber}`);
}

export async function writeStakePools(
  pools: { id: string; name: string; lstTicker: string; program: string }[]
) {
  const now = new Date().toISOString();
  for (const p of pools) {
    await db
      .insert(schema.stakePools)
      .values({
        id: p.id,
        name: p.name,
        lstTicker: p.lstTicker,
        program: p.program,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: schema.stakePools.id,
        set: {
          name: p.name,
          lstTicker: p.lstTicker,
          program: p.program,
        },
      });
  }
  log(`Wrote ${pools.length} stake pools`);
}

export async function writeValidators(
  validators: {
    pubkey: string;
    name: string | null;
    country: string | null;
    city: string | null;
    datacenter: string | null;
    client: string;
    sfdpStatus?: string | null;
    description?: string | null;
  }[]
) {
  const now = new Date().toISOString();
  // Drizzle SQLite doesn't support batch upsert with onConflictDoUpdate on
  // multiple rows, so we use raw SQL for bulk upsert via INSERT OR REPLACE
  const batches = chunk(validators, 50);
  for (const batch of batches) {
    await Promise.all(
      batch.map((v) =>
        db
          .insert(schema.validators)
          .values({
            pubkey: v.pubkey,
            name: v.name,
            country: v.country,
            city: v.city,
            datacenter: v.datacenter,
            client: v.client,
            sfdpStatus: v.sfdpStatus ?? null,
            description: v.description ?? null,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: schema.validators.pubkey,
            set: {
              name: v.name,
              country: v.country,
              city: v.city,
              datacenter: v.datacenter,
              client: v.client,
              sfdpStatus: v.sfdpStatus ?? null,
              description: v.description ?? null,
            },
          })
      )
    );
  }
  log(`Wrote ${validators.length} validators`);
}

export async function writeValidatorSnapshots(
  epochNumber: number,
  snapshots: {
    validatorPubkey: string;
    activeStake: number;
    commission: number;
    voteCredits: number;
    skipRate: number | null;
    apy: number | null;
    wizScore: number | null;
    stakeTier: string;
    isSuperminority: boolean;
  }[]
) {
  const batches = chunk(snapshots, 50);
  for (const batch of batches) {
    const values = batch.map((s) => ({
      epochNumber,
      validatorPubkey: s.validatorPubkey,
      activeStake: s.activeStake,
      commission: s.commission,
      voteCredits: s.voteCredits,
      skipRate: s.skipRate,
      apy: s.apy,
      wizScore: s.wizScore != null ? Math.round(s.wizScore) : null,
      stakeTier: s.stakeTier,
      isSuperminority: s.isSuperminority,
    }));
    await db.insert(schema.validatorSnapshots).values(values).onConflictDoUpdate({
      target: [schema.validatorSnapshots.epochNumber, schema.validatorSnapshots.validatorPubkey],
      set: {
        activeStake: sql`excluded.active_stake`,
        commission: sql`excluded.commission`,
        voteCredits: sql`excluded.vote_credits`,
        skipRate: sql`excluded.skip_rate`,
        apy: sql`excluded.apy`,
        wizScore: sql`excluded.wiz_score`,
        stakeTier: sql`excluded.stake_tier`,
        isSuperminority: sql`excluded.is_superminority`,
      },
    });
  }
  log(`Wrote ${snapshots.length} validator snapshots`);
}

export async function writePoolDelegations(
  epochNumber: number,
  delegations: { poolId: string; validatorPubkey: string; delegatedSol: number }[]
) {
  // Get set of known validator pubkeys to filter out FK violations
  const knownRows = await db.select({ pubkey: schema.validators.pubkey }).from(schema.validators);
  const knownValidators = new Set(knownRows.map((r) => r.pubkey));

  const valid = delegations.filter((d) => knownValidators.has(d.validatorPubkey));
  const skipped = delegations.length - valid.length;

  const batches = chunk(valid, 50);
  for (const batch of batches) {
    const values = batch.map((d) => ({
      epochNumber,
      poolId: d.poolId,
      validatorPubkey: d.validatorPubkey,
      delegatedSol: d.delegatedSol,
    }));
    await db.insert(schema.poolDelegations).values(values).onConflictDoUpdate({
      target: [schema.poolDelegations.epochNumber, schema.poolDelegations.poolId, schema.poolDelegations.validatorPubkey],
      set: {
        delegatedSol: sql`excluded.delegated_sol`,
      },
    });
  }

  if (skipped > 0) warn(`Skipped ${skipped} delegations (validator not in DB)`);
  log(`Wrote ${valid.length} pool delegations`);
}

export async function writeSandwichList(
  entries: {
    validatorPubkey: string;
    detectedDate: string;
    source: string;
    sandwichPercent: number | null;
  }[]
) {
  const knownRows = await db.select({ pubkey: schema.validators.pubkey }).from(schema.validators);
  const knownValidators = new Set(knownRows.map((r) => r.pubkey));

  const now = new Date().toISOString();
  const valid = entries.filter((e) => knownValidators.has(e.validatorPubkey));
  // Sandwich list is small (~150), upsert individually is fine
  for (const e of valid) {
    await db
      .insert(schema.sandwichList)
      .values({
        validatorPubkey: e.validatorPubkey,
        detectedDate: e.detectedDate,
        source: e.source,
        sandwichPercent: e.sandwichPercent,
        lastUpdated: now,
      })
      .onConflictDoUpdate({
        target: schema.sandwichList.validatorPubkey,
        set: {
          sandwichPercent: e.sandwichPercent,
          source: e.source,
          lastUpdated: now,
        },
      });
  }
  log(`Wrote ${valid.length} sandwich list entries`);
}

export async function writePoolScores(
  epochNumber: number,
  scores: PoolScoreResult[]
) {
  // Small number of pools, upsert individually is fine
  for (const s of scores) {
    await db
      .insert(schema.poolScores)
      .values({
        epochNumber,
        poolId: s.poolId,
        networkHealthScore: s.networkHealthScore,
        smallValidatorBias: s.smallValidatorBias,
        selfDealing: s.selfDealing,
        mevSandwichPolicy: s.mevSandwichPolicy,
        nakamotoImpact: s.nakamotoImpact,
        validatorSetSize: s.validatorSetSize,
        geographicDiversity: s.geographicDiversity,
        commissionDiscipline: s.commissionDiscipline,
        transparency: s.transparency,
        activeSolStaked: s.activeSolStaked,
        validatorCount: s.validatorCount,
        medianApy: s.medianApy,
      })
      .onConflictDoUpdate({
        target: [schema.poolScores.epochNumber, schema.poolScores.poolId],
        set: {
          networkHealthScore: s.networkHealthScore,
          smallValidatorBias: s.smallValidatorBias,
          selfDealing: s.selfDealing,
          mevSandwichPolicy: s.mevSandwichPolicy,
          nakamotoImpact: s.nakamotoImpact,
          validatorSetSize: s.validatorSetSize,
          geographicDiversity: s.geographicDiversity,
          commissionDiscipline: s.commissionDiscipline,
          transparency: s.transparency,
          activeSolStaked: s.activeSolStaked,
          validatorCount: s.validatorCount,
          medianApy: s.medianApy,
        },
      });
  }
  log(`Wrote ${scores.length} pool scores`);
}
