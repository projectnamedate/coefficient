import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPoolReportCard } from "@/db/queries";
import { SCORE_LABELS, SCORE_WEIGHTS, type PoolScores } from "@/lib/types";
import { getGrade, getBarColorHex as getBarColor } from "@/lib/grades";

export const alt = "Coefficient – Solana Stake Pool Health Score";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";


function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pool = await getPoolReportCard(id);

  const bnRigidly = await readFile(
    join(process.cwd(), "public/fonts/BNRigidly-CustomRounding.otf")
  );

  if (!pool) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#1a1a1a",
            color: "#cdc8bd",
            fontSize: 32,
          }}
        >
          Pool not found
        </div>
      ),
      { ...size }
    );
  }

  const scores: PoolScores = {
    smallValidatorBias: pool.smallValidatorBias,
    selfDealing: pool.selfDealing,
    mevSandwichPolicy: pool.mevSandwichPolicy,
    nakamotoImpact: pool.nakamotoImpact,
    validatorSetSize: pool.validatorSetSize,
    geographicDiversity: pool.geographicDiversity,
    commissionDiscipline: pool.commissionDiscipline,
    transparency: pool.transparency,
  };

  const activeScores = (
    Object.entries(SCORE_WEIGHTS) as [keyof PoolScores, number][]
  ).filter(([, w]) => w > 0);

  const grade = getGrade(pool.networkHealthScore);
  const gradeColor =
    pool.networkHealthScore >= 70
      ? "#abd079"
      : pool.networkHealthScore >= 40
        ? "#eee56e"
        : "#ae4845";

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
        {/* Top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 14,
                color: "rgba(205,200,189,0.4)",
                letterSpacing: 2,
                textTransform: "uppercase" as const,
              }}
            >
              Epoch {pool.epoch} Report Card
            </div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#ffffff",
                fontFamily: "BN Rigidly",
                marginTop: 4,
              }}
            >
              {pool.name}
            </div>
            <div
              style={{
                fontSize: 18,
                color: "rgba(205,200,189,0.5)",
                marginTop: 4,
              }}
            >
              {pool.lstTicker} · {pool.validatorCount ?? 0} validators ·{" "}
              {formatSol(pool.activeSolStaked ?? 0)} SOL
            </div>
          </div>

          {/* Grade circle */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 120,
              height: 120,
              borderRadius: 60,
              border: `3px solid ${gradeColor}`,
              background: "rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                color: gradeColor,
                fontFamily: "BN Rigidly",
                lineHeight: 1,
              }}
            >
              {grade}
            </div>
            <div style={{ fontSize: 14, color: "rgba(205,200,189,0.5)", marginTop: 4 }}>
              {pool.networkHealthScore}/100
            </div>
          </div>
        </div>

        {/* Sub-score bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginTop: 36,
            flex: 1,
          }}
        >
          {activeScores.map(([key, weight]) => {
            const score = scores[key];
            return (
              <div
                key={key}
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                <div
                  style={{
                    width: 190,
                    fontSize: 15,
                    color: "rgba(205,200,189,0.6)",
                  }}
                >
                  {SCORE_LABELS[key]}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 18,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 9,
                    display: "flex",
                  }}
                >
                  <div
                    style={{
                      width: `${score}%`,
                      height: "100%",
                      background: getBarColor(score),
                      borderRadius: 9,
                    }}
                  />
                </div>
                <div
                  style={{
                    width: 32,
                    fontSize: 15,
                    fontWeight: 600,
                    color: getBarColor(score),
                    textAlign: "right" as const,
                  }}
                >
                  {score}
                </div>
                <div
                  style={{
                    width: 36,
                    fontSize: 11,
                    color: "rgba(205,200,189,0.25)",
                  }}
                >
                  {(weight * 100).toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom branding */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#b5b2d9",
              fontFamily: "BN Rigidly",
              letterSpacing: 1,
            }}
          >
            coefficient
          </div>
          <div style={{ fontSize: 13, color: "rgba(205,200,189,0.3)" }}>
            coefficient.mythx.art/pool/{pool.id}
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
