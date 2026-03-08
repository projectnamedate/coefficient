"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  const [animated, setAnimated] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Build lookup: numeric ID -> country data
  const dataByNumericId = useMemo(() => {
    const map = new Map<string, CountryData>();
    for (const d of data) {
      const numId = ISO2_TO_NUMERIC[d.code];
      if (numId) map.set(numId, d);
    }
    return map;
  }, [data]);

  // Sorted country IDs by validator count descending (for staggered animation)
  const sortedActiveIds = useMemo(() => {
    return Array.from(dataByNumericId.entries())
      .sort((a, b) => b[1].validatorCount - a[1].validatorCount)
      .map(([id]) => id);
  }, [dataByNumericId]);

  // Animation delay per country: top countries light up first
  const animDelay = useMemo(() => {
    const map = new Map<string, number>();
    sortedActiveIds.forEach((id, i) => {
      map.set(id, 0.3 + i * 0.04); // stagger 40ms each, 300ms initial delay
    });
    return map;
  }, [sortedActiveIds]);

  useEffect(() => {
    fetch(GEO_URL)
      .then((r) => r.json())
      .then((topo) => {
        const geo = topojson.feature(topo, topo.objects.countries);
        setFeatures((geo as any).features);
        // Trigger animation after features load
        requestAnimationFrame(() => setAnimated(true));
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
        <defs>
          {/* Glow filter for active countries */}
          <filter id="country-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Stronger glow for top countries */}
          <filter id="country-glow-strong" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Base map: all countries dim */}
        {features.map((feature: any) => (
          <path
            key={`base-${feature.id}`}
            d={path(feature) ?? ""}
            fill="rgba(255,255,255,0.02)"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={0.5}
          />
        ))}

        {/* Active countries: animated on top */}
        {features.map((feature: any) => {
          const countryData = dataByNumericId.get(feature.id);
          if (!countryData) return null;

          const value = countryData.validatorCount;
          const isTop = sortedActiveIds.indexOf(feature.id) < 5;
          const delay = animDelay.get(feature.id) ?? 0;

          return (
            <motion.path
              key={`active-${feature.id}`}
              d={path(feature) ?? ""}
              fill={colorScale(value) ?? "#3d3578"}
              stroke="rgba(181,178,217,0.3)"
              strokeWidth={0.8}
              filter={isTop ? "url(#country-glow-strong)" : "url(#country-glow)"}
              className="cursor-pointer"
              initial={{ opacity: 0, fillOpacity: 0 }}
              animate={animated ? {
                opacity: 1,
                fillOpacity: 1,
              } : {}}
              transition={{
                duration: 0.6,
                delay,
                ease: "easeOut",
              }}
              onMouseEnter={(e) => {
                if (!svgRef.current) return;
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
              whileHover={{ fillOpacity: 1, scale: 1.02, filter: "url(#country-glow-strong)" }}
            />
          );
        })}

        {/* Pulsing dots for top 10 countries at centroids */}
        {animated && features.map((feature: any) => {
          const countryData = dataByNumericId.get(feature.id);
          if (!countryData) return null;
          const rank = sortedActiveIds.indexOf(feature.id);
          if (rank >= 10) return null;

          const centroid = path.centroid(feature);
          if (!centroid || isNaN(centroid[0])) return null;

          const radius = 2 + (countryData.validatorCount / maxValidators) * 6;
          const delay = (animDelay.get(feature.id) ?? 0) + 0.4;

          return (
            <motion.circle
              key={`dot-${feature.id}`}
              cx={centroid[0]}
              cy={centroid[1]}
              r={radius}
              fill="#b5b2d9"
              className="pointer-events-none"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 0.8, 0.4], scale: [0, 1.2, 1] }}
              transition={{
                duration: 1,
                delay,
                ease: "easeOut",
              }}
            />
          );
        })}

        {/* Animated ring pulse on top 3 */}
        {animated && features.map((feature: any) => {
          const countryData = dataByNumericId.get(feature.id);
          if (!countryData) return null;
          const rank = sortedActiveIds.indexOf(feature.id);
          if (rank >= 3) return null;

          const centroid = path.centroid(feature);
          if (!centroid || isNaN(centroid[0])) return null;

          const delay = (animDelay.get(feature.id) ?? 0) + 0.6;

          return (
            <motion.circle
              key={`ring-${feature.id}`}
              cx={centroid[0]}
              cy={centroid[1]}
              r={8}
              fill="none"
              stroke="#b5b2d9"
              strokeWidth={1}
              className="pointer-events-none"
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.6, 0],
                scale: [0.5, 2, 3],
              }}
              transition={{
                duration: 2,
                delay,
                repeat: Infinity,
                repeatDelay: 3,
                ease: "easeOut",
              }}
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
