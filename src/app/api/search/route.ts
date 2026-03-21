import { NextRequest, NextResponse } from "next/server";
import { searchPoolsAndValidators } from "@/db/queries";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ pools: [], validators: [] });
  }
  if (q.length > 100) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  try {
    const results = await searchPoolsAndValidators(q);
    return NextResponse.json(results);
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json({ pools: [], validators: [] }, { status: 500 });
  }
}
