#!/usr/bin/env npx tsx
/**
 * Epoch Indexer — CLI entry point
 *
 * Fetches Solana validator + stake pool data, computes pool health scores,
 * and writes everything to SQLite.
 *
 * Usage:
 *   npm run index              # Index current epoch
 *   npm run index -- --dry-run # Fetch + compute, skip DB writes
 *   npm run index -- --force   # Re-index even if epoch already exists
 *   npm run index -- --watch   # Run continuously, index each new epoch
 */

import { Connection } from "@solana/web3.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { SOLANA_RPC_URL, LAMPORTS_PER_SOL, parseFlags, log, warn, fatal } from "./config";
import { classifyStakeTier } from "./classify-tier";
import { fetchEpochInfo, fetchVoteAccounts, getConnection } from "./fetchers/solana-rpc";
import { fetchStakeWizValidators } from "./fetchers/stakewiz";
import { fetchMarinadeValidators } from "./fetchers/marinade";
import { fetchAllPoolDelegations } from "./fetchers/stake-pools";
import { fetchSfdpParticipants } from "./fetchers/sfdp";
import { computeAllPoolScores } from "./scoring/index";
import { computeNakamoto } from "./scoring/nakamoto-impact";
import {
  isEpochIndexed,
  writeEpoch,
  writeStakePools,
  writeValidators,
  writeValidatorSnapshots,
  writePoolDelegations,
  writeSandwichList,
  writePoolScores,
} from "./writers/db-writer";
import { POOL_REGISTRY } from "./data/pool-registry";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadSandwichList(): { validator_pubkey: string; sandwich_count?: number; sandwich_percent?: number; source: string; detected_date: string }[] {
  try {
    const path = join(__dirname, "data", "sandwich-validators.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    warn("Could not load sandwich-validators.json, using empty list");
    return [];
  }
}


// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseFlags();
  const startTime = Date.now();

  log("=== Coefficient Epoch Indexer ===");
  if (flags.dryRun) log("DRY RUN — no database writes");
  if (flags.force) log("FORCE — will re-index even if epoch exists");

  // 1. Validate RPC
  if (!SOLANA_RPC_URL) {
    fatal("SOLANA_RPC_URL is not set. Add it to .env or export it.");
  }

  // 2. Fetch epoch info
  const epochData = await fetchEpochInfo();
  const epochNumber = flags.epoch ?? epochData.epoch;
  log(`Target epoch: ${epochNumber}`);

  // 3. Idempotency check
  if (!flags.force && !flags.dryRun) {
    const alreadyIndexed = await isEpochIndexed(epochNumber);
    if (alreadyIndexed) {
      log(`Epoch ${epochNumber} is already indexed. Use --force to re-index.`);
      return false; // signal: nothing new to index
    }
  }

  // 4. Parallel fetches: RPC validators + StakeWiz + Marinade
  log("Fetching data from all sources...");
  const [rpcValidators, stakewizValidators, marinadeValidators, sfdpMap] = await Promise.all([
    fetchVoteAccounts(),
    fetchStakeWizValidators(),
    fetchMarinadeValidators(),
    fetchSfdpParticipants(),
  ]);

  if (rpcValidators.length === 0) {
    fatal("RPC returned 0 validators — cannot proceed");
  }

  // 5. Build StakeWiz lookup (vote pubkey → enrichment data)
  const wizLookup = new Map(
    stakewizValidators.map((v) => [v.vote_identity, v])
  );
  log(`StakeWiz enrichment available for ${wizLookup.size} validators`);

  // Build identity→vote lookup for SFDP mapping (SFDP uses identity keys, DB uses vote keys)
  const identityToVote = new Map<string, string>();
  for (const v of stakewizValidators) {
    if (v.identity) identityToVote.set(v.identity, v.vote_identity);
  }

  // 6. Merge: RPC = source of truth, StakeWiz = enrichment
  const allStakes = rpcValidators.map((v) => v.activatedStake).filter((s) => s > 0);
  const sortedStakes = [...allStakes].sort((a, b) => b - a);
  const totalNetworkStake = sortedStakes.reduce((sum, s) => sum + s, 0);

  // Compute median and superminority threshold
  const sortedAsc = [...allStakes].sort((a, b) => a - b);
  const mid = Math.floor(sortedAsc.length / 2);
  const medianStake = sortedAsc.length % 2
    ? sortedAsc[mid]
    : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;

  let cumulative = 0;
  let superminorityThreshold = sortedStakes[0] ?? 0;
  for (const stake of sortedStakes) {
    cumulative += stake;
    if (cumulative >= totalNetworkStake / 3) {
      superminorityThreshold = stake;
      break;
    }
  }

  const nakamotoCoefficient = computeNakamoto(allStakes);
  log(`Network: ${rpcValidators.length} validators, ${(totalNetworkStake / 1_000_000).toFixed(2)}M SOL staked, Nakamoto ${nakamotoCoefficient}`);

  // Build vote pubkey → SFDP status lookup
  const voteSfdpStatus = new Map<string, string>();
  for (const [identityKey, status] of sfdpMap) {
    const voteKey = identityToVote.get(identityKey);
    if (voteKey) voteSfdpStatus.set(voteKey, status);
  }
  log(`SFDP: mapped ${voteSfdpStatus.size} validators via identity→vote lookup`);

  // Build merged validator list
  const mergedValidators = rpcValidators.map((rpc) => {
    const wiz = wizLookup.get(rpc.votePubkey);
    return {
      pubkey: rpc.votePubkey,
      name: wiz?.name ?? null,
      country: wiz?.ip_country ?? null,
      city: wiz?.ip_city ?? null,
      datacenter: wiz?.ip_org ?? null,
      client: wiz?.version?.split(" ")[0] ?? "unknown",
      activatedStake: rpc.activatedStake,
      commission: rpc.commission,
      voteCredits: rpc.epochCredits,
      skipRate: wiz?.skip_rate ?? null,
      apy: wiz?.total_apy ?? wiz?.apy_estimate ?? null,
      wizScore: wiz?.wiz_score ?? null,
      stakeTier: classifyStakeTier(rpc.activatedStake, medianStake, superminorityThreshold),
      isSuperminority: rpc.activatedStake >= superminorityThreshold,
      sfdpStatus: voteSfdpStatus.get(rpc.votePubkey) ?? null,
    };
  });

  // 7. Fetch pool delegations from on-chain
  const connection = getConnection();
  const splPoolDelegations = await fetchAllPoolDelegations(connection);

  // 8. Handle Marinade separately (uses its own API, not SPL on-chain)
  const marinadePool = POOL_REGISTRY.find((p) => p.id === "marinade");
  if (marinadePool && marinadeValidators.length > 0) {
    const marinadeDelegations = marinadeValidators.map((v) => ({
      voteAccountAddress: v.vote_account,
      activeSol: v.marinade_stake / LAMPORTS_PER_SOL,
    }));
    const totalMarinadeSol = marinadeDelegations.reduce((s, d) => s + d.activeSol, 0);
    splPoolDelegations.push({
      poolId: "marinade",
      validators: marinadeDelegations,
      totalSol: totalMarinadeSol,
    });
    log(`  Marinade: ${marinadeDelegations.length} validators, ${(totalMarinadeSol / 1_000_000).toFixed(2)}M SOL`);
  } else {
    warn("Marinade delegation data unavailable");
  }

  // 9. Load sandwich list
  const sandwichData = loadSandwichList();
  const sandwichValidatorSet = new Set(sandwichData.map((e) => e.validator_pubkey));
  log(`Sandwich list: ${sandwichData.length} validators flagged`);

  // 10. Build pool delegation map for scoring
  const poolDelegationMap = new Map<string, { validatorPubkey: string; delegatedSol: number }[]>();
  for (const pool of splPoolDelegations) {
    if (pool.error) continue;
    poolDelegationMap.set(
      pool.poolId,
      pool.validators.map((v) => ({
        validatorPubkey: v.voteAccountAddress,
        delegatedSol: v.activeSol,
      }))
    );
  }

  // 11. Compute scores
  log("Computing pool health scores...");
  const validatorInfoForScoring = mergedValidators.map((v) => ({
    pubkey: v.pubkey,
    activatedStake: v.activatedStake,
    commission: v.commission,
    country: v.country,
    apy: v.apy,
  }));

  const poolScores = computeAllPoolScores(
    poolDelegationMap,
    validatorInfoForScoring,
    sandwichValidatorSet
  );

  // 12. Print summary
  log("\n=== Pool Health Scores ===");
  const sorted = [...poolScores].sort((a, b) => b.networkHealthScore - a.networkHealthScore);
  for (const s of sorted) {
    const poolName = POOL_REGISTRY.find((p) => p.id === s.poolId)?.name ?? s.poolId;
    log(
      `  ${poolName.padEnd(16)} Score: ${String(s.networkHealthScore).padStart(3)} | ` +
      `Vals: ${String(s.validatorCount).padStart(4)} | ` +
      `SOL: ${(s.activeSolStaked / 1_000_000).toFixed(2).padStart(7)}M | ` +
      `APY: ${s.medianApy.toFixed(2)}%`
    );
  }

  // 13. Write to DB (unless dry-run)
  if (flags.dryRun) {
    log("\nDry run complete — no data written to database.");
  } else {
    log("\nWriting to database...");

    // Write epoch
    await writeEpoch({
      epochNumber,
      startSlot: epochData.absoluteSlot - epochData.slotIndex,
      totalStake: totalNetworkStake,
      nakamotoCoefficient,
    });

    // Write stake pool entries
    await writeStakePools(
      POOL_REGISTRY.map((p) => ({ id: p.id, name: p.name, program: p.program }))
    );

    // Write validators (only those with stake)
    const activeValidators = mergedValidators.filter((v) => v.activatedStake > 0);
    await writeValidators(
      activeValidators.map((v) => ({
        pubkey: v.pubkey,
        name: v.name,
        country: v.country,
        city: v.city,
        datacenter: v.datacenter,
        client: v.client,
        sfdpStatus: v.sfdpStatus,
      }))
    );

    // Write validator snapshots
    await writeValidatorSnapshots(
      epochNumber,
      activeValidators.map((v) => ({
        validatorPubkey: v.pubkey,
        activeStake: v.activatedStake,
        commission: v.commission,
        voteCredits: v.voteCredits,
        skipRate: v.skipRate,
        apy: v.apy,
        wizScore: v.wizScore,
        stakeTier: v.stakeTier,
        isSuperminority: v.isSuperminority,
      }))
    );

    // Write pool delegations
    const allDelegations: { poolId: string; validatorPubkey: string; delegatedSol: number }[] = [];
    for (const [poolId, delegations] of poolDelegationMap) {
      for (const d of delegations) {
        allDelegations.push({ poolId, validatorPubkey: d.validatorPubkey, delegatedSol: d.delegatedSol });
      }
    }
    await writePoolDelegations(epochNumber, allDelegations);

    // Write sandwich list
    await writeSandwichList(
      sandwichData.map((e) => ({
        validatorPubkey: e.validator_pubkey,
        detectedDate: e.detected_date,
        source: e.source,
        sandwichPercent: e.sandwich_percent ?? null,
      }))
    );

    // Write pool scores
    await writePoolScores(epochNumber, poolScores);

    log("Database write complete.");
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\nDone in ${elapsed}s. Indexed ${poolScores.length} pools across ${mergedValidators.length} validators.`);
  return true; // signal: indexed successfully
}

// ---------------------------------------------------------------------------
// Watch mode — poll for new epochs
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function watch() {
  log("=== Watch mode — polling for new epochs ===");
  log(`Poll interval: ${POLL_INTERVAL_MS / 60_000} minutes`);

  while (true) {
    try {
      const indexed = await main();
      if (!indexed) {
        log(`Next check in ${POLL_INTERVAL_MS / 60_000} minutes...`);
      }
    } catch (err) {
      warn(`Indexer error (will retry): ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

const flags = parseFlags();

if (flags.watch) {
  watch().catch((err) => {
    console.error("Watch mode failed:", err);
    process.exit(1);
  });
} else {
  main().then((indexed) => {
    if (indexed === false) process.exit(0);
  }).catch((err) => {
    console.error("Indexer failed:", err);
    process.exit(1);
  });
}
