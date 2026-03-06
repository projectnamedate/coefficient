import { NextResponse } from "next/server";

export const maxDuration = 60; // Allow up to 60s (Vercel Pro)
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Dynamic import to avoid bundling the indexer with the Next.js app
    const { runIndexer } = await import("../../../indexer/cron-entry.js");
    const result = await runIndexer();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Cron indexer failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
