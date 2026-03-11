import {
  getScoreDeltas,
  getLatestScoredEpoch,
  getPoolsWithScores,
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
        description="Score changes, MEV redistribution policies, datacenter concentration risks, and delegation transparency grades."
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
                    <td className="px-4 py-3 text-xs text-beige/40 max-w-xs">
                      <div className="max-h-20 overflow-y-auto leading-relaxed">
                        {m.mevPolicy}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedSection>

      {/* Delegation Red Flags */}
      <AnimatedSection delay={0.15} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
          Delegation Red Flags
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/pool/marinade" className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm hover:bg-lavender/[0.04] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono">Exploit</span>
              <span className="text-sm font-semibold text-white">Marinade</span>
            </div>
            <p className="text-xs text-beige/50 leading-relaxed">
              37,000 SOL (~$5M) siphoned over 126 epochs by 85+ validators gaming the SAM auction. Validators bid high to win stake, then dropped bids to dust while a bug kept them delegated.
            </p>
          </Link>

          <Link href="/pool/blazestake" className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm hover:bg-lavender/[0.04] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono">Flywheel</span>
              <span className="text-sm font-semibold text-white">BlazeStake</span>
            </div>
            <p className="text-xs text-beige/50 leading-relaxed">
              BLZE gauge system controls 10% of delegation. Validators can purchase votes via the Votex marketplace to direct stake to themselves with positive ROI — a partial token flywheel.
            </p>
          </Link>

          <Link href="/pool/doublezero" className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm hover:bg-lavender/[0.04] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-score-good/20 text-score-good font-mono">Resolved</span>
              <span className="text-sm font-semibold text-white">DoubleZero</span>
            </div>
            <p className="text-xs text-beige/50 leading-relaxed">
              Previously charged a 5% fee on block rewards. As of epoch 939, fees are removed and validators now earn 1-7% of stakeweight for contributing to multicast. Geographic decentralization bonus included.
            </p>
          </Link>

          <Link href="/pool/stke" className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm hover:bg-lavender/[0.04] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono">Conflict</span>
              <span className="text-sm font-semibold text-white">STKE</span>
            </div>
            <p className="text-xs text-beige/50 leading-relaxed">
              SOL Strategies (NASDAQ: STKE) owns both StakeWiz — the scoring platform that determines delegation — and 4 major validators (Laine, Cogent, Orangefin) that benefit from it.
            </p>
          </Link>

          <Link href="/pool/vault" className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm hover:bg-lavender/[0.04] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono">Flywheel</span>
              <span className="text-sm font-semibold text-white">Vault</span>
            </div>
            <p className="text-xs text-beige/50 leading-relaxed">
              25% SaaS fee on yield. Kamino offers up to 7.5x leverage on vSOL, and USDC bribes on governance gauges direct stake — a full token flywheel where delegation is purchasable.
            </p>
          </Link>

          <Link href="/pool/edgevana" className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm hover:bg-lavender/[0.04] transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-mono">Closed Ecosystem</span>
              <span className="text-sm font-semibold text-white">Edgevana</span>
            </div>
            <p className="text-xs text-beige/50 leading-relaxed">
              Validators must use Edgevana bare-metal hosting to receive delegation. Edgevana profits from both hosting fees and pool management — a direct infrastructure revenue flywheel.
            </p>
          </Link>
        </div>
      </AnimatedSection>

      {/* Commission Rug Detection */}
      <AnimatedSection delay={0.2} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
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
