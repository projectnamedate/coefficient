import { NextResponse } from "next/server";
import { getPoolsWithScores, getLatestScoredEpoch } from "@/db/queries";

export async function GET() {
  try {
    const epoch = await getLatestScoredEpoch();
    const pools = await getPoolsWithScores();

    return NextResponse.json({ epoch, pools });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("API /pools error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
