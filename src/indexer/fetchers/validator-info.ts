import { Connection, PublicKey, ValidatorInfo } from "@solana/web3.js";
import { log, warn } from "../config";

const CONFIG_PROGRAM_ID = new PublicKey("Config1111111111111111111111111111111111111");

export interface OnChainValidatorInfo {
  identityPubkey: string;
  name: string;
  website: string | null;
  details: string | null;
  iconUrl: string | null;
}

/**
 * Fetch all ValidatorInfo entries from the on-chain Config program.
 * Returns a Map keyed by identity pubkey (nodePubkey from getVoteAccounts).
 */
export async function fetchOnChainValidatorInfo(
  connection: Connection
): Promise<Map<string, OnChainValidatorInfo>> {
  log("Fetching on-chain ValidatorInfo from Config program...");

  const configAccounts = await connection.getProgramAccounts(CONFIG_PROGRAM_ID);
  const infoMap = new Map<string, OnChainValidatorInfo>();

  for (const { account } of configAccounts) {
    try {
      const validatorInfo = ValidatorInfo.fromConfigData(account.data);
      if (!validatorInfo) continue;

      const entry: OnChainValidatorInfo = {
        identityPubkey: validatorInfo.key.toBase58(),
        name: validatorInfo.info.name,
        website: validatorInfo.info.website ?? null,
        details: validatorInfo.info.details ?? null,
        iconUrl: validatorInfo.info.iconUrl ?? null,
      };

      infoMap.set(entry.identityPubkey, entry);
    } catch {
      // Not a validator info account or malformed — skip
      continue;
    }
  }

  log(`On-chain ValidatorInfo: ${infoMap.size} entries`);
  return infoMap;
}
