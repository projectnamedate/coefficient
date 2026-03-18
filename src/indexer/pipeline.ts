/**
 * Shared indexer pipeline — contains the core logic used by both
 * the CLI entry point (run.ts) and the Vercel cron entry (cron-entry.ts).
 */

import { SOLANA_RPC_URL, LAMPORTS_PER_SOL, log, warn } from "./config";
import { classifyStakeTier } from "./classify-tier";
import { fetchEpochInfo, fetchVoteAccounts, getConnection } from "./fetchers/solana-rpc";
import { fetchStakeWizValidators } from "./fetchers/stakewiz";
import { fetchMarinadeValidators } from "./fetchers/marinade";
import { fetchAllPoolDelegations } from "./fetchers/stake-pools";
import { fetchSfdpParticipants } from "./fetchers/sfdp";
import { fetchOnChainValidatorInfo } from "./fetchers/validator-info";
import { computeAllPoolScores } from "./scoring/index";
import { computeNakamoto } from "./scoring/nakamoto-impact";
import { computeAllPoolRevenue, type PoolRevenueResult } from "./scoring/revenue";
import {
  isEpochIndexed,
  writeEpoch,
  writeStakePools,
  writeValidators,
  writeValidatorSnapshots,
  writePoolDelegations,
  writeSandwichList,
  writePoolScores,
  writePoolFeeSnapshots,
  writePoolFeeEvents,
  writePoolFeeBalances,
  getPreviousCumulativeRevenue,
} from "./writers/db-writer";
import { POOL_REGISTRY } from "./data/pool-registry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PipelineOpts {
  sandwichData: Array<{
    validator_pubkey: string;
    detected_date?: string;
    source?: string;
    sandwich_percent?: number;
  }>;
  validatorOverrides: Record<string, { name?: string; description?: string }>;
  dryRun?: boolean;
  force?: boolean;
  epoch?: number;
}

