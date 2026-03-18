/**
 * Fee Destination Tracker (Tier 2)
 * Tracks what pool operators do with their fee revenue:
 * hold, redeem via pool, swap on DEX, or transfer to exchange.
 */

import { Connection, PublicKey } from "@solana/web3.js";
import { LAMPORTS_PER_SOL, log, warn, fetchWithTimeout } from "../config";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_BASE = "https://api-mainnet.helius-rpc.com/v0";

// Known DEX program IDs
const DEX_PROGRAMS = new Set([
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter v6
  "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB", // Jupiter v4
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // Orca Whirlpool
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium AMM
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // Raydium CLMM
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C", // Raydium CPMM
  "stkitrT1Uoy18Dk1fTrgPw8W6MVzoCfYoAFT4MLsmhq", // Sanctum Router
]);

// SPL Stake Pool program IDs (redemption = withdraw instruction)
const STAKE_POOL_PROGRAMS = new Set([
  "SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy", // SPL Stake Pool
  "SPMBzsVUuoHA4Jm6KunbsotaahvVikZs1JyTW6iJvbn", // Sanctum Multi
]);

// Known CEX deposit addresses (curated from Dune + public sources)
// This will be expanded over time
const CEX_ADDRESSES = new Map<string, string>([
  // Binance
  ["5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9", "Binance"],
  ["9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", "Binance"],
  ["2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S", "Binance"],
  // Coinbase
  ["H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS", "Coinbase"],
  ["2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm", "Coinbase"],
  // Kraken
  ["sCtiJieP8B3SwYnXemiLpRFRR8KJM8yKcvhAhLg59ig", "Kraken"],
  // Bybit
  ["AC5RDfQFmDS1deWZos921JfqscXdByf8BKHs5ACWjtW2", "Bybit"],
  // OKX
  ["5VCwKtCXgCJ6kit5FybXjvFocNUKLsSwkFXWPg2UjJSk", "OKX"],
]);

export type FeeEventType = "collected" | "redeemed" | "swapped" | "transferred" | "unknown";

export interface FeeEvent {
  poolId: string;
  eventType: FeeEventType;
  amountSol: number | null;
  txSignature: string;
  destination: string | null;
  destinationLabel: string | null;
  blockTime: number | null;
}

export interface FeeAccountBalance {
  poolId: string;
  feeAccountAddress: string;
  tokenBalance: number;
  solEquivalent: number;
}

/**
 * Classify a Helius-parsed transaction for a fee account.
 */
function classifyHeliusTransaction(tx: any): { type: FeeEventType; destination: string | null; label: string | null } {
  const txType = tx.type as string;
  const description = tx.description ?? "";

  // Helius classifies swaps automatically
  if (txType === "SWAP") {
    return { type: "swapped", destination: null, label: "DEX Swap" };
  }

  // Token transfers — check destination
  if (txType === "TRANSFER" || txType === "TOKEN_TRANSFER") {
    const transfers = tx.tokenTransfers ?? [];
    for (const t of transfers) {
      const dest = t.toUserAccount ?? t.toTokenAccount ?? "";
      const cex = CEX_ADDRESSES.get(dest);
      if (cex) {
        return { type: "transferred", destination: dest, label: cex };
      }
    }
    // Transfer to unknown address
    const firstTransfer = transfers[0];
    return {
      type: "unknown",
      destination: firstTransfer?.toUserAccount ?? null,
      label: null,
    };
  }

  // Stake pool withdraw/unstake
  if (txType === "UNSTAKE_SOL" || txType === "WITHDRAW") {
    return { type: "redeemed", destination: null, label: "Pool Redemption" };
  }

  // Token mint = fee collection
  if (txType === "TOKEN_MINT") {
    return { type: "collected", destination: null, label: null };
  }

  // Check account keys for known programs as fallback
  const accountKeys: string[] = tx.accountData?.map((a: any) => a.account) ?? [];
  const instructions = tx.instructions ?? [];
  const programIds = instructions.map((ix: any) => ix.programId);
  const allPrograms = [...programIds, ...accountKeys];

  for (const pid of allPrograms) {
    if (DEX_PROGRAMS.has(pid)) {
      return { type: "swapped", destination: null, label: "DEX Swap" };
    }
    if (STAKE_POOL_PROGRAMS.has(pid)) {
      return { type: "redeemed", destination: null, label: "Pool Redemption" };
    }
  }

  return { type: "unknown", destination: null, label: null };
}

/**
 * Fetch and classify transactions for a pool's manager fee account
 * using the Helius Enhanced Transaction History API.
 */
