import { Connection } from "@solana/web3.js";
import { SOLANA_RPC_URL, LAMPORTS_PER_SOL, log, fatal } from "../config";

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

function getConnection(): Connection {
  if (!SOLANA_RPC_URL) {
    fatal("SOLANA_RPC_URL environment variable is not set");
  }
  return new Connection(SOLANA_RPC_URL, "finalized");
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
