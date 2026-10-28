import { NextResponse } from "next/server";
import { getPoolsWithScores, getLatestScoredEpoch } from "@/db/queries";

// Cached like the pages (24h ISR) so the cron's revalidation refreshes it too.
export const revalidate = 86400;

export async function GET() {
  try {
    const epoch = await getLatestScoredEpoch();
    const pools = await getPoolsWithScores(epoch ?? undefined);

    return NextResponse.json({ epoch, pools });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("API /pools error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
