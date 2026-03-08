"use client";

import { useEffect, useState, useRef } from "react";
import * as d3 from "d3";
import * as topojson from "topojson-client";
import { motion, AnimatePresence } from "framer-motion";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO alpha-2 → world-atlas numeric ID (covers typical Solana validator countries)
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
  const svgRef = useRef<SVGSVGElement>(null);

  // Build lookup: numeric ID -> country data
  const dataByNumericId = new Map<string, CountryData>();
  for (const d of data) {
    const numId = ISO2_TO_NUMERIC[d.code];
    if (numId) dataByNumericId.set(numId, d);
  }

  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const geo = topojson.feature(topo, topo.objects.countries);
        setFeatures((geo as any).features);
      });
  }, []);

  const width = 960;
  const height = 480;
  const projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([width / 2, height / 2]);
  const path = d3.geoPath(projection);

  const maxValidators = Math.max(...data.map((d) => d.validatorCount), 1);
  const colorScale = d3.scaleSequential()
    .domain([0, maxValidators])
    .interpolator(d3.interpolateRgbBasis([
      "#1a1a2e",
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
        {features.map((feature: any) => {
          const countryData = dataByNumericId.get(feature.id);
          const value = countryData ? countryData.validatorCount : 0;

          return (
            <path
              key={feature.id ?? feature.properties?.name}
              d={path(feature) ?? ""}
              fill={value > 0 ? (colorScale(value) ?? "#1a1a2e") : "rgba(255,255,255,0.02)"}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.5}
              className="transition-colors duration-200 cursor-pointer hover:brightness-150"
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
                if (!tooltip || !svgRef.current) return;
                const rect = svgRef.current.getBoundingClientRect();
                setTooltip((prev) =>
                  prev ? { ...prev, x: e.clientX - rect.left, y: e.clientY - rect.top } : null
                );
              }}
              onMouseLeave={() => setTooltip(null)}
            />
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
            background: `linear-gradient(to right, #1a1a2e, #3d3578, #7c6ff5, #b5b2d9)`,
          }}
        />
        <span className="text-[10px] text-beige/30 font-mono">{maxValidators}</span>
        <span className="text-[10px] text-beige/20 ml-1">validators</span>
      </div>
    </div>
  );
}
