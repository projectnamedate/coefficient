import { NextResponse } from "next/server";
import { getPoolsWithScores, getLatestScoredEpoch } from "@/db/queries";

export async function GET() {
  try {
    const epoch = await getLatestScoredEpoch();
    const pools = await getPoolsWithScores();

    return NextResponse.json({ epoch, pools }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("API /pools error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
