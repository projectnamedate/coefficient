import { MARINADE_API, fetchWithTimeout, log, warn } from "../config.js";

export interface MarinadeValidator {
  vote_account: string;
  marinade_stake: number; // lamports
  info_name: string | null;
}

export async function fetchMarinadeValidators(): Promise<MarinadeValidator[]> {
  log("Fetching validators from Marinade API...");
  try {
    const res = await fetchWithTimeout(
      `${MARINADE_API}/validators?limit=2000&order_by=marinade_stake&order=desc`,
      30_000
    );
    const data = await res.json();
    const validators = Array.isArray(data) ? data : data?.validators ?? [];

    // Filter to validators that actually have Marinade stake
    const withStake = validators.filter(
      (v: any) => v.marinade_stake && v.marinade_stake > 0
    );

    log(`Marinade: ${withStake.length} validators with delegation`);
    return withStake.map((v: any) => ({
      vote_account: v.vote_account ?? "",
      marinade_stake: v.marinade_stake ?? 0,
      info_name: v.info_name ?? null,
    }));
  } catch (err) {
    warn(`Marinade API failed: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}
