export const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL;

export const STAKEWIZ_API = "https://api.stakewiz.com";
export const MARINADE_API = "https://validators-api.marinade.finance";

export const LAMPORTS_PER_SOL = 1_000_000_000;

// CLI flags
export function parseFlags(): { dryRun: boolean; force: boolean; watch: boolean; epoch?: number } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    force: args.includes("--force"),
    watch: args.includes("--watch"),
    epoch: (() => {
      const idx = args.indexOf("--epoch");
      return idx >= 0 ? parseInt(args[idx + 1], 10) : undefined;
    })(),
  };
}

// Fetch with timeout and error handling
export async function fetchWithTimeout(
  url: string,
  timeoutMs = 30_000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

// Logging helpers
export function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

export function warn(msg: string) {
  console.warn(`[${new Date().toISOString().slice(11, 19)}] ⚠ ${msg}`);
}

export function fatal(msg: string): never {
  console.error(`[${new Date().toISOString().slice(11, 19)}] ✗ FATAL: ${msg}`);
  process.exit(1);
}