export async function trackPoolFeeAccount(
  poolId: string,
  feeAccountAddress: string,
  limit = 50,
): Promise<FeeEvent[]> {
  if (!HELIUS_API_KEY) {
    warn("HELIUS_API_KEY not set — skipping fee tracking");
    return [];
  }

  // Validate the fee account address is a valid Solana public key
  try {
    new PublicKey(feeAccountAddress);
  } catch {
    warn(`Invalid fee account address for ${poolId}: ${feeAccountAddress.slice(0, 8)}...`);
    return [];
  }

  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 100);
  const url = `${HELIUS_BASE}/addresses/${feeAccountAddress}/transactions/?api-key=${HELIUS_API_KEY}&limit=${safeLimit}`;

  try {
    const res = await fetchWithTimeout(url, 30_000);
    if (!res.ok) {
      warn(`Helius fee tracker failed for ${poolId}: HTTP ${res.status}`);
      return [];
    }

    const transactions = await res.json();
    if (!Array.isArray(transactions)) return [];

    const events: FeeEvent[] = [];
    for (const tx of transactions) {
      const { type, destination, label } = classifyHeliusTransaction(tx);

      // Try to extract SOL amount from native transfers or token transfers
      let amountSol: number | null = null;
      const nativeTransfers = tx.nativeTransfers ?? [];
      const tokenTransfers = tx.tokenTransfers ?? [];

      if (nativeTransfers.length > 0) {
        // Sum outgoing SOL from the fee account
        const outgoing = nativeTransfers
          .filter((t: any) => t.fromUserAccount === feeAccountAddress)
          .reduce((s: number, t: any) => s + (t.amount ?? 0), 0);
        if (outgoing > 0) amountSol = outgoing / LAMPORTS_PER_SOL;
      }
      if (!amountSol && tokenTransfers.length > 0) {
        // Token amounts from Helius — treated as approximate SOL equivalent (LST ≈ SOL)
        const outgoing = tokenTransfers
          .filter((t: any) => t.fromUserAccount === feeAccountAddress)
          .reduce((s: number, t: any) => s + (t.tokenAmount ?? 0), 0);
        if (outgoing > 0) amountSol = outgoing;
      }

      events.push({
        poolId,
        eventType: type,
        amountSol,
        txSignature: tx.signature,
        destination,
        destinationLabel: label,
        blockTime: tx.timestamp ?? null,
      });
    }

    return events;
  } catch (err) {
    warn(`Fee tracker error for ${poolId}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

/**
 * Get the current token balance of a fee account.
 */
export async function getFeeAccountBalance(
  connection: Connection,
  feeAccountAddress: string,
): Promise<{ tokenBalance: number; mint: string } | null> {
  try {
    const accountInfo = await connection.getAccountInfo(new PublicKey(feeAccountAddress));
    if (!accountInfo || accountInfo.data.length < 72) return null;

    // SPL Token account layout: 32 bytes mint + 32 bytes owner + 8 bytes amount
    const mint = new PublicKey(accountInfo.data.subarray(0, 32)).toBase58();
    const amount = accountInfo.data.readBigUInt64LE(64);
    // Convert safely: divide while still BigInt to avoid overflow, then to Number
    const tokenBalance = Number(amount / BigInt(LAMPORTS_PER_SOL)) +
      Number(amount % BigInt(LAMPORTS_PER_SOL)) / LAMPORTS_PER_SOL;

    return { tokenBalance, mint };
  } catch {
    return null;
  }
}

/**
 * Track all pool fee accounts and return classified events + balances.
 */
export async function trackAllPoolFees(
  connection: Connection,
  poolFeeAccounts: { poolId: string; managerFeeAccount: string }[],
): Promise<{ events: FeeEvent[]; balances: FeeAccountBalance[] }> {
  const allEvents: FeeEvent[] = [];
  const allBalances: FeeAccountBalance[] = [];

  for (const pool of poolFeeAccounts) {
    if (!pool.managerFeeAccount) continue;

    // Fetch transaction history from Helius
    const events = await trackPoolFeeAccount(pool.poolId, pool.managerFeeAccount);
    allEvents.push(...events);

    // Get current balance
    const balance = await getFeeAccountBalance(connection, pool.managerFeeAccount);
    if (balance) {
      allBalances.push({
        poolId: pool.poolId,
        feeAccountAddress: pool.managerFeeAccount,
        tokenBalance: balance.tokenBalance,
        solEquivalent: balance.tokenBalance, // LST ≈ SOL (slightly > 1:1 due to accumulated rewards)
      });
    }

    // Rate limit: avoid hammering Helius
    await new Promise((r) => setTimeout(r, 300));
  }

  // Log summary
  const typeCounts: Record<string, number> = {};
  for (const e of allEvents) {
    typeCounts[e.eventType] = (typeCounts[e.eventType] ?? 0) + 1;
  }
  log(`Fee tracker: ${allEvents.length} events across ${poolFeeAccounts.length} pools`);
  log(`  Types: ${Object.entries(typeCounts).map(([t, c]) => `${t}=${c}`).join(", ")}`);

  return { events: allEvents, balances: allBalances };
}
