/**
 * Self-Dealing Score (10% weight)
 * Flags pools that require validators to buy pool tokens/LSTs to receive delegation.
 * Lookup from manual overrides.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface PoolOverride {
  selfDealingScore: number;
  transparencyScore: number;
}

let overrides: Record<string, PoolOverride> | null = null;

function loadOverrides(): Record<string, PoolOverride> {
  if (overrides) return overrides;
  try {
    const path = join(__dirname, "..", "data", "pool-overrides.json");
    overrides = JSON.parse(readFileSync(path, "utf-8"));
    return overrides!;
  } catch {
    return {};
  }
}

export function scoreSelfDealing(poolId: string): number {
  const data = loadOverrides();
  return data[poolId]?.selfDealingScore ?? 50;
}
