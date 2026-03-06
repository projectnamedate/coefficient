/**
 * Cron entry point — importable version of the indexer for Vercel API routes.
 * Does not call process.exit() or use CLI flags.
 */

import { Connection } from "@solana/web3.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { SOLANA_RPC_URL, LAMPORTS_PER_SOL, log, warn } from "./config.js";
import { fetchEpochInfo, fetchVoteAccounts, getConnection } from "./fetchers/solana-rpc.js";
import { fetchStakeWizValidators } from "./fetchers/stakewiz.js";
import { fetchMarinadeValidators } from "./fetchers/marinade.js";
import { fetchAllPoolDelegations } from "./fetchers/stake-pools.js";
import { computeAllPoolScores } from "./scoring/index.js";
import { computeNakamoto } from "./scoring/nakamoto-impact.js";
import {
  isEpochIndexed,
  writeEpoch,
  writeStakePools,
  writeValidators,
  writeValidatorSnapshots,
  writePoolDelegations,
  writeSandwichList,
  writePoolScores,
} from "./writers/db-writer.js";
import { POOL_REGISTRY } from "./data/pool-registry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadSandwichList() {
  try {
    const path = join(__dirname, "data", "sandwich-validators.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

function classifyStakeTier(stake: number, medianStake: number, superminorityThreshold: number): string {
  if (stake >= superminorityThreshold) return "superminority";
  if (stake >= medianStake * 2) return "large";
  if (stake >= medianStake * 0.5) return "medium";
  return "small";
}

export async function runIndexer(): Promise<{ status: string; epoch?: number; pools?: number; elapsed?: string }> {
  if (!SOLANA_RPC_URL) {
    throw new Error("SOLANA_RPC_URL is not set");
  }

  const startTime = Date.now();
  const epochData = await fetchEpochInfo();
  const epochNumber = epochData.epoch;

  const alreadyIndexed = await isEpochIndexed(epochNumber);
  if (alreadyIndexed) {
    return { status: "skipped", epoch: epochNumber };
  }

  const [rpcValidators, stakewizValidators, marinadeValidators] = await Promise.all([
    fetchVoteAccounts(),
    fetchStakeWizValidators(),
    fetchMarinadeValidators(),
  ]);

  if (rpcValidators.length === 0) {
    throw new Error("RPC returned 0 validators");
  }

  const wizLookup = new Map(stakewizValidators.map((v) => [v.vote_identity, v]));
  const allStakes = rpcValidators.map((v) => v.activatedStake).filter((s) => s > 0);
  const sortedStakes = [...allStakes].sort((a, b) => b - a);
  const totalNetworkStake = sortedStakes.reduce((sum, s) => sum + s, 0);
  const sortedAsc = [...allStakes].sort((a, b) => a - b);
  const mid = Math.floor(sortedAsc.length / 2);
  const medianStake = sortedAsc.length % 2 ? sortedAsc[mid] : (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;

  let cumulative = 0;
  let superminorityThreshold = sortedStakes[0] ?? 0;
  for (const stake of sortedStakes) {
    cumulative += stake;
    if (cumulative >= totalNetworkStake / 3) { superminorityThreshold = stake; break; }
  }

  const nakamotoCoefficient = computeNakamoto(allStakes);

  const mergedValidators = rpcValidators.map((rpc) => {
    const wiz = wizLookup.get(rpc.votePubkey);
    return {
      pubkey: rpc.votePubkey, name: wiz?.name ?? null,
      country: wiz?.ip_country ?? null, city: wiz?.ip_city ?? null,
      datacenter: wiz?.ip_org ?? null, client: wiz?.version?.split(" ")[0] ?? "unknown",
      activatedStake: rpc.activatedStake, commission: rpc.commission,
      voteCredits: rpc.epochCredits, skipRate: wiz?.skip_rate ?? null,
      apy: wiz?.total_apy ?? wiz?.apy_estimate ?? null, wizScore: wiz?.wiz_score ?? null,
      stakeTier: classifyStakeTier(rpc.activatedStake, medianStake, superminorityThreshold),
      isSuperminority: rpc.activatedStake >= superminorityThreshold,
    };
  });

  const connection = getConnection();
  const splPoolDelegations = await fetchAllPoolDelegations(connection);

  if (marinadeValidators.length > 0) {
    const marinadeDelegations = marinadeValidators.map((v) => ({
      voteAccountAddress: v.vote_account,
      activeSol: v.marinade_stake / LAMPORTS_PER_SOL,
    }));
    splPoolDelegations.push({
      poolId: "marinade",
      validators: marinadeDelegations,
      totalSol: marinadeDelegations.reduce((s, d) => s + d.activeSol, 0),
    });
  }

  const sandwichData = loadSandwichList();
  const sandwichValidatorSet = new Set(sandwichData.map((e: any) => e.validator_pubkey));

  const poolDelegationMap = new Map<string, { validatorPubkey: string; delegatedSol: number }[]>();
  for (const pool of splPoolDelegations) {
    if (pool.error) continue;
    poolDelegationMap.set(pool.poolId, pool.validators.map((v) => ({
      validatorPubkey: v.voteAccountAddress, delegatedSol: v.activeSol,
    })));
  }

  const poolScores = computeAllPoolScores(
    poolDelegationMap,
    mergedValidators.map((v) => ({ pubkey: v.pubkey, activatedStake: v.activatedStake, commission: v.commission, country: v.country, apy: v.apy })),
    sandwichValidatorSet as Set<string>
  );

  // Write to DB
  await writeEpoch({ epochNumber, startSlot: epochData.absoluteSlot - epochData.slotIndex, totalStake: totalNetworkStake, nakamotoCoefficient });
  await writeStakePools(POOL_REGISTRY.map((p) => ({ id: p.id, name: p.name, program: p.program })));
  const activeValidators = mergedValidators.filter((v) => v.activatedStake > 0);
  await writeValidators(activeValidators.map((v) => ({ pubkey: v.pubkey, name: v.name, country: v.country, city: v.city, datacenter: v.datacenter, client: v.client })));
  await writeValidatorSnapshots(epochNumber, activeValidators.map((v) => ({ validatorPubkey: v.pubkey, activeStake: v.activatedStake, commission: v.commission, voteCredits: v.voteCredits, skipRate: v.skipRate, apy: v.apy, wizScore: v.wizScore, stakeTier: v.stakeTier, isSuperminority: v.isSuperminority })));

  const allDelegations: { poolId: string; validatorPubkey: string; delegatedSol: number }[] = [];
  for (const [poolId, delegations] of poolDelegationMap) {
    for (const d of delegations) allDelegations.push({ poolId, validatorPubkey: d.validatorPubkey, delegatedSol: d.delegatedSol });
  }
  await writePoolDelegations(epochNumber, allDelegations);
  await writeSandwichList(sandwichData.map((e: any) => ({ validatorPubkey: e.validator_pubkey, detectedDate: e.detected_date, source: e.source, sandwichPercent: e.sandwich_percent })));
  await writePoolScores(epochNumber, poolScores);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return { status: "indexed", epoch: epochNumber, pools: poolScores.length, elapsed };
}
