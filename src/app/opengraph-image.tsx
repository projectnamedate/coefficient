import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const alt = "Coefficient – Solana Stake Pool Health Dashboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Node positions for the C logomark (scaled to fit ~300px space)
const nodes = [
  { x: 112, y: 30, r: 12, o: 1 },     // top
  { x: 162, y: 35, r: 10, o: 0.7 },    // top-right
  { x: 212, y: 55, r: 8, o: 0.5 },     // right-top
  { x: 70, y: 70, r: 11, o: 0.85 },    // upper-left
  { x: 40, y: 120, r: 12, o: 1 },       // left-upper
  { x: 35, y: 180, r: 12, o: 1 },       // left-lower
  { x: 60, y: 230, r: 11, o: 0.85 },    // lower-left
  { x: 105, y: 262, r: 12, o: 1 },      // bottom
  { x: 162, y: 270, r: 10, o: 0.7 },    // bottom-right
  { x: 212, y: 250, r: 8, o: 0.5 },     // right-bottom
];

// Lines connecting nodes (index pairs)
const lines = [
  [0, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9],
  [0, 1], [1, 2], [0, 4], [3, 5], [6, 8],
];

export default async function Image() {
  const bnRigidly = await readFile(
    join(process.cwd(), "public/fonts/BNRigidly-CustomRounding.otf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #141418 0%, #1a1a22 50%, #1e1e28 100%)",
          fontFamily: "Inter",
          color: "#cdc8bd",
        }}
      >
        {/* Left side: Logo */}
        <div
          style={{
            display: "flex",
            width: 450,
            height: "100%",
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Glow backdrop */}
          <div
            style={{
              display: "flex",
              position: "absolute",
              width: 280,
              height: 280,
              borderRadius: 140,
              background: "radial-gradient(circle, rgba(181,178,217,0.08) 0%, transparent 70%)",
              top: 175,
              left: 85,
            }}
          />
          {/* Lines */}
          {lines.map(([a, b], i) => {
            const n1 = nodes[a];
            const n2 = nodes[b];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <div
                key={`line-${i}`}
                style={{
                  display: "flex",
                  position: "absolute",
                  left: n1.x + 80,
                  top: n1.y + 160,
                  width: len,
                  height: 1,
                  background: "rgba(181,178,217,0.15)",
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "0 0",
                }}
              />
            );
          })}
          {/* Nodes */}
          {nodes.map((node, i) => (
            <div
              key={`node-${i}`}
              style={{
                display: "flex",
                position: "absolute",
                left: node.x + 80 - node.r,
                top: node.y + 160 - node.r,
                width: node.r * 2,
                height: node.r * 2,
                borderRadius: node.r,
                background: "#b5b2d9",
                opacity: node.o,
              }}
            />
          ))}
        </div>

        {/* Right side: Text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingRight: 64,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              fontFamily: "BN Rigidly",
              color: "#d9daed",
              letterSpacing: 2,
            }}
          >
            coefficient
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              color: "rgba(205,200,189,0.5)",
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            Solana Stake Pool Health Dashboard
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 15,
              color: "rgba(181,178,217,0.4)",
              marginTop: 24,
              letterSpacing: 3,
            }}
          >
            BY MYTHX.ART
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
