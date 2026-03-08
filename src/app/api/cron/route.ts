import { NextResponse } from "next/server";
import { runIndexer } from "@/indexer/cron-entry";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

async function sendAlert(message: string) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Discord-compatible format (also works with many webhook services)
        content: message,
        // Slack-compatible format
        text: message,
      }),
    });
  } catch (e) {
    console.error("Failed to send alert:", e);
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIndexer();

    // Send success summary if webhook is configured
    if (process.env.ALERT_WEBHOOK_URL) {
      const summary = `Coefficient indexer ${result.status}: epoch ${result.epoch ?? "?"}, ${result.pools ?? 0} pools, ${result.elapsed ?? "?"}s`;
      await sendAlert(summary);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Cron indexer failed:", message);

    await sendAlert(`Coefficient indexer FAILED: ${message}`);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
