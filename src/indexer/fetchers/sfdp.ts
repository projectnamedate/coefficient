import { fetchWithTimeout, log, warn } from "../config";

const SFDP_API = "https://api.solana.org/api/community/v1/sfdp_participants";

interface SfdpParticipant {
  mainnetBetaPubkey: string;
  state: string;
  testnetPubkey?: string;
}

/**
 * Fetch SFDP (Solana Foundation Delegation Program) participants.
 * Returns a Map of identity pubkey → sfdp status ("active" | "eligible").
 *
 * State mapping:
 *   Approved → "active" (on mainnet)
 *   TestnetOnboarded, Pending → "eligible"
 *   Retired, Rejected → skipped
 */
export async function fetchSfdpParticipants(): Promise<Map<string, string>> {
  log("Fetching SFDP participants...");
  try {
    const res = await fetchWithTimeout(SFDP_API, 30_000);
    const data: SfdpParticipant[] = await res.json();

    if (!Array.isArray(data)) {
      warn("SFDP API returned unexpected format");
      return new Map();
    }

    const result = new Map<string, string>();
    for (const p of data) {
      if (!p.mainnetBetaPubkey) continue;
      switch (p.state) {
        case "Approved":
          result.set(p.mainnetBetaPubkey, "active");
          break;
        case "TestnetOnboarded":
        case "Pending":
          result.set(p.mainnetBetaPubkey, "eligible");
          break;
        // Retired, Rejected — skip
      }
    }

    log(`SFDP: ${result.size} participants (${[...result.values()].filter((s) => s === "active").length} active)`);
    return result;
  } catch (err) {
    warn(`SFDP API failed: ${err instanceof Error ? err.message : err}`);
    return new Map();
  }
}
