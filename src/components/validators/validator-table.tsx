"use client";

import { useState } from "react";
import Link from "next/link";

interface ValidatorRow {
  pubkey: string;
  name: string | null;
  country: string | null;
  city: string | null;
  datacenter: string | null;
  client: string | null;
  sfdpStatus: string | null;
  activeStake: number;
  commission: number;
  skipRate: number | null;
  apy: number | null;
  wizScore: number | null;
  stakeTier: string | null;
  isSuperminority: boolean | null;
  isSandwich: boolean;
  sandwichPercent: number | null;
  pools: { poolId: string; poolName: string; delegatedSol: number }[];
}

function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

function TierBadge({ tier }: { tier: string | null }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    superminority: { bg: "bg-score-bad/20", text: "text-score-bad", label: "Super" },
    large: { bg: "bg-score-mid/20", text: "text-score-mid", label: "Large" },
    medium: { bg: "bg-info/20", text: "text-info", label: "Med" },
    small: { bg: "bg-score-good/20", text: "text-score-good", label: "Small" },
  };
  const c = config[tier ?? ""] ?? { bg: "bg-white/5", text: "text-beige/40", label: tier ?? "?" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

type SortKey = "wizScore" | "activeStake" | "commission" | "skipRate" | "apy" | "pools";

export function ValidatorTable({ validators }: { validators: ValidatorRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("wizScore");
  const [sortDesc, setSortDesc] = useState(true);
  const [filter, setFilter] = useState("");

  const filtered = validators.filter((v) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.pubkey.toLowerCase().includes(q) ||
      v.country?.toLowerCase().includes(q) ||
      v.pools.some((p) => p.poolName.toLowerCase().includes(q))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let diff: number;
    if (sortKey === "pools") {
      diff = a.pools.length - b.pools.length;
    } else {
      diff = ((a[sortKey] as number) ?? 0) - ((b[sortKey] as number) ?? 0);
    }
    return sortDesc ? -diff : diff;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  const SortHeader = ({ k, children, className = "" }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      onClick={() => handleSort(k)}
      className={`px-3 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider cursor-pointer hover:text-lavender transition-colors select-none ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {sortKey === k && (
          <span className="text-lavender">{sortDesc ? "\u2193" : "\u2191"}</span>
        )}
      </span>
    </th>
  );

  return (
    <div>
      {/* Search */}
      <div className="px-4 py-3 border-b border-white/5">
        <input
          type="text"
          placeholder="Search validators, pools, or countries..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm bg-white/[0.04] border border-white/[0.08] rounded-md px-3 py-1.5 text-sm text-white placeholder:text-beige/30 outline-none focus:border-lavender/40 transition-colors"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider w-6">
                #
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">
                Validator
              </th>
              <SortHeader k="wizScore">Wiz Score</SortHeader>
              <SortHeader k="activeStake">Stake</SortHeader>
              <th className="px-3 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">
                Tier
              </th>
              <SortHeader k="commission">Comm.</SortHeader>
              <SortHeader k="skipRate">Skip %</SortHeader>
              <SortHeader k="apy">APY</SortHeader>
              <SortHeader k="pools">Pools</SortHeader>
              <th className="px-3 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">
                Geo
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((v, index) => (
              <tr
                key={v.pubkey}
                className="border-b border-white/5 hover:bg-lavender/[0.04] transition-colors"
              >
                <td className="px-3 py-3 text-sm text-beige/25 font-mono tabular-nums">
                  {index + 1}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Link href={`/validator/${v.pubkey}`} className="text-sm font-semibold text-white hover:text-lavender transition-colors">
                          {v.name ?? v.pubkey.slice(0, 8)}
                        </Link>
                        {v.isSandwich && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-score-bad/20 text-score-bad font-mono" title={`Sandwich: ${v.sandwichPercent}% of blocks`}>
                            SANDWICH
                          </span>
                        )}
                        {v.sfdpStatus === "active" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-score-good/15 text-score-good/70 font-mono">
                            SFDP
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-beige/30 font-mono">
                        {v.pubkey.slice(0, 4)}...{v.pubkey.slice(-4)}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-sm font-mono tabular-nums font-semibold ${
                    (v.wizScore ?? 0) >= 70 ? "text-score-good" : (v.wizScore ?? 0) >= 40 ? "text-score-mid" : "text-score-bad"
                  }`}>
                    {v.wizScore ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-beige/60 font-mono tabular-nums">
                  {formatSol(v.activeStake)}
                </td>
                <td className="px-3 py-3">
                  <TierBadge tier={v.stakeTier} />
                </td>
                <td className="px-3 py-3 text-sm text-beige/60 font-mono tabular-nums">
                  {v.commission}%
                </td>
                <td className="px-3 py-3 text-sm text-beige/60 font-mono tabular-nums">
                  {v.skipRate?.toFixed(1) ?? "—"}%
                </td>
                <td className="px-3 py-3 text-sm text-beige/60 font-mono tabular-nums">
                  {v.apy?.toFixed(2) ?? "—"}%
                </td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap gap-1">
                    {v.pools.slice(0, 3).map((p) => (
                      <span
                        key={p.poolId}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-lavender/10 text-lavender/70 font-mono"
                      >
                        {p.poolName}
                      </span>
                    ))}
                    {v.pools.length > 3 && (
                      <span className="text-[10px] text-beige/30 font-mono">
                        +{v.pools.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-beige/50">{v.country}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-beige/30 font-mono">
                      {v.client}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-beige/30 text-sm">
          No validators match your search.
        </div>
      )}
    </div>
  );
}