export interface PipelineResult {
  status: string;
  epoch?: number;
  pools?: number;
  elapsed?: string;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export async function runPipeline(opts: PipelineOpts): Promise<PipelineResult> {
  const { sandwichData, validatorOverrides, dryRun, force, epoch: overrideEpoch } = opts;
  const startTime = Date.now();

  // 1. Validate RPC
  if (!SOLANA_RPC_URL) {
    throw new Error("SOLANA_RPC_URL is not set");
  }

  // 2. Fetch epoch info
  const epochData = await fetchEpochInfo();
  const epochNumber = overrideEpoch ?? epochData.epoch;
  log(`Target epoch: ${epochNumber}`);

  // 3. Idempotency check
  if (!force && !dryRun) {
    const alreadyIndexed = await isEpochIndexed(epochNumber);
    if (alreadyIndexed) {
      log(`Epoch ${epochNumber} is already indexed. Use --force to re-index.`);
      return { status: "skipped", epoch: epochNumber };
    }
  }

  // 4. Parallel fetches: RPC validators + StakeWiz + Marinade + SFDP + On-chain info
  log("Fetching data from all sources...");
  const connection = getConnection();
  const [rpcValidators, stakewizValidators, marinadeValidators, sfdpMap, onChainInfoMap] = await Promise.all([
    fetchVoteAccounts(),
    fetchStakeWizValidators(),
    fetchMarinadeValidators(),
    fetchSfdpParticipants(),
    fetchOnChainValidatorInfo(connection),
  ]);

  if (rpcValidators.length === 0) {
    throw new Error("RPC returned 0 validators — cannot proceed");
  }

  // 5. Build StakeWiz lookup (vote pubkey -> enrichment data)
  const wizLookup = new Map(
    stakewizValidators.map((v) => [v.vote_identity, v])
  );
  log(`StakeWiz enrichment available for ${wizLookup.size} validators`);

  // Build identity->vote lookup for SFDP mapping (SFDP uses identity keys, DB uses vote keys)
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

  // Build vote pubkey -> SFDP status lookup
  const voteSfdpStatus = new Map<string, string>();
  for (const [identityKey, status] of sfdpMap) {
    const voteKey = identityToVote.get(identityKey);
    if (voteKey) voteSfdpStatus.set(voteKey, status);
  }
  log(`SFDP: mapped ${voteSfdpStatus.size} validators via identity->vote lookup`);

  // Build merged validator list
  // Name priority: manual override > on-chain ValidatorInfo > StakeWiz > null
  const mergedValidators = rpcValidators.map((rpc) => {
    const wiz = wizLookup.get(rpc.votePubkey);
    const onChain = onChainInfoMap.get(rpc.nodePubkey);
    const override = validatorOverrides[rpc.votePubkey];

    const name = override?.name || onChain?.name || wiz?.name || null;
    const description = override?.description || onChain?.details || null;

    return {
      pubkey: rpc.votePubkey,
      name,
      description,
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

  const namedCount = mergedValidators.filter((v) => v.name).length;
  log(`Name resolution: ${namedCount}/${mergedValidators.length} validators have names (on-chain: ${onChainInfoMap.size}, StakeWiz: ${wizLookup.size}, overrides: ${Object.keys(validatorOverrides).length})`);

  // 7. Fetch pool delegations from on-chain
  const splPoolDelegations = await fetchAllPoolDelegations(connection);

  // 8. Handle Marinade separately (uses its own API, not SPL on-chain)
  const marinadePool = POOL_REGISTRY.find((p) => p.id === "marinade");
  if (marinadePool && marinadeValidators.length > 0) {
    const marinadeDelegations = marinadeValidators
      .map((v) => ({
        voteAccountAddress: v.vote_account,
        activeSol: v.marinade_stake / LAMPORTS_PER_SOL,
      }))
      .filter((d) => d.activeSol > 1.1); // Exclude minimum-stake placeholders
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

  // 9. Sandwich list
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

  // 11b. Compute pool revenue
  log("Computing pool revenue...");
  const previousCumulatives = dryRun ? new Map<string, number>() : await getPreviousCumulativeRevenue();
  const poolRevenueData = splPoolDelegations
    .filter((p) => !(p as any).error)
    .map((p) => ({
      poolId: p.poolId,
      feeData: p.feeData,
      program: POOL_REGISTRY.find((r) => r.id === p.poolId)?.program ?? "spl-stake-pool",
    }));

  const revenueResults = computeAllPoolRevenue(
    poolRevenueData,
    poolScores,
    previousCumulatives,
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
  if (dryRun) {
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

    // Write stake pool entries (with fee data from on-chain)
    const feeDataMap = new Map(
      splPoolDelegations
        .filter((p) => p.feeData)
        .map((p) => [p.poolId, p.feeData!])
    );
    await writeStakePools(
      POOL_REGISTRY.map((p) => {
        const fee = feeDataMap.get(p.id);
        return {
          id: p.id,
          name: p.name,
          lstTicker: p.lstTicker,
          program: p.program,
          epochFeeNumerator: fee?.epochFeeNumerator,
          epochFeeDenominator: fee?.epochFeeDenominator,
          depositFeeNumerator: fee?.depositFeeNumerator,
          depositFeeDenominator: fee?.depositFeeDenominator,
          withdrawalFeeNumerator: fee?.withdrawalFeeNumerator,
          withdrawalFeeDenominator: fee?.withdrawalFeeDenominator,
          managerFeeAccount: fee?.managerFeeAccount,
        };
      })
    );

    // Write validators (only those with stake)
    const activeValidators = mergedValidators.filter((v) => v.activatedStake > 0);
    await writeValidators(
      activeValidators.map((v) => ({
        pubkey: v.pubkey,
        name: v.name,
        description: v.description,
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
        detectedDate: e.detected_date ?? "",
        source: e.source ?? "",
        sandwichPercent: e.sandwich_percent ?? null,
      }))
    );

    // Write pool scores (with revenue data)
    await writePoolScores(epochNumber, poolScores, revenueResults);

    // Write pool fee snapshots
    await writePoolFeeSnapshots(epochNumber, revenueResults);

    // Tier 2: Fee destination tracking (opt-in)
    if (process.env.ENABLE_FEE_TRACKING === "true") {
      log("Running fee destination tracker (Tier 2)...");
      const { trackAllPoolFees } = await import("./fetchers/fee-tracker");
      const poolFeeAccounts = revenueResults
        .filter((r) => r.managerFeeAccount)
        .map((r) => {
          const poolData = splPoolDelegations.find((p) => p.poolId === r.poolId);
          return {
            poolId: r.poolId,
            managerFeeAccount: r.managerFeeAccount!,
            managerWallet: poolData?.feeData?.managerWallet,
          };
        });

      const { events, balances } = await trackAllPoolFees(connection, poolFeeAccounts);
      await writePoolFeeEvents(epochNumber, events);
      await writePoolFeeBalances(epochNumber, balances);
    }

    log("Database write complete.");
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`\nDone in ${elapsed}s. Indexed ${poolScores.length} pools across ${mergedValidators.length} validators.`);
  return { status: dryRun ? "dry-run" : "indexed", epoch: epochNumber, pools: poolScores.length, elapsed };
}
