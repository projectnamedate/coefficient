import { NextResponse } from "next/server";
import { getPoolsWithScores, getLatestScoredEpoch } from "@/db/queries";

export async function GET() {
  const epoch = await getLatestScoredEpoch();
  const pools = await getPoolsWithScores();

  return NextResponse.json({
    epoch,
    pools,
  });
}
