import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPoolsWithScores, getLatestScoredEpoch } from "@/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Coefficient – Compare Stake Pools";
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
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 14, color: "rgba(205,200,189,0.4)", letterSpacing: 2 }}>
            EPOCH {epoch ?? "—"} · COMPARE
          </div>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#ffffff", fontFamily: "BN Rigidly", marginTop: 4 }}>
            Pool Comparison
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "rgba(205,200,189,0.5)", marginTop: 4 }}>
            Side-by-side decentralization health scores for {pools.length} Solana stake pools
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 36, flex: 1 }}>
          {sorted.slice(0, 12).map((pool) => (
            <div
              key={pool.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 130,
                height: 90,
                borderRadius: 12,
                border: `2px solid ${getBarColor(pool.networkHealthScore)}33`,
                background: "rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: getBarColor(pool.networkHealthScore), fontFamily: "BN Rigidly" }}>
                {pool.networkHealthScore}
              </div>
              <div style={{ display: "flex", fontSize: 12, color: "rgba(205,200,189,0.5)", marginTop: 4 }}>
                {pool.name}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <div style={{ display: "flex", fontSize: 20, color: "#b5b2d9", fontFamily: "BN Rigidly", letterSpacing: 1 }}>
            coefficient
          </div>
          <div style={{ display: "flex", fontSize: 13, color: "rgba(205,200,189,0.3)" }}>
            coefficient.mythx.art/compare
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "BN Rigidly", data: bnRigidly, style: "normal" as const, weight: 400 }],
    }
  );
}
