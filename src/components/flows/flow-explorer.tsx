"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatSol } from "@/lib/format";

interface FlowData {
  pools: { id: string; name: string }[];
  validators: { pubkey: string; name: string }[];
  flows: { source: string; target: string; value: number }[];
}

type ViewMode = "pools" | "validators";

function FlowBar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5 group/bar">
      <span className="text-xs text-beige/50 w-40 sm:w-52 truncate shrink-0 group-hover/bar:text-beige/80 transition-colors">
        {label}
      </span>
      <div className="flex-1 h-5 bg-white/[0.03] rounded overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(pct, 0.5)}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
          className="h-full rounded"
          style={{ backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-xs text-beige/40 w-16 text-right font-mono shrink-0">
        {formatSol(value)}
      </span>
    </div>
  );
}

function PoolCard({
  pool,
  flows,
  validatorNames,
  isExpanded,
  onToggle,
}: {
  pool: { id: string; name: string };
  flows: { target: string; value: number }[];
  validatorNames: Map<string, string>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalStake = flows.reduce((s, f) => s + f.value, 0);
  const sorted = [...flows].sort((a, b) => b.value - a.value);
  const maxVal = sorted[0]?.value ?? 0;

  return (
    <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{pool.name}</span>
          <span className="text-xs text-beige/30 font-mono">{flows.length} validators</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-beige/40 font-mono">{formatSol(totalStake)} SOL</span>
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-beige/30"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </motion.svg>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/[0.04]">
              <div className="pt-3 space-y-0.5 max-h-80 overflow-y-auto custom-scrollbar">
                {sorted.map((f) => (
                  <FlowBar
                    key={f.target}
                    label={validatorNames.get(f.target) ?? f.target.slice(0, 8)}
                    value={f.value}
                    maxValue={maxVal}
                    color="#b5b2d9"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ValidatorCard({
  validator,
  flows,
  poolNames,
  isExpanded,
  onToggle,
}: {
  validator: { pubkey: string; name: string };
  flows: { source: string; value: number }[];
  poolNames: Map<string, string>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const totalStake = flows.reduce((s, f) => s + f.value, 0);
  const sorted = [...flows].sort((a, b) => b.value - a.value);
  const maxVal = sorted[0]?.value ?? 0;

  return (
    <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{validator.name}</span>
          <span className="text-xs text-beige/30 font-mono">{flows.length} pool{flows.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-beige/40 font-mono">{formatSol(totalStake)} SOL</span>
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-beige/30"
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </motion.svg>
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/[0.04]">
              <div className="pt-3 space-y-0.5">
                {sorted.map((f) => (
                  <FlowBar
                    key={f.source}
                    label={poolNames.get(f.source) ?? f.source}
                    value={f.value}
                    maxValue={maxVal}
                    color="#4e5fab"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FlowExplorer({ data }: { data: FlowData }) {
  const [viewMode, setViewMode] = useState<ViewMode>("pools");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const poolNames = useMemo(
    () => new Map(data.pools.map((p) => [p.id, p.name])),
    [data.pools]
  );
  const validatorNames = useMemo(
    () => new Map(data.validators.map((v) => [v.pubkey, v.name])),
    [data.validators]
  );

  // Group flows by pool
  const poolFlows = useMemo(() => {
    const map = new Map<string, { target: string; value: number }[]>();
    for (const f of data.flows) {
      const arr = map.get(f.source) ?? [];
      arr.push({ target: f.target, value: f.value });
      map.set(f.source, arr);
    }
    return map;
  }, [data.flows]);

  // Group flows by validator
  const validatorFlows = useMemo(() => {
    const map = new Map<string, { source: string; value: number }[]>();
    for (const f of data.flows) {
      const arr = map.get(f.target) ?? [];
      arr.push({ source: f.source, value: f.value });
      map.set(f.target, arr);
    }
    return map;
  }, [data.flows]);

  const query = search.toLowerCase();

  const filteredPools = useMemo(
    () =>
      data.pools
        .filter((p) => p.name.toLowerCase().includes(query))
        .sort((a, b) => {
          const aStake = (poolFlows.get(a.id) ?? []).reduce((s, f) => s + f.value, 0);
          const bStake = (poolFlows.get(b.id) ?? []).reduce((s, f) => s + f.value, 0);
          return bStake - aStake;
        }),
    [data.pools, query, poolFlows]
  );

  const filteredValidators = useMemo(
    () =>
      data.validators
        .filter((v) => v.name.toLowerCase().includes(query))
        .sort((a, b) => {
          const aStake = (validatorFlows.get(a.pubkey) ?? []).reduce((s, f) => s + f.value, 0);
          const bStake = (validatorFlows.get(b.pubkey) ?? []).reduce((s, f) => s + f.value, 0);
          return bStake - aStake;
        }),
    [data.validators, query, validatorFlows]
  );

  if (data.flows.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-beige/30">
        No delegation flow data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* View toggle */}
        <div className="flex bg-white/[0.04] rounded-lg p-0.5">
          <button
            onClick={() => { setViewMode("pools"); setExpandedId(null); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === "pools"
                ? "bg-lavender/20 text-lavender"
                : "text-beige/40 hover:text-beige/60"
            }`}
          >
            By Pool ({data.pools.length})
          </button>
          <button
            onClick={() => { setViewMode("validators"); setExpandedId(null); }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
              viewMode === "validators"
                ? "bg-info/20 text-info"
                : "text-beige/40 hover:text-beige/60"
            }`}
          >
            By Validator ({data.validators.length})
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 w-full sm:w-auto relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-beige/30 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={viewMode === "pools" ? "Search pools..." : "Search validators..."}
            className="w-full sm:w-72 bg-white/[0.04] border border-white/[0.06] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-beige/25 focus:outline-none focus:border-lavender/30 transition-colors"
          />
        </div>

        {/* Count */}
        <span className="text-xs text-beige/30 font-mono hidden sm:block">
          {viewMode === "pools"
            ? `${filteredPools.length} pool${filteredPools.length !== 1 ? "s" : ""}`
            : `${filteredValidators.length} validator${filteredValidators.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {viewMode === "pools" ? (
          filteredPools.map((pool) => (
            <PoolCard
              key={pool.id}
              pool={pool}
              flows={poolFlows.get(pool.id) ?? []}
              validatorNames={validatorNames}
              isExpanded={expandedId === pool.id}
              onToggle={() => setExpandedId(expandedId === pool.id ? null : pool.id)}
            />
          ))
        ) : (
          filteredValidators.map((v) => (
            <ValidatorCard
              key={v.pubkey}
              validator={v}
              flows={validatorFlows.get(v.pubkey) ?? []}
              poolNames={poolNames}
              isExpanded={expandedId === v.pubkey}
              onToggle={() => setExpandedId(expandedId === v.pubkey ? null : v.pubkey)}
            />
          ))
        )}
      </div>
    </div>
  );
}
