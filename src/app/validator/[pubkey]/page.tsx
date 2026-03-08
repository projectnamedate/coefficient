import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getValidatorDetail } from "@/db/queries";
import { getValidatorProfitability } from "@/lib/trillium";
import { ValidatorProfitability } from "@/components/validators/validator-profitability";
import { ScoreBadge } from "@/components/ui/score-badge";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";

export const dynamic = "force-dynamic";

function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}): Promise<Metadata> {
  const { pubkey } = await params;
  const val = await getValidatorDetail(pubkey);
  if (!val) return { title: "Validator Not Found | Coefficient" };
  return {
    title: `${val.name ?? pubkey.slice(0, 8)} | Coefficient`,
    description: `Validator ${val.name ?? pubkey.slice(0, 8)}: ${val.pools.length} pool memberships, ${formatSol(val.snapshot?.activeStake ?? 0)} SOL staked.`,
  };
}

export default async function ValidatorDetailPage({
  params,
}: {
  params: Promise<{ pubkey: string }>;
}) {
  const { pubkey } = await params;
  const [val, trilliumData] = await Promise.all([
    getValidatorDetail(pubkey),
    getValidatorProfitability(pubkey),
  ]);

  if (!val) notFound();

  const snap = val.snapshot;
  const totalPoolDelegation = val.pools.reduce((s, p) => s + p.delegatedSol, 0);

  return (
    <div>
      <HeroSection
        eyebrow={`Epoch ${val.epoch}`}
        title={val.name ?? pubkey.slice(0, 12)}
        accent={val.isSandwich ? "Sandwich Flagged" : "Validator"}
        description={`${pubkey.slice(0, 8)}...${pubkey.slice(-8)} · ${val.country ?? "Unknown"} · ${val.datacenter ?? "Unknown DC"}`}
        gradient={val.isSandwich ? "info" : "lavender"}
      />

      {/* Stats Row */}
      <AnimatedSection className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="gradient-border bg-white/[0.03] rounded-lg p-4">
            <p className="text-[10px] font-mono text-lavender/50 uppercase tracking-wider">Active Stake</p>
            <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{formatSol(snap?.activeStake ?? 0)}</p>
            <p className="text-[11px] text-beige/30 mt-1">
              {snap?.stakeTier ?? "—"}{snap?.isSuperminority ? " · Superminority" : ""}
            </p>
          </div>
          <div className="gradient-border bg-white/[0.03] rounded-lg p-4">
            <p className="text-[10px] font-mono text-lavender/50 uppercase tracking-wider">Commission</p>
            <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{snap?.commission ?? "—"}%</p>
            <p className="text-[11px] text-beige/30 mt-1">Current epoch</p>
          </div>
          <div className="gradient-border bg-white/[0.03] rounded-lg p-4">
            <p className="text-[10px] font-mono text-lavender/50 uppercase tracking-wider">Pool Memberships</p>
            <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{val.pools.length}</p>
            <p className="text-[11px] text-beige/30 mt-1">{formatSol(totalPoolDelegation)} SOL delegated</p>
          </div>
          <div className="gradient-border bg-white/[0.03] rounded-lg p-4">
            <p className="text-[10px] font-mono text-lavender/50 uppercase tracking-wider">Wiz Score</p>
            <p className="text-2xl font-bold text-white mt-1.5 tabular-nums">{snap?.wizScore ?? "—"}</p>
            <p className="text-[11px] text-beige/30 mt-1">
              {snap?.apy != null ? `APY ${snap.apy.toFixed(2)}%` : "—"}
              {snap?.skipRate != null ? ` · Skip ${(snap.skipRate * 100).toFixed(1)}%` : ""}
            </p>
          </div>
        </div>
      </AnimatedSection>

      {/* Sandwich Warning */}
      {val.isSandwich && (
        <AnimatedSection delay={0.05} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="gradient-border bg-score-bad/5 rounded-xl p-5 border-l-2 border-l-score-bad">
            <h2 className="text-sm font-medium text-score-bad uppercase tracking-wider mb-1">
              Sandwich Attacker
            </h2>
            <p className="text-xs text-beige/50">
              This validator has been flagged for sandwich attacks.
              {val.sandwichPercent != null && ` ${(val.sandwichPercent * 100).toFixed(1)}% of blocks contain sandwich transactions.`}
            </p>
          </div>
        </AnimatedSection>
      )}

      {/* Pool Memberships */}
      {val.pools.length > 0 && (
        <AnimatedSection delay={0.1} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="px-6 py-4 border-b border-white/5">
              <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider">
                Pool Memberships · {val.pools.length} pools
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Pool</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">LST</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-beige/50 uppercase tracking-wider">Delegated</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-beige/50 uppercase tracking-wider">Share</th>
                </tr>
              </thead>
              <tbody>
                {val.pools.map((p) => (
                  <tr key={p.poolId} className="border-b border-white/5 hover:bg-lavender/[0.04]">
                    <td className="px-4 py-3">
                      <Link href={`/pool/${p.poolId}`} className="text-sm font-semibold text-white hover:text-lavender transition-colors">
                        {p.poolName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-beige/40 font-mono">{p.lstTicker}</td>
                    <td className="px-4 py-3 text-sm text-beige/60 font-mono text-right">{formatSol(p.delegatedSol)}</td>
                    <td className="px-4 py-3 text-xs text-beige/40 font-mono text-right">
                      {totalPoolDelegation > 0 ? ((p.delegatedSol / totalPoolDelegation) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedSection>
      )}

      {/* Epoch Profitability */}
      {trilliumData.length > 0 && (
        <AnimatedSection delay={0.12} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
            <ValidatorProfitability epochs={trilliumData} />
          </div>
        </AnimatedSection>
      )}

      {/* Commission History */}
      {val.commissionHistory.length > 1 && (
        <AnimatedSection delay={0.15} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="gradient-border bg-white/[0.02] rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-3">
              Commission History
            </h2>
            <div className="space-y-1.5">
              {val.commissionHistory.map((h, i) => {
                const prev = i > 0 ? val.commissionHistory[i - 1].commission : h.commission;
                const delta = h.commission - prev;
                return (
                  <div key={h.epochNumber} className="flex items-center justify-between text-xs">
                    <span className="text-beige/40 font-mono">Epoch {h.epochNumber}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-beige/60 font-mono">{formatSol(h.activeStake)} SOL</span>
                      <span className={`font-mono font-semibold ${
                        delta > 0 ? "text-score-bad" : delta < 0 ? "text-score-good" : "text-beige/50"
                      }`}>
                        {h.commission}%
                        {delta !== 0 && i > 0 && (
                          <span className="text-[10px] ml-1">({delta > 0 ? "+" : ""}{delta})</span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Metadata */}
      <AnimatedSection delay={0.2} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl p-5 backdrop-blur-sm">
          <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-3">
            Validator Info
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6 text-xs">
            <div>
              <span className="text-beige/30">Country</span>
              <p className="text-beige/70 font-mono mt-0.5">{val.country ?? "Unknown"}</p>
            </div>
            <div>
              <span className="text-beige/30">City</span>
              <p className="text-beige/70 font-mono mt-0.5">{val.city ?? "Unknown"}</p>
            </div>
            <div>
              <span className="text-beige/30">Datacenter</span>
              <p className="text-beige/70 font-mono mt-0.5">{val.datacenter ?? "Unknown"}</p>
            </div>
            <div>
              <span className="text-beige/30">Client</span>
              <p className="text-beige/70 font-mono mt-0.5">{val.client ?? "Unknown"}</p>
            </div>
            <div>
              <span className="text-beige/30">SFDP Status</span>
              <p className="text-beige/70 font-mono mt-0.5">{val.sfdpStatus ?? "—"}</p>
            </div>
            <div>
              <span className="text-beige/30">Pubkey</span>
              <p className="text-beige/70 font-mono mt-0.5 truncate">{val.pubkey}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link href="/validators" className="text-xs text-lavender/40 hover:text-lavender transition-colors font-mono">
            ← Back to validator leaderboard
          </Link>
        </div>
      </AnimatedSection>
    </div>
  );
}
