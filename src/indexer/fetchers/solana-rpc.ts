import { Connection } from "@solana/web3.js";
import { SOLANA_RPC_URL, PUBLIC_RPC_URL, LAMPORTS_PER_SOL, log, warn } from "../config";

export interface EpochData {
  epoch: number;
  absoluteSlot: number;
  slotIndex: number;
  slotsInEpoch: number;
}

export interface RpcValidator {
  votePubkey: string;
  nodePubkey: string;
  activatedStake: number; // SOL
  commission: number; // 0-100
  lastVote: number;
  epochCredits: number; // credits for current epoch
  isDelinquent: boolean;
}

// Sends each request to the primary RPC and repeats it on the public RPC when the
// primary errors or answers with a non-2xx status (429, 401 from a revoked key, 5xx).
async function fetchWithFallback(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  if (SOLANA_RPC_URL === PUBLIC_RPC_URL) return fetch(input, init);
  try {
    const res = await fetch(input, init);
    if (res.ok) return res;
    warn(`Primary RPC returned HTTP ${res.status}; retrying on public RPC`);
  } catch (err) {
    warn(`Primary RPC failed (${err instanceof Error ? err.message : err}); retrying on public RPC`);
  }
  return fetch(PUBLIC_RPC_URL, init);
}

function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, { commitment: "finalized", fetch: fetchWithFallback });
}

export async function fetchEpochInfo(): Promise<EpochData> {
  const conn = getConnection();
  log("Fetching epoch info from RPC...");
  const info = await conn.getEpochInfo("finalized");
  log(`Epoch ${info.epoch}, slot ${info.absoluteSlot}`);
  return {
    epoch: info.epoch,
    absoluteSlot: info.absoluteSlot,
    slotIndex: info.slotIndex,
    slotsInEpoch: info.slotsInEpoch,
  };
}

export async function fetchVoteAccounts(): Promise<RpcValidator[]> {
  const conn = getConnection();
  log("Fetching vote accounts from RPC...");
  const result = await conn.getVoteAccounts("finalized");

  const mapValidator = (v: any, delinquent: boolean): RpcValidator => {
    // epochCredits is an array of [epoch, credits, previousCredits]
    // Get the most recent epoch's credits
    const latestCredits = v.epochCredits?.length > 0
      ? v.epochCredits[v.epochCredits.length - 1][1] - v.epochCredits[v.epochCredits.length - 1][2]
      : 0;

    return {
      votePubkey: v.votePubkey,
      nodePubkey: v.nodePubkey,
      activatedStake: v.activatedStake / LAMPORTS_PER_SOL,
      commission: v.commission,
      lastVote: v.lastVote,
      epochCredits: latestCredits,
      isDelinquent: delinquent,
    };
  };

  const current = result.current.map((v) => mapValidator(v, false));
  const delinquent = result.delinquent.map((v) => mapValidator(v, true));
  const all = [...current, ...delinquent];

  log(`Fetched ${current.length} active + ${delinquent.length} delinquent validators (${all.length} total)`);
  return all;
}

export { getConnection };
