#!/usr/bin/env npx tsx
/**
 * Epoch Indexer — CLI entry point
 *
 * Fetches Solana validator + stake pool data, computes pool health scores,
 * and writes everything to SQLite.
 *
 * Usage:
 *   npm run index              # Index current epoch
 *   npm run index -- --dry-run # Fetch + compute, skip DB writes
 *   npm run index -- --force   # Re-index even if epoch already exists
 *   npm run index -- --watch   # Run continuously, index each new epoch
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { parseFlags, log, warn, fatal } from "./config";
import { runPipeline } from "./pipeline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadSandwichList(): { validator_pubkey: string; sandwich_count?: number; sandwich_percent?: number; source: string; detected_date: string }[] {
  try {
    const path = join(__dirname, "data", "sandwich-validators.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    warn("Could not load sandwich-validators.json, using empty list");
    return [];
  }
}

function loadValidatorOverrides(): Record<string, { name?: string; description?: string }> {
  try {
    const path = join(__dirname, "data", "validator-overrides.json");
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    warn("Could not load validator-overrides.json, using empty overrides");
    return {};
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const flags = parseFlags();

  log("=== Coefficient Epoch Indexer ===");
  if (flags.dryRun) log("DRY RUN — no database writes");
  if (flags.force) log("FORCE — will re-index even if epoch exists");

  const sandwichData = loadSandwichList();
  const validatorOverrides = loadValidatorOverrides();

  const result = await runPipeline({
    sandwichData,
    validatorOverrides,
    dryRun: flags.dryRun,
    force: flags.force,
    epoch: flags.epoch,
  });

  return result.status !== "skipped";
}

// ---------------------------------------------------------------------------
// Watch mode — poll for new epochs
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

async function watch() {
  log("=== Watch mode — polling for new epochs ===");
  log(`Poll interval: ${POLL_INTERVAL_MS / 60_000} minutes`);

  while (true) {
    try {
      const indexed = await main();
      if (!indexed) {
        log(`Next check in ${POLL_INTERVAL_MS / 60_000} minutes...`);
      }
    } catch (err) {
      warn(`Indexer error (will retry): ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

const flags = parseFlags();

if (flags.watch) {
  watch().catch((err) => {
    console.error("Watch mode failed:", err);
    process.exit(1);
  });
} else {
  main().then((indexed) => {
    if (indexed === false) process.exit(0);
  }).catch((err) => {
    console.error("Indexer failed:", err);
    process.exit(1);
  });
}
