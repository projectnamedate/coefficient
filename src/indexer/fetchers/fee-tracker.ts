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
 * Determine if the fee account's token balance changed in this transaction.
 *
 * Critical: Helius returns ALL transactions that touch the address, including
 * epoch update cranks that list the fee account as a read-only reference,
 * and other users' swaps that route through AMMs. We only care about
 * transactions where the fee account's actual token balance changed.
 *
 * Uses accountData.tokenBalanceChanges (the authoritative source) rather than
 * tokenTransfers (which uses wallet owner addresses, not token account addresses).
 */
function getFeeAccountBalanceChange(tx: any, feeAccountAddress: string): { direction: "outgoing" | "incoming" | "none"; amount: number } {
  const accountData = tx.accountData ?? [];
  const feeAcctData = accountData.find((a: any) => a.account === feeAccountAddress);

  if (!feeAcctData) return { direction: "none", amount: 0 };

  const tokenChanges = feeAcctData.tokenBalanceChanges ?? [];
  for (const change of tokenChanges) {
    const rawChange = change.rawTokenAmount?.tokenAmount;
    if (!rawChange) continue;
    const decimals = change.rawTokenAmount?.decimals ?? 9;
    const amount = Number(rawChange) / Math.pow(10, decimals);

    if (amount < 0) return { direction: "outgoing", amount: Math.abs(amount) };
    if (amount > 0) return { direction: "incoming", amount };
  }

  return { direction: "none", amount: 0 };
}

/**
 * Classify a Helius-parsed transaction for a fee account.
 * Only classifies as a sell action (swapped/redeemed/transferred) if the
 * fee account actually sent tokens out. Otherwise ignores the transaction
 * or classifies as "collected" if tokens came in.
 */
function classifyHeliusTransaction(tx: any, feeAccountAddress: string): { type: FeeEventType; destination: string | null; label: string | null; amount: number } | null {
  const txType = tx.type as string;
  const { direction, amount } = getFeeAccountBalanceChange(tx, feeAccountAddress);

  // Skip transactions that don't change the fee account's token balance
  if (direction === "none") return null;

  // Incoming tokens = fee collection (epoch fee minting)
  if (direction === "incoming") {
    return { type: "collected", destination: null, label: null, amount };
  }

  // From here, direction === "outgoing" — the fee account lost tokens.
  // Now classify what kind of outgoing action it was.

  // DEX swap where fee account is the seller
  if (txType === "SWAP") {
    return { type: "swapped", destination: null, label: "DEX Swap", amount };
  }

  // Stake pool redemption (withdraw LST for SOL)
  if (txType === "UNSTAKE_SOL" || txType === "WITHDRAW") {
    return { type: "redeemed", destination: null, label: "Pool Redemption", amount };
  }

  // Token transfer out — check if destination is a known exchange
  if (txType === "TRANSFER" || txType === "TOKEN_TRANSFER") {
    const transfers = tx.tokenTransfers ?? [];
    for (const t of transfers) {
      const dest = t.toUserAccount ?? t.toTokenAccount ?? "";
      const cex = CEX_ADDRESSES.get(dest);
      if (cex) {
        return { type: "transferred", destination: dest, label: cex, amount };
      }
    }
    return { type: "transferred", destination: null, label: null, amount };
  }

  // Fallback: check program IDs for known DEX/pool programs
  const instructions = tx.instructions ?? [];
  const programIds = instructions.map((ix: any) => ix.programId);

  for (const pid of programIds) {
    if (DEX_PROGRAMS.has(pid)) {
      return { type: "swapped", destination: null, label: "DEX Swap", amount };
    }
    if (STAKE_POOL_PROGRAMS.has(pid)) {
      return { type: "redeemed", destination: null, label: "Pool Redemption", amount };
    }
  }

  // Outgoing but can't classify further
  return { type: "unknown", destination: null, label: null, amount };
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
      const classified = classifyHeliusTransaction(tx, feeAccountAddress);
      if (!classified) continue; // Transaction didn't change the fee account's token balance
      const { type, destination, label, amount } = classified;

      // Amount comes from accountData.tokenBalanceChanges (authoritative)
      // Treated as approximate SOL equivalent since LST ≈ SOL
      const amountSol = amount > 0 ? amount : null;

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
 *
 * Tracks the managerFeeAccount (token account) for:
 * - Incoming mints (epoch fee collection)
 * - Balance decreases (tokens withdrawn/sold — classified by transaction type)
 *
 * Note: Most pools accumulate LST in the fee account and rarely sell.
 * When a balance decrease IS detected, the transaction type reveals the method
 * (DEX swap, pool redemption, transfer to exchange, etc.)
 */
export async function trackAllPoolFees(
  connection: Connection,
  poolFeeAccounts: { poolId: string; managerFeeAccount: string; managerWallet?: string }[],
): Promise<{ events: FeeEvent[]; balances: FeeAccountBalance[] }> {
  const allEvents: FeeEvent[] = [];
  const allBalances: FeeAccountBalance[] = [];

  for (const pool of poolFeeAccounts) {
    if (!pool.managerFeeAccount) continue;

    // Track the fee token account for both collections and withdrawals
    const events = await trackPoolFeeAccount(pool.poolId, pool.managerFeeAccount);
    allEvents.push(...events);

    // Get current balance of the fee token account
    const balance = await getFeeAccountBalance(connection, pool.managerFeeAccount);
    if (balance) {
      allBalances.push({
        poolId: pool.poolId,
        feeAccountAddress: pool.managerFeeAccount,
        tokenBalance: balance.tokenBalance,
        solEquivalent: balance.tokenBalance, // LST ≈ SOL
      });
    }

    // Rate limit
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
