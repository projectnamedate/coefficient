/**
 * Cron entry point — importable version of the indexer for Vercel API routes.
 * Does not call process.exit() or use CLI flags.
 * Avoids fs/path so it works in Vercel's serverless runtime.
 */

import { runPipeline, type PipelineResult } from "./pipeline";
import sandwichData from "./data/sandwich-validators.json";
import validatorOverrides from "./data/validator-overrides.json";

export async function runIndexer(): Promise<PipelineResult> {
  return runPipeline({
    sandwichData: sandwichData as Array<{
      validator_pubkey: string;
      detected_date?: string;
      source?: string;
      sandwich_percent?: number;
    }>,
    validatorOverrides: validatorOverrides as Record<string, { name?: string; description?: string }>,
  });
}
