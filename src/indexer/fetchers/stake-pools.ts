import { Connection, PublicKey } from "@solana/web3.js";
import { stakePoolInfo, StakePoolLayout, ValidatorListLayout } from "@solana/spl-stake-pool";
import { LAMPORTS_PER_SOL, log, warn } from "../config";
import { POOL_REGISTRY, type PoolRegistryEntry } from "../data/pool-registry";

export interface PoolDelegationData {
  poolId: string;
  validators: {
    voteAccountAddress: string;
    activeSol: number;
  }[];
  totalSol: number;
  error?: string;
}

async function fetchSinglePool(
  connection: Connection,
  pool: PoolRegistryEntry
): Promise<PoolDelegationData> {
  try {
    const poolPubkey = new PublicKey(pool.stakePoolAddress);
    const info = await stakePoolInfo(connection, poolPubkey);

    const validators: { voteAccountAddress: string; activeSol: number }[] = [];
    let totalSol = 0;

    if (info.validatorList && Array.isArray(info.validatorList)) {
      for (const entry of info.validatorList) {
        const raw = entry.voteAccountAddress as any;
        const voteAddress = typeof raw?.toBase58 === "function" ? raw.toBase58() : String(raw ?? "");
        const stakeLamports = typeof entry.activeStakeLamports === "bigint"
          ? Number(entry.activeStakeLamports)
          : Number(entry.activeStakeLamports ?? 0);
        const transientLamports = typeof entry.transientStakeLamports === "bigint"
          ? Number(entry.transientStakeLamports)
          : Number(entry.transientStakeLamports ?? 0);
        const sol = (stakeLamports + transientLamports) / LAMPORTS_PER_SOL;

        if (voteAddress && sol > 0) {
          validators.push({ voteAccountAddress: voteAddress, activeSol: sol });
          totalSol += sol;
        }
      }
    }

    return { poolId: pool.id, validators, totalSol };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warn(`Failed to fetch pool ${pool.id} (${pool.name}): ${msg}`);
    return { poolId: pool.id, validators: [], totalSol: 0, error: msg };
  }
}

/** Fetch pool delegations using direct account reads (works for sanctum-multi programs) */
async function fetchSanctumMultiPool(
  connection: Connection,
  pool: PoolRegistryEntry
): Promise<PoolDelegationData> {
  try {
    const poolPubkey = new PublicKey(pool.stakePoolAddress);
    const poolAccountInfo = await connection.getAccountInfo(poolPubkey);
    if (!poolAccountInfo) {
      throw new Error("Pool account not found on-chain");
    }

    const poolData = StakePoolLayout.decode(poolAccountInfo.data);
    const validatorListInfo = await connection.getAccountInfo(poolData.validatorList);
    if (!validatorListInfo) {
      throw new Error("Validator list account not found on-chain");
    }

    const validatorList = ValidatorListLayout.decode(validatorListInfo.data);
    const validators: { voteAccountAddress: string; activeSol: number }[] = [];
    let totalSol = 0;

    for (const entry of validatorList.validators) {
      const raw = entry.voteAccountAddress as any;
      const voteAddress = typeof raw?.toBase58 === "function" ? raw.toBase58() : String(raw ?? "");
      const stakeLamports = typeof entry.activeStakeLamports === "bigint"
        ? Number(entry.activeStakeLamports)
        : Number(entry.activeStakeLamports ?? 0);
      const transientLamports = typeof entry.transientStakeLamports === "bigint"
        ? Number(entry.transientStakeLamports)
        : Number(entry.transientStakeLamports ?? 0);
      const sol = (stakeLamports + transientLamports) / LAMPORTS_PER_SOL;

      if (voteAddress && sol > 0) {
        validators.push({ voteAccountAddress: voteAddress, activeSol: sol });
        totalSol += sol;
      }
    }

    return { poolId: pool.id, validators, totalSol };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    warn(`Failed to fetch sanctum-multi pool ${pool.id} (${pool.name}): ${msg}`);
    return { poolId: pool.id, validators: [], totalSol: 0, error: msg };
  }
}

export async function fetchAllPoolDelegations(
  connection: Connection
): Promise<PoolDelegationData[]> {
  const splPools = POOL_REGISTRY.filter(
    (p) => p.program === "spl-stake-pool" && p.stakePoolAddress !== "UNKNOWN"
  );
  const sanctumMultiPools = POOL_REGISTRY.filter(
    (p) => p.program === "sanctum-multi"
  );

  log(`Fetching delegations for ${splPools.length} SPL + ${sanctumMultiPools.length} Sanctum-multi stake pools...`);
  const results: PoolDelegationData[] = [];

  for (const pool of splPools) {
    const result = await fetchSinglePool(connection, pool);
    if (!result.error) {
      log(`  ${pool.name}: ${result.validators.length} validators, ${(result.totalSol / 1_000_000).toFixed(2)}M SOL`);
    }
    results.push(result);
    await new Promise((r) => setTimeout(r, 200));
  }

  for (const pool of sanctumMultiPools) {
    const result = await fetchSanctumMultiPool(connection, pool);
    if (!result.error) {
      log(`  ${pool.name} (sanctum-multi): ${result.validators.length} validators, ${(result.totalSol / 1_000_000).toFixed(2)}M SOL`);
    }
    results.push(result);
    await new Promise((r) => setTimeout(r, 200));
  }

  return results;
}
