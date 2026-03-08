import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getScoreDeltas } from "@/db/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Coefficient – Pool Insights";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const deltas = await getScoreDeltas();

  const bnRigidly = await readFile(
    join(process.cwd(), "public/fonts/BNRigidly-CustomRounding.otf")
  );

  const prevMap = new Map(deltas.previous.map((p) => [p.poolId, p]));
  const changes = deltas.current
    .map((c) => {
      const prev = prevMap.get(c.poolId);
      const delta = prev ? c.networkHealthScore - prev.networkHealthScore : 0;
      return { name: c.poolName, score: c.networkHealthScore, delta };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

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
            {deltas.currentEpoch ? `EPOCH ${deltas.previousEpoch} → ${deltas.currentEpoch}` : "INSIGHTS"}
          </div>
          <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#ffffff", fontFamily: "BN Rigidly", marginTop: 4 }}>
            Pool Insights
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "rgba(205,200,189,0.5)", marginTop: 4 }}>
            Score changes, MEV tracking, datacenter risks, commission rugs
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 36, flex: 1 }}>
          {changes.slice(0, 8).map((c) => (
            <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", width: 140, fontSize: 16, color: "#ffffff", fontWeight: 600 }}>
                {c.name}
              </div>
              <div style={{ display: "flex", fontSize: 20, fontWeight: 700, color: "rgba(205,200,189,0.6)", fontFamily: "BN Rigidly" }}>
                {c.score}
              </div>
              {c.delta !== 0 && (
                <div style={{ display: "flex", fontSize: 16, fontWeight: 700, color: c.delta > 0 ? "#abd079" : "#ae4845" }}>
                  {c.delta > 0 ? "+" : ""}{c.delta}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <div style={{ display: "flex", fontSize: 20, color: "#b5b2d9", fontFamily: "BN Rigidly", letterSpacing: 1 }}>
            coefficient
          </div>
          <div style={{ display: "flex", fontSize: 13, color: "rgba(205,200,189,0.3)" }}>
            coefficient.mythx.art/insights
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
