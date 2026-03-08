"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { motion, AnimatePresence } from "framer-motion";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const ISO2_TO_NUMERIC: Record<string, string> = {
  US: "840", DE: "276", UA: "804", GB: "826", SG: "702", CA: "124",
  CH: "756", FI: "246", RS: "688", JP: "392", AU: "036", CN: "156",
  KR: "410", FR: "250", NL: "528", PL: "616", RU: "643", BR: "076",
  IN: "356", IE: "372", SE: "752", NO: "578", DK: "208", ES: "724",
  IT: "380", PT: "620", CZ: "203", RO: "642", BG: "100", HR: "191",
  HU: "348", AT: "040", BE: "056", LT: "440", LV: "428", EE: "233",
  GR: "300", SK: "703", SI: "705", TR: "792", IL: "376", AE: "784",
  HK: "344", TW: "158", PH: "608", ID: "360", TH: "764", VN: "704",
  MY: "458", NZ: "554", ZA: "710", NG: "566", KE: "404", AR: "032",
  CL: "152", CO: "170", MX: "484", PE: "604", VE: "862", EG: "818",
  PK: "586", BD: "050", LK: "144", GE: "268", AM: "051", KZ: "398",
};

export interface CountryData {
  code: string;
  name: string;
  validatorCount: number;
  totalStake: number;
}

interface Props {
  data: CountryData[];
}

function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

export function GeoHeatmap({ data }: Props) {
  const [features, setFeatures] = useState<any[]>([]);
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; country: CountryData;
  } | null>(null);
  const [revealedSet, setRevealedSet] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);

  const dataByNumericId = useMemo(() => {
    const map = new Map<string, CountryData>();
    for (const d of data) {
      const numId = ISO2_TO_NUMERIC[d.code];
      if (numId) map.set(numId, d);
    }
    return map;
  }, [data]);

  // Sorted by validator count descending for staggered reveal
  const sortedActiveIds = useMemo(() => {
    return Array.from(dataByNumericId.entries())
      .sort((a, b) => b[1].validatorCount - a[1].validatorCount)
      .map(([id]) => id);
  }, [dataByNumericId]);

  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const geo = topojson.feature(topo, topo.objects.countries);
        setFeatures((geo as any).features);
      });
  }, []);

  // Staggered reveal: light up countries one by one after features load
  useEffect(() => {
    if (features.length === 0 || sortedActiveIds.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    sortedActiveIds.forEach((id, i) => {
      const timer = setTimeout(() => {
        setRevealedSet((prev) => new Set([...prev, id]));
      }, 300 + i * 60);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [features, sortedActiveIds]);

  const width = 960;
  const height = 480;
  const projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([width / 2, height / 2]);
  const pathGen = d3.geoPath(projection);

  const maxValidators = Math.max(...data.map((d) => d.validatorCount), 1);
  const colorScale = d3.scaleSequential()
    .domain([0, maxValidators])
    .interpolator(d3.interpolateRgbBasis([
      "#2a2550",
      "#3d3578",
      "#7c6ff5",
      "#b5b2d9",
    ]));

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
      >
        <defs>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {features.map((feature: any, idx: number) => {
          const countryData = dataByNumericId.get(String(feature.id));
          const isActive = countryData && countryData.validatorCount > 0;
          const isRevealed = revealedSet.has(String(feature.id));
          const d = pathGen(feature) ?? "";

          return (
            <path
              key={feature.id ?? `f-${idx}`}
              d={d}
              fill={isActive && isRevealed
                ? (colorScale(countryData.validatorCount) ?? "#2a2550")
                : "rgba(255,255,255,0.03)"
              }
              stroke={isActive && isRevealed
                ? "rgba(181,178,217,0.25)"
                : "rgba(255,255,255,0.05)"
              }
              strokeWidth={isActive && isRevealed ? 0.8 : 0.4}
              style={{
                transition: "fill 0.8s ease-out, stroke 0.6s ease-out",
                cursor: isActive ? "pointer" : "default",
              }}
              filter={isActive && isRevealed ? "url(#glow)" : undefined}
              onMouseEnter={(e) => {
                if (!countryData || !svgRef.current) return;
                const rect = svgRef.current.getBoundingClientRect();
                setTooltip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  country: countryData,
                });
              }}
              onMouseMove={(e) => {
                if (!svgRef.current) return;
                const rect = svgRef.current.getBoundingClientRect();
                setTooltip((prev) =>
                  prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null
                );
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* Pulsing dots at centroids of top 10 countries */}
        {sortedActiveIds.slice(0, 10).map((id) => {
          if (!revealedSet.has(id)) return null;
          const feature = features.find((f: any) => String(f.id) === id);
          if (!feature) return null;
          const centroid = pathGen.centroid(feature);
          if (!centroid || isNaN(centroid[0])) return null;

          const countryData = dataByNumericId.get(id)!;
          const radius = 2 + (countryData.validatorCount / maxValidators) * 5;
          const rank = sortedActiveIds.indexOf(id);

          return (
            <g key={`dot-${id}`}>
              {/* Static dot */}
              <circle
                cx={centroid[0]}
                cy={centroid[1]}
                r={radius}
                fill="#b5b2d9"
                opacity={0.7}
                style={{
                  animation: `geo-fade-in 0.5s ease-out forwards`,
                }}
              />
              {/* Pulse ring for top 3 */}
              {rank < 3 && (
                <circle
                  cx={centroid[0]}
                  cy={centroid[1]}
                  r={radius}
                  fill="none"
                  stroke="#b5b2d9"
                  strokeWidth={1}
                  opacity={0}
                  style={{
                    transformOrigin: `${centroid[0]}px ${centroid[1]}px`,
                    animation: `geo-pulse 3s ease-out ${1 + rank * 0.5}s infinite`,
                  }}
                />
              )}
            </g>
          );
        })}
      </svg>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute pointer-events-none z-10 bg-neutral-900/95 border border-white/10 rounded-lg px-3 py-2 shadow-xl backdrop-blur-sm"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <p className="text-sm font-semibold text-white">
              {tooltip.country.name}
            </p>
            <p className="text-xs text-beige/50 font-mono mt-0.5">
              {tooltip.country.validatorCount} validator{tooltip.country.validatorCount !== 1 ? "s" : ""}
              {" · "}
              {formatSol(tooltip.country.totalStake)} SOL
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2 mt-3">
        <span className="text-[10px] text-beige/30 font-mono">0</span>
        <div
          className="h-2 w-32 rounded-full"
          style={{
            background: `linear-gradient(to right, #2a2550, #3d3578, #7c6ff5, #b5b2d9)`,
          }}
        />
        <span className="text-[10px] text-beige/30 font-mono">{maxValidators}</span>
        <span className="text-[10px] text-beige/20 ml-1">validators</span>
      </div>
    </div>
  );
}
