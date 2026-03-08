import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPoolsWithScores, getLatestScoredEpoch } from "@/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Coefficient – Solana Stake Pool Health Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function getBarColor(s: number): string {
  if (s >= 70) return "#abd079";
  if (s >= 40) return "#eee56e";
  return "#ae4845";
}

export default async function Image() {
  const [pools, epoch] = await Promise.all([
    getPoolsWithScores(),
    getLatestScoredEpoch(),
  ]);

  const bnRigidly = await readFile(
    join(process.cwd(), "public/fonts/BNRigidly-CustomRounding.otf")
  );

  const sorted = pools.sort((a, b) => b.networkHealthScore - a.networkHealthScore);
  const top8 = sorted.slice(0, 8);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #1a1a1a 0%, #232323 50%, #2a2a2a 100%)",
          padding: "48px 56px",
          fontFamily: "Inter",
          color: "#cdc8bd",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 48,
                fontWeight: 700,
                color: "#b5b2d9",
                fontFamily: "BN Rigidly",
                letterSpacing: 1,
              }}
            >
              coefficient
            </div>
            <div style={{ display: "flex", fontSize: 18, color: "rgba(205,200,189,0.5)", marginTop: 4 }}>
              Solana Stake Pool Health Dashboard
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 14, color: "rgba(205,200,189,0.3)", letterSpacing: 2 }}>
              EPOCH {epoch ?? "—"}
            </div>
            <div style={{ display: "flex", fontSize: 14, color: "rgba(205,200,189,0.3)", marginTop: 4 }}>
              {pools.length} pools scored
            </div>
          </div>
        </div>

        {/* Pool scores */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 40, flex: 1 }}>
          {top8.map((pool) => (
            <div key={pool.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", width: 140, fontSize: 16, color: "#ffffff", fontWeight: 600 }}>
                {pool.name}
              </div>
              <div
                style={{
                  flex: 1,
                  height: 22,
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 11,
                  display: "flex",
                }}
              >
                <div
                  style={{
                    width: `${pool.networkHealthScore}%`,
                    height: "100%",
                    background: getBarColor(pool.networkHealthScore),
                    borderRadius: 11,
                  }}
                />
              </div>
              <div
                style={{
                  width: 36,
                  fontSize: 16,
                  fontWeight: 700,
                  color: getBarColor(pool.networkHealthScore),
                  textAlign: "right" as const,
                }}
              >
                {pool.networkHealthScore}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <div style={{ display: "flex", fontSize: 13, color: "rgba(205,200,189,0.25)" }}>
            by mythx.art
          </div>
          <div style={{ display: "flex", fontSize: 13, color: "rgba(205,200,189,0.3)" }}>
            coefficient.mythx.art
          </div>
        </div>
      </div>
    ),
    {
      ...size,
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
