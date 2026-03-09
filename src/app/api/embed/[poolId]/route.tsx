import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPoolReportCard } from "@/db/queries";
import { getGrade, getBarColorHex as getColor } from "@/lib/grades";

export const dynamic = "force-dynamic";


export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  const { poolId } = await params;
  const pool = await getPoolReportCard(poolId);

  const bnRigidly = await readFile(
    join(process.cwd(), "public/fonts/BNRigidly-CustomRounding.otf")
  );

  if (!pool) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#cdc8bd", fontSize: 18 }}>
          Pool not found
        </div>
      ),
      { width: 320, height: 160 }
    );
  }

  const grade = getGrade(pool.networkHealthScore);
  const color = getColor(pool.networkHealthScore);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 28px",
          background: "linear-gradient(135deg, #1a1a1a 0%, #232323 100%)",
          borderRadius: 12,
          fontFamily: "Inter",
          color: "#cdc8bd",
        }}
      >
        {/* Left: Pool info */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 10, color: "rgba(205,200,189,0.35)", letterSpacing: 1.5, textTransform: "uppercase" as const }}>
            Coefficient Score
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#ffffff", fontFamily: "BN Rigidly", marginTop: 4 }}>
            {pool.name}
          </div>
          <div style={{ fontSize: 12, color: "rgba(205,200,189,0.4)", marginTop: 2, display: "flex" }}>
            {pool.lstTicker} · {pool.validatorCount ?? 0} validators
          </div>
        </div>

        {/* Right: Grade circle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 36,
            border: `2px solid ${color}`,
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "BN Rigidly", lineHeight: 1 }}>
            {grade}
          </div>
          <div style={{ fontSize: 10, color: "rgba(205,200,189,0.4)", marginTop: 2, display: "flex" }}>
            {pool.networkHealthScore}
          </div>
        </div>
      </div>
    ),
    {
      width: 320,
      height: 160,
      fonts: [
        {
          name: "BN Rigidly",
          data: bnRigidly,
          style: "normal" as const,
          weight: 400,
        },
      ],
    }
  );
}
