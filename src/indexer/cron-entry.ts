/**
 * Cron entry point — importable version of the indexer for Vercel API routes.
 * Does not call process.exit() or use CLI flags.
 * Avoids fs/path so it works in Vercel's serverless runtime.
 */

import { SOLANA_RPC_URL, LAMPORTS_PER_SOL, log, warn } from "./config";
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
import sandwichData from "./data/sandwich-validators.json";


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

  const [rpcValidators, stakewizValidators, marinadeValidators, sfdpMap] = await Promise.all([
    fetchVoteAccounts(),
    fetchStakeWizValidators(),
    fetchMarinadeValidators(),
    fetchSfdpParticipants(),
  ]);

  if (rpcValidators.length === 0) {
    throw new Error("RPC returned 0 validators");
  }

  const wizLookup = new Map(stakewizValidators.map((v) => [v.vote_identity, v]));

  // Build identity→vote lookup for SFDP mapping (SFDP uses identity keys, DB uses vote keys)
  const identityToVote = new Map<string, string>();
  for (const v of stakewizValidators) {
    if (v.identity) identityToVote.set(v.identity, v.vote_identity);
  }
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

  // Build vote pubkey → SFDP status lookup
  const voteSfdpStatus = new Map<string, string>();
  for (const [identityKey, status] of sfdpMap) {
    const voteKey = identityToVote.get(identityKey);
    if (voteKey) voteSfdpStatus.set(voteKey, status);
  }

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
      sfdpStatus: voteSfdpStatus.get(rpc.votePubkey) ?? null,
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

  const sandwichValidatorSet = new Set(sandwichData.map((e: any) => e.validator_pubkey));

  const poolDelegationMap = new Map<string, { validatorPubkey: string; delegatedSol: number }[]>();
  for (const pool of splPoolDelegations) {
    if ((pool as any).error) continue;
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
  await writeValidators(activeValidators.map((v) => ({ pubkey: v.pubkey, name: v.name, country: v.country, city: v.city, datacenter: v.datacenter, client: v.client, sfdpStatus: v.sfdpStatus })));
  await writeValidatorSnapshots(epochNumber, activeValidators.map((v) => ({ validatorPubkey: v.pubkey, activeStake: v.activatedStake, commission: v.commission, voteCredits: v.voteCredits, skipRate: v.skipRate, apy: v.apy, wizScore: v.wizScore, stakeTier: v.stakeTier, isSuperminority: v.isSuperminority })));

  const allDelegations: { poolId: string; validatorPubkey: string; delegatedSol: number }[] = [];
  for (const [poolId, delegations] of poolDelegationMap) {
    for (const d of delegations) allDelegations.push({ poolId, validatorPubkey: d.validatorPubkey, delegatedSol: d.delegatedSol });
  }
  await writePoolDelegations(epochNumber, allDelegations);
  await writeSandwichList(sandwichData.map((e: any) => ({ validatorPubkey: e.validator_pubkey, detectedDate: e.detected_date, source: e.source, sandwichPercent: e.sandwich_percent ?? null })));
  await writePoolScores(epochNumber, poolScores);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  return { status: "indexed", epoch: epochNumber, pools: poolScores.length, elapsed };
}
