import { STAKEWIZ_API, fetchWithTimeout, log, warn } from "../config.js";

export interface StakeWizValidator {
  vote_identity: string;
  identity: string;
  name: string | null;
  commission: number;
  activated_stake: number;
  skip_rate: number | null;
  wiz_score: number | null;
  ip_country: string | null;
  ip_city: string | null;
  ip_org: string | null; // datacenter
  apy_estimate: number | null;
  total_apy: number | null;
  version: string | null;
  is_jito: boolean;
  above_halt_line: boolean; // true = superminority
}

export async function fetchStakeWizValidators(): Promise<StakeWizValidator[]> {
  log("Fetching validators from StakeWiz API...");
  try {
    const res = await fetchWithTimeout(`${STAKEWIZ_API}/validators`, 45_000);
    const data = await res.json();

    if (!Array.isArray(data)) {
      warn("StakeWiz API returned unexpected format");
      return [];
    }

    log(`StakeWiz: ${data.length} validators`);
    return data.map((v: any) => ({
      vote_identity: v.vote_identity ?? v.votePubkey ?? "",
      identity: v.identity ?? v.nodePubkey ?? "",
      name: v.name ?? null,
      commission: v.commission ?? 0,
      activated_stake: v.activated_stake ?? 0,
      skip_rate: v.skip_rate ?? null,
      wiz_score: v.wiz_score ?? null,
      ip_country: v.ip_country ?? null,
      ip_city: v.ip_city ?? null,
      ip_org: v.ip_org ?? null,
      apy_estimate: v.apy_estimate ?? null,
      total_apy: v.total_apy ?? null,
      version: v.version ?? null,
      is_jito: v.is_jito ?? false,
      above_halt_line: v.above_halt_line ?? false,
    }));
  } catch (err) {
    warn(`StakeWiz API failed: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}
