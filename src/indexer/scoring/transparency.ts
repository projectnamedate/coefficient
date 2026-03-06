/**
 * Transparency Score (5% weight)
 * Qualitative checklist — lookup from manual overrides.
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

export function scoreTransparency(poolId: string): number {
  const data = loadOverrides();
  return data[poolId]?.transparencyScore ?? 50;
}
