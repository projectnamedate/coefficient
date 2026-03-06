import { db } from "../../db/index.js";
import { eq, sql, inArray } from "drizzle-orm";
import * as schema from "../../db/schema.js";
import { log, warn } from "../config.js";
import type { PoolScoreResult } from "../scoring/index.js";

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
  pools: { id: string; name: string; program: string }[]
) {
  const now = new Date().toISOString();
  for (const p of pools) {
    await db
      .insert(schema.stakePools)
      .values({
        id: p.id,
        name: p.name,
        lstTicker: p.id.toUpperCase(),
        program: p.program,
        createdAt: now,
      })
      .onConflictDoNothing();
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
  }[]
) {
  const now = new Date().toISOString();
  const chunks = chunk(validators, 50);

  for (const batch of chunks) {
    for (const v of batch) {
      await db
        .insert(schema.validators)
        .values({
          pubkey: v.pubkey,
          name: v.name,
          country: v.country,
          city: v.city,
          datacenter: v.datacenter,
          client: v.client,
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
          },
        });
    }
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
  const chunks = chunk(snapshots, 50);
  for (const batch of chunks) {
    for (const s of batch) {
      await db
        .insert(schema.validatorSnapshots)
        .values({
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
        })
        .onConflictDoNothing();
    }
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

  let written = 0;
  let skipped = 0;
  const chunks = chunk(delegations, 50);
  for (const batch of chunks) {
    for (const d of batch) {
      if (!knownValidators.has(d.validatorPubkey)) {
        skipped++;
        continue;
      }
      await db
        .insert(schema.poolDelegations)
        .values({
          epochNumber,
          poolId: d.poolId,
          validatorPubkey: d.validatorPubkey,
          delegatedSol: d.delegatedSol,
        })
        .onConflictDoNothing();
      written++;
    }
  }
  if (skipped > 0) warn(`Skipped ${skipped} delegations (validator not in DB)`);
  log(`Wrote ${written} pool delegations`);
}

export async function writeSandwichList(
  entries: {
    validatorPubkey: string;
    detectedDate: string;
    source: string;
    sandwichPercent: number;
  }[]
) {
  const knownRows = await db.select({ pubkey: schema.validators.pubkey }).from(schema.validators);
  const knownValidators = new Set(knownRows.map((r) => r.pubkey));

  const now = new Date().toISOString();
  let written = 0;
  for (const e of entries) {
    if (!knownValidators.has(e.validatorPubkey)) continue;
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
    written++;
  }
  log(`Wrote ${written} sandwich list entries`);
}

export async function writePoolScores(
  epochNumber: number,
  scores: PoolScoreResult[]
) {
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
