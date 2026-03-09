import {
  getScoreDeltas,
  getLatestScoredEpoch,
  getPoolsWithScores,
  getPoolDatacenterConcentration,
  getCommissionChanges,
  poolOverrides,
} from "@/db/queries";
import { computeTransparencyGrade } from "@/lib/transparency";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

function gradeColor(grade: string): string {
  if (grade === "A") return "text-score-good";
  if (grade === "B") return "text-score-mid";
  if (grade === "C") return "text-beige/60";
  return "text-score-bad";
}

export default async function InsightsPage() {
  const [deltas, epoch, pools] = await Promise.all([
    getScoreDeltas(),
    getLatestScoredEpoch(),
    getPoolsWithScores(),
  ]);

  // Get datacenter concentration and commission changes for all pools
  const dcResults = await Promise.all(
    pools.map(async (p) => ({
      poolId: p.id,
      poolName: p.name,
      datacenters: await getPoolDatacenterConcentration(p.id),
    }))
  );

  const commissionResults = await Promise.all(
    pools.map(async (p) => ({
      poolId: p.id,
      poolName: p.name,
      changes: await getCommissionChanges(p.id),
    }))
  );

  // Compute score deltas
  const prevMap = new Map(
    deltas.previous.map((p) => [p.poolId, p])
  );

  const scoreChanges = deltas.current
    .map((c) => {
      const prev = prevMap.get(c.poolId);
      if (!prev) return null;
      const delta = c.networkHealthScore - prev.networkHealthScore;
      return { ...c, delta, prevScore: prev.networkHealthScore };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && c.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  // Pools with high datacenter concentration (top DC > 50% of stake)
  const dcRisks = dcResults
    .map((d) => {
      const top = d.datacenters[0];
      if (!top) return null;
      return {
        poolId: d.poolId,
        poolName: d.poolName,
        topDC: top.datacenter,
        topPct: top.percentage,
        dcCount: d.datacenters.length,
        datacenters: d.datacenters.slice(0, 5),
      };
    })
    .filter((d): d is NonNullable<typeof d> => d !== null && d.topPct > 0.3)
    .sort((a, b) => b.topPct - a.topPct);

  // Commission rugs
  const commissionRugs = commissionResults
    .filter((c) => c.changes.length > 0)
    .map((c) => ({
      ...c,
      totalAffected: c.changes.reduce((s, ch) => s + ch.delegatedSol, 0),
      maxDelta: Math.max(...c.changes.map((ch) => ch.delta)),
    }))
    .sort((a, b) => b.maxDelta - a.maxDelta);

  // Overrides for MEV & transparency
  const overrides = poolOverrides as Record<string, any>;

  // MEV tracking — transparency grade is now computed, not manual
  const mevData = pools.map((p) => {
    const ov = overrides[p.id] ?? {};
    const { grade } = computeTransparencyGrade(
      {
        selfDealingScore: ov.selfDealingScore ?? 50,
        mevTipsToStakers: ov.mevTipsToStakers ?? false,
        jitoClient: ov.jitoClient ?? "unknown",
        mevCommissionCap: ov.mevCommissionCap ?? null,
      },
      p.validatorCount ?? 0
    );
    return {
      id: p.id,
      name: p.name,
      jitoClient: ov.jitoClient ?? "unknown",
      mevTipsToStakers: ov.mevTipsToStakers ?? false,
      mevCommissionCap: ov.mevCommissionCap ?? null,
      mevPolicy: ov.mevPolicy ?? "No data",
      transparencyGrade: grade,
    };
  }).sort((a, b) => {
    const order: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, "—": 5 };
    return (order[a.transparencyGrade] ?? 5) - (order[b.transparencyGrade] ?? 5);
  });

  return (
    <div>
      <HeroSection
        eyebrow={deltas.currentEpoch && deltas.previousEpoch
          ? `Epoch ${deltas.previousEpoch} → ${deltas.currentEpoch}`
          : `Epoch ${epoch ?? "—"}`}
        title="Pool"
        accent="Insights"
        description="Score changes, MEV redistribution policies, datacenter concentration risks, commission rugs, and delegation transparency grades."
        gradient="lavender"
      />

      {/* Score Changes */}
      <AnimatedSection className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
          Score Changes
          {deltas.previousEpoch && deltas.currentEpoch && (
            <span className="text-beige/25 ml-2">Epoch {deltas.previousEpoch} → {deltas.currentEpoch}</span>
          )}
        </h2>
        {scoreChanges.length === 0 ? (
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm text-center">
            <p className="text-beige/40 text-sm">No score changes between epochs (or only one epoch of data)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {scoreChanges.map((c) => (
              <Link
                key={c.poolId}
                href={`/pool/${c.poolId}`}
                className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm hover:bg-lavender/[0.04] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{c.poolName}</span>
                  <span className={`text-lg font-mono font-bold ${
                    c.delta > 0 ? "text-score-good" : "text-score-bad"
                  }`}>
                    {c.delta > 0 ? "+" : ""}{c.delta}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-beige/30 font-mono">{c.prevScore}</span>
                  <span className="text-xs text-beige/20">→</span>
                  <span className="text-xs text-beige/50 font-mono">{c.networkHealthScore}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AnimatedSection>

      {/* MEV Redistribution & Transparency */}
      <AnimatedSection delay={0.1} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
          MEV Redistribution & Transparency
        </h2>
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Pool</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Jito Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Tips to Stakers</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">MEV Cap</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Policy</th>
                </tr>
              </thead>
              <tbody>
                {mevData.map((m, i) => (
                  <tr key={m.id} className={`border-b border-white/5 hover:bg-lavender/[0.04] transition-colors duration-200 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                    <td className="px-4 py-3">
                      <Link href={`/pool/${m.id}`} className="text-sm font-semibold text-white hover:text-lavender transition-colors">
                        {m.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-lg font-bold font-mono ${gradeColor(m.transparencyGrade)}`}>
                        {m.transparencyGrade}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                        m.jitoClient === true ? "bg-score-good/20 text-score-good" :
                        m.jitoClient === "partial" ? "bg-score-mid/20 text-score-mid" :
                        "bg-white/5 text-beige/30"
                      }`}>
                        {m.jitoClient === true ? "Yes" : m.jitoClient === "partial" ? "Partial" : "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                        m.mevTipsToStakers ? "bg-score-good/20 text-score-good" : "bg-score-bad/20 text-score-bad"
                      }`}>
                        {m.mevTipsToStakers ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-beige/50 font-mono">
                      {m.mevCommissionCap != null ? `${m.mevCommissionCap}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-beige/40 max-w-xs truncate">
                      {m.mevPolicy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedSection>

      {/* Datacenter Concentration Risks */}
      <AnimatedSection delay={0.2} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
          Datacenter Concentration Risks
        </h2>
        {dcRisks.length === 0 ? (
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm text-center">
            <p className="text-beige/40 text-sm">No pools with &gt;30% stake in a single datacenter</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dcRisks.map((d) => (
              <div key={d.poolId} className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm hover:bg-white/[0.04] transition-colors duration-200">
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/pool/${d.poolId}`} className="text-sm font-semibold text-white hover:text-lavender transition-colors">
                    {d.poolName}
                  </Link>
                  <span className="text-xs text-beige/30 font-mono">{d.dcCount} datacenters</span>
                </div>
                <div className="space-y-1.5">
                  {d.datacenters.map((dc) => (
                    <div key={dc.datacenter} className="flex items-center gap-3">
                      <span className="text-xs text-beige/50 w-40 truncate font-mono">{dc.datacenter}</span>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            dc.percentage > 0.5 ? "bg-score-bad" :
                            dc.percentage > 0.3 ? "bg-score-mid" :
                            "bg-score-good"
                          }`}
                          style={{ width: `${(dc.percentage * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-mono w-12 text-right ${
                        dc.percentage > 0.5 ? "text-score-bad" :
                        dc.percentage > 0.3 ? "text-score-mid" :
                        "text-beige/40"
                      }`}>
                        {(dc.percentage * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedSection>

      {/* Commission Rug Detection */}
      <AnimatedSection delay={0.3} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
          Commission Rug Detection
        </h2>
        {commissionRugs.length === 0 ? (
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm text-center">
            <p className="text-beige/40 text-sm">No commission increases detected this epoch</p>
          </div>
        ) : (
          <div className="space-y-3">
            {commissionRugs.map((c) => (
              <div key={c.poolId} className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <Link href={`/pool/${c.poolId}`} className="text-sm font-semibold text-white hover:text-lavender transition-colors">
                    {c.poolName}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-beige/30 font-mono">
                      {c.changes.length} validator{c.changes.length > 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-score-bad font-mono">
                      {formatSol(c.totalAffected)} SOL affected
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  {c.changes.slice(0, 5).map((ch) => (
                    <div key={ch.validatorPubkey} className="flex items-center justify-between text-xs">
                      <span className="text-beige/60">
                        {ch.validatorName || ch.validatorPubkey.slice(0, 8)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-beige/30 font-mono">{ch.oldCommission}%</span>
                        <span className="text-beige/20">→</span>
                        <span className="text-score-bad font-mono font-semibold">{ch.newCommission}%</span>
                        <span className="text-score-bad font-mono">(+{ch.delta}%)</span>
                      </div>
                    </div>
                  ))}
                  {c.changes.length > 5 && (
                    <p className="text-[10px] text-beige/25 mt-1">
                      + {c.changes.length - 5} more
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AnimatedSection>
    </div>
  );
}
