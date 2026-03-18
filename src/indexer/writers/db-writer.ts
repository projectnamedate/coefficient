import { db } from "../../db/index";
import { eq, sql, inArray, desc } from "drizzle-orm";
import * as schema from "../../db/schema";
import { log, warn } from "../config";
import type { PoolScoreResult } from "../scoring/index";
import type { PoolRevenueResult } from "../scoring/revenue";
import type { FeeEvent, FeeAccountBalance } from "../fetchers/fee-tracker";

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
  pools: {
    id: string;
    name: string;
    lstTicker: string;
    program: string;
    epochFeeNumerator?: number;
    epochFeeDenominator?: number;
    depositFeeNumerator?: number;
    depositFeeDenominator?: number;
    withdrawalFeeNumerator?: number;
    withdrawalFeeDenominator?: number;
    managerFeeAccount?: string;
    managerWallet?: string;
  }[]
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
        epochFeeNumerator: p.epochFeeNumerator ?? null,
        epochFeeDenominator: p.epochFeeDenominator ?? null,
        depositFeeNumerator: p.depositFeeNumerator ?? null,
        depositFeeDenominator: p.depositFeeDenominator ?? null,
        withdrawalFeeNumerator: p.withdrawalFeeNumerator ?? null,
        withdrawalFeeDenominator: p.withdrawalFeeDenominator ?? null,
        managerFeeAccount: p.managerFeeAccount ?? null,
        managerWallet: p.managerWallet ?? null,
        createdAt: now,
      })
      .onConflictDoUpdate({
        target: schema.stakePools.id,
        set: {
          name: p.name,
          lstTicker: p.lstTicker,
          program: p.program,
          epochFeeNumerator: p.epochFeeNumerator ?? null,
          epochFeeDenominator: p.epochFeeDenominator ?? null,
          depositFeeNumerator: p.depositFeeNumerator ?? null,
          depositFeeDenominator: p.depositFeeDenominator ?? null,
          withdrawalFeeNumerator: p.withdrawalFeeNumerator ?? null,
          withdrawalFeeDenominator: p.withdrawalFeeDenominator ?? null,
          managerFeeAccount: p.managerFeeAccount ?? null,
          managerWallet: p.managerWallet ?? null,
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
  scores: PoolScoreResult[],
  revenueResults?: PoolRevenueResult[]
) {
  const revenueMap = new Map(revenueResults?.map((r) => [r.poolId, r]) ?? []);

  // Small number of pools, upsert individually is fine
  for (const s of scores) {
    const rev = revenueMap.get(s.poolId);
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
        epochFeePercent: rev?.epochFeePercent ?? null,
        epochRevenueSol: rev?.epochRevenueSol ?? null,
        cumulativeRevenueSol: rev?.cumulativeRevenueSol ?? null,
        feeSource: rev?.feeSource ?? null,
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
          epochFeePercent: rev?.epochFeePercent ?? null,
          epochRevenueSol: rev?.epochRevenueSol ?? null,
          cumulativeRevenueSol: rev?.cumulativeRevenueSol ?? null,
          feeSource: rev?.feeSource ?? null,
        },
      });
  }
  log(`Wrote ${scores.length} pool scores`);
}

export async function writePoolFeeSnapshots(
  epochNumber: number,
  revenueResults: PoolRevenueResult[]
) {
  for (const r of revenueResults) {
    await db
      .insert(schema.poolFeeSnapshots)
      .values({
        epochNumber,
        poolId: r.poolId,
        epochFeePercent: r.epochFeePercent,
        totalPoolLamports: r.totalPoolLamports,
        lastEpochTotalLamports: r.lastEpochTotalLamports,
        epochRevenueSol: r.epochRevenueSol,
        cumulativeRevenueSol: r.cumulativeRevenueSol,
        managerFeeAccount: r.managerFeeAccount,
        feeSource: r.feeSource,
      })
      .onConflictDoUpdate({
        target: [schema.poolFeeSnapshots.epochNumber, schema.poolFeeSnapshots.poolId],
        set: {
          epochFeePercent: r.epochFeePercent,
          totalPoolLamports: r.totalPoolLamports,
          lastEpochTotalLamports: r.lastEpochTotalLamports,
          epochRevenueSol: r.epochRevenueSol,
          cumulativeRevenueSol: r.cumulativeRevenueSol,
          managerFeeAccount: r.managerFeeAccount,
          feeSource: r.feeSource,
        },
      });
  }
  log(`Wrote ${revenueResults.length} pool fee snapshots`);
}

export async function writePoolFeeEvents(
  epochNumber: number,
  events: FeeEvent[]
) {
  const now = new Date().toISOString();
  const valid = events.filter((e) => e.txSignature);
  const batches = chunk(valid, 50);
  for (const batch of batches) {
    const values = batch.map((e) => ({
      epochNumber,
      poolId: e.poolId,
      eventType: e.eventType,
      amountSol: e.amountSol,
      txSignature: e.txSignature,
      destination: e.destination,
      destinationLabel: e.destinationLabel,
      blockTime: e.blockTime,
      createdAt: now,
    }));
    await db.insert(schema.poolFeeEvents).values(values).onConflictDoNothing();
  }
  log(`Wrote ${valid.length} pool fee events`);
}

export async function writePoolFeeBalances(
  epochNumber: number,
  balances: FeeAccountBalance[]
) {
  for (const b of balances) {
    await db
      .insert(schema.poolFeeBalances)
      .values({
        epochNumber,
        poolId: b.poolId,
        feeAccountAddress: b.feeAccountAddress,
        tokenBalance: b.tokenBalance,
        solEquivalent: b.solEquivalent,
      })
      .onConflictDoUpdate({
        target: [schema.poolFeeBalances.epochNumber, schema.poolFeeBalances.poolId],
        set: {
          tokenBalance: b.tokenBalance,
          solEquivalent: b.solEquivalent,
        },
      });
  }
  log(`Wrote ${balances.length} pool fee balances`);
}

export async function getPreviousCumulativeRevenue(): Promise<Map<string, number>> {
  // Get latest epoch with fee data
  const latestEpoch = await db
    .select({ epoch: sql<number>`max(${schema.poolFeeSnapshots.epochNumber})` })
    .from(schema.poolFeeSnapshots);
  const maxEpoch = latestEpoch[0]?.epoch;
  if (!maxEpoch) return new Map();

  const rows = await db
    .select({
      poolId: schema.poolFeeSnapshots.poolId,
      cumulative: schema.poolFeeSnapshots.cumulativeRevenueSol,
    })
    .from(schema.poolFeeSnapshots)
    .where(eq(schema.poolFeeSnapshots.epochNumber, maxEpoch));

  return new Map(rows.map((r) => [r.poolId, r.cumulative ?? 0]));
}
