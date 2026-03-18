import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPoolReportCard, getLatestScoredEpoch, getPoolDatacenterConcentration, getCommissionChanges, poolOverrides, getPoolFeeBehavior } from "@/db/queries";
import { SCORE_LABELS, SCORE_WEIGHTS, type PoolScores } from "@/lib/types";
import { computeTransparencyGrade } from "@/lib/transparency";
import { getGrade, getBarColor, getGradeColor } from "@/lib/grades";
import { ScoreRadar } from "@/components/scorecard/score-radar";
import { ScoreHistoryChart } from "@/components/scorecard/score-history-chart";
import { ScoreBadge } from "@/components/ui/score-badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { HeroSection } from "@/components/ui/hero-section";
import { formatSol, formatSolPrecise } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pool = await getPoolReportCard(id);
  if (!pool) return { title: "Pool Not Found | Coefficient" };
  return {
    title: `${pool.name} Score: ${pool.networkHealthScore} | Coefficient`,
    description: `${pool.name} (${pool.lstTicker}) decentralization health score: ${pool.networkHealthScore}/100. ${pool.validatorCount} validators, ${formatSol(pool.activeSolStaked ?? 0)} SOL staked.`,
    twitter: {
      card: "summary_large_image",
    },
  };
}


export default async function PoolReportCard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-z0-9-]+$/.test(id)) notFound();

  const [pool, datacenters, commissionChanges, feeBehavior] = await Promise.all([
    getPoolReportCard(id),
    getPoolDatacenterConcentration(id),
    getCommissionChanges(id),
    getPoolFeeBehavior(id),
  ]);

  if (!pool) notFound();

  const overrides = (poolOverrides as Record<string, any>)[id] ?? {};

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

  const activeScores = (Object.entries(SCORE_WEIGHTS) as [keyof PoolScores, number][])
    .filter(([, w]) => w > 0);

  const countries = new Set(pool.topValidators.map((v: any) => v.country).filter(Boolean));

  return (
    <div>
      <HeroSection
        eyebrow={`Epoch ${pool.epoch} Report Card`}
        title={pool.name}
        accent={`Score: ${pool.networkHealthScore}`}
        description={`${pool.lstTicker} · ${pool.validatorCount ?? 0} validators · ${formatSol(pool.activeSolStaked ?? 0)} SOL staked`}
        gradient={pool.networkHealthScore >= 70 ? "green" : "lavender"}
      />

      <AnimatedSection className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Radar + Grade */}
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider">
                Score Fingerprint
              </h2>
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-bold font-mono ${
                  pool.networkHealthScore >= 90 ? "text-score-good" :
                  pool.networkHealthScore >= 75 ? "text-score-mid" :
                  pool.networkHealthScore >= 60 ? "text-beige/60" :
                  "text-score-bad"
                }`}>
                  {getGrade(pool.networkHealthScore)}
                </span>
                <ScoreBadge score={pool.networkHealthScore} size="lg" />
              </div>
            </div>
            <ScoreRadar scores={scores} />
          </div>

          {/* Right: Sub-score breakdown */}
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
              Score Breakdown
            </h2>
            <div className="space-y-3">
              {activeScores.map(([key, weight]) => {
                const score = scores[key];
                return (
                  <div key={key} className="rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/[0.03] transition-colors duration-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-beige/60">{SCORE_LABELS[key]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-beige/25 font-mono">
                          {(weight * 100).toFixed(0)}%
                        </span>
                        <span className={`text-xs font-mono font-semibold ${
                          score >= 70 ? "text-score-good" : score >= 40 ? "text-score-mid" : "text-score-bad"
                        }`}>
                          {score}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getBarColor(score)}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Score History */}
      <AnimatedSection delay={0.1} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
            Score History
          </h2>
          <ScoreHistoryChart
            history={pool.history.map((h: any) => ({
              epochNumber: h.epochNumber,
              networkHealthScore: h.networkHealthScore,
            }))}
          />
        </div>
      </AnimatedSection>

      {/* Pool Revenue */}
      {pool.epochFeePercent != null && (
        <AnimatedSection delay={0.12} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
              Pool Revenue
              {pool.feeSource === "estimated" && (
                <span className="ml-2 text-[10px] text-score-mid font-normal normal-case">(estimated)</span>
              )}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-beige/40 uppercase tracking-wider mb-1">Epoch Fee</p>
                <p className="text-lg font-mono font-semibold text-white">
                  {((pool.epochFeePercent ?? 0) * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-beige/40 uppercase tracking-wider mb-1">This Epoch</p>
                <p className="text-lg font-mono font-semibold text-white">
                  {formatSolPrecise(pool.epochRevenueSol ?? 0)} <span className="text-xs text-beige/40">SOL</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-beige/40 uppercase tracking-wider mb-1">Cumulative</p>
                <p className="text-lg font-mono font-semibold text-white">
                  {formatSol(pool.cumulativeRevenueSol ?? 0)} <span className="text-xs text-beige/40">SOL</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-beige/40 uppercase tracking-wider mb-1">Est. Annual</p>
                <p className="text-lg font-mono font-semibold text-white">
                  {formatSol((pool.epochRevenueSol ?? 0) * 146)} <span className="text-xs text-beige/40">SOL/yr</span>
                </p>
              </div>
            </div>
            {pool.managerFeeAccount && (
              <p className="text-[10px] text-beige/20 font-mono mt-4 truncate">
                Fee account: {pool.managerFeeAccount}
              </p>
            )}
            {pool.feeHistory && pool.feeHistory.length > 1 && (
              <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] text-beige/30 uppercase tracking-wider mb-2">Revenue by Epoch</p>
                <div className="flex items-end gap-1 h-16">
                  {(() => {
                    const maxRev = Math.max(...pool.feeHistory.map((h: any) => h.epochRevenueSol ?? 0), 1);
                    return pool.feeHistory.map((h: any) => (
                      <div
                        key={h.epochNumber}
                        className="flex-1 bg-lavender/30 rounded-t hover:bg-lavender/50 transition-colors"
                        style={{ height: `${Math.max(((h.epochRevenueSol ?? 0) / maxRev) * 100, 2)}%` }}
                        title={`Epoch ${h.epochNumber}: ${formatSolPrecise(h.epochRevenueSol ?? 0)} SOL`}
                      />
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* Fee Behavior (Tier 2) */}
      {feeBehavior.summary.length > 0 && (
        <AnimatedSection delay={0.13} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="gradient-border bg-white/[0.02] rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider">
                Fee Behavior — Are They Selling?
              </h2>
              {feeBehavior.retentionRate != null && (
                <span className={`text-xs font-mono px-2 py-1 rounded-full ${
                  feeBehavior.retentionRate >= 0.8 ? "bg-score-good/20 text-score-good" :
                  feeBehavior.retentionRate >= 0.5 ? "bg-score-mid/20 text-score-mid" :
                  "bg-score-bad/20 text-score-bad"
                }`}>
                  {(feeBehavior.retentionRate * 100).toFixed(0)}% retained
                </span>
              )}
            </div>

            {/* Summary bars */}
            <div className="space-y-2 mb-4">
              {(() => {
                const typeLabels: Record<string, { label: string; color: string }> = {
                  collected: { label: "Collected", color: "bg-lavender/40" },
                  redeemed: { label: "Redeemed", color: "bg-score-mid" },
                  swapped: { label: "Swapped on DEX", color: "bg-orange-400" },
                  transferred: { label: "Sent to Exchange", color: "bg-score-bad" },
                  unknown: { label: "Other", color: "bg-white/10" },
                };
                const totalEvents = feeBehavior.summary.reduce((s, e) => s + e.count, 0);
                return feeBehavior.summary
                  .filter((e) => e.count > 0)
                  .sort((a, b) => b.count - a.count)
                  .map((e) => {
                    const info = typeLabels[e.eventType] ?? { label: e.eventType, color: "bg-white/10" };
                    const pct = totalEvents > 0 ? (e.count / totalEvents) * 100 : 0;
                    return (
                      <div key={e.eventType} className="flex items-center gap-3">
                        <span className="text-xs text-beige/50 w-32 shrink-0">{info.label}</span>
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${info.color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                        </div>
                        <span className="text-xs font-mono text-beige/40 w-12 text-right">{e.count}</span>
                        {e.totalSol > 0 && (
                          <span className="text-[10px] font-mono text-beige/25 w-20 text-right">{formatSolPrecise(e.totalSol)} SOL</span>
                        )}
                      </div>
                    );
                  });
              })()}
            </div>

            {/* Recent events */}
            {feeBehavior.recentEvents.length > 0 && (
              <div className="border-t border-white/5 pt-3">
                <p className="text-[10px] text-beige/30 uppercase tracking-wider mb-2">Recent Activity</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {feeBehavior.recentEvents.slice(0, 10).map((e) => (
                    <div key={e.id} className="flex items-center justify-between text-xs">
                      <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                        e.eventType === "swapped" ? "bg-orange-400/20 text-orange-300" :
                        e.eventType === "transferred" ? "bg-score-bad/20 text-score-bad" :
                        e.eventType === "redeemed" ? "bg-score-mid/20 text-score-mid" :
                        e.eventType === "collected" ? "bg-lavender/20 text-lavender" :
                        "bg-white/5 text-beige/30"
                      }`}>
                        {e.eventType}
                      </span>
                      {e.amountSol != null && (
                        <span className="text-beige/40 font-mono">{formatSolPrecise(e.amountSol)} SOL</span>
                      )}
                      {e.destinationLabel && (
                        <span className="text-score-bad text-[10px]">{e.destinationLabel}</span>
                      )}
                      {e.txSignature && (
                        <a
                          href={`https://solscan.io/tx/${e.txSignature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-beige/20 font-mono hover:text-lavender transition-colors"
                        >
                          {e.txSignature.slice(0, 8)}...
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current balance */}
            {feeBehavior.currentBalance && (
              <div className="border-t border-white/5 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-beige/30 uppercase">Current Fee Account Balance</span>
                  <span className="text-sm font-mono text-white">
                    {formatSolPrecise(feeBehavior.currentBalance.tokenBalance ?? 0)} <span className="text-beige/30 text-xs">tokens</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>
      )}

      {/* MEV & Transparency */}
      <AnimatedSection delay={0.15} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MEV Policy */}
          <div className="gradient-border bg-white/[0.02] rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-3">
              MEV Redistribution
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-beige/40">Jito Client</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${
                  overrides.jitoClient === true ? "bg-score-good/20 text-score-good" :
                  overrides.jitoClient === "partial" ? "bg-score-mid/20 text-score-mid" :
                  "bg-white/5 text-beige/30"
                }`}>
                  {overrides.jitoClient === true ? "Required" : overrides.jitoClient === "partial" ? "Partial" : "Unknown"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-beige/40">Tips to Stakers</span>
                <span className={`text-xs font-mono ${overrides.mevTipsToStakers ? "text-score-good" : "text-score-bad"}`}>
                  {overrides.mevTipsToStakers ? "Yes" : "No"}
                </span>
              </div>
              {overrides.mevCommissionCap != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-beige/40">MEV Commission Cap</span>
                  <span className="text-xs text-beige/60 font-mono">{overrides.mevCommissionCap}%</span>
                </div>
              )}
            </div>
            {overrides.mevPolicy && (
              <p className="text-[11px] text-beige/30 mt-3 leading-relaxed">{overrides.mevPolicy}</p>
            )}
          </div>

          {/* Transparency Grade (computed) */}
          {(() => {
            const { grade, score } = computeTransparencyGrade(
              {
                selfDealingScore: overrides.selfDealingScore ?? 50,
                mevTipsToStakers: overrides.mevTipsToStakers ?? false,
                jitoClient: overrides.jitoClient ?? "unknown",
                mevCommissionCap: overrides.mevCommissionCap ?? null,
              },
              pool.validatorCount ?? 0
            );
            return (
              <div className="gradient-border bg-white/[0.02] rounded-xl p-5 backdrop-blur-sm">
                <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-3">
                  Delegation Transparency
                </h2>
                <div className="flex items-center gap-4">
                  <span className={`text-4xl font-bold font-mono ${getGradeColor(grade)}`}>
                    {grade}
                  </span>
                  <div className="flex-1">
                    <p className="text-xs text-beige/40 leading-relaxed">
                      {overrides.transparencyNotes ?? "No transparency data available"}
                    </p>
                    <p className="text-[10px] text-beige/25 mt-1 font-mono">
                      Score: {score}/100 — based on self-dealing, MEV policy, and governance breadth
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </AnimatedSection>

      {/* Datacenter Concentration */}
      {datacenters.length > 0 && (
        <AnimatedSection delay={0.2} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="gradient-border bg-white/[0.02] rounded-xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-3">
              Datacenter Concentration · {datacenters.length} providers
            </h2>
            <div className="space-y-2">
              {datacenters.slice(0, 8).map((dc) => (
                <div key={dc.datacenter} className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xs text-beige/50 w-28 sm:w-44 truncate font-mono shrink-0">{dc.datacenter}</span>
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        dc.percentage > 0.5 ? "bg-score-bad" :
                        dc.percentage > 0.3 ? "bg-score-mid" :
                        "bg-score-good"
                      }`}
                      style={{ width: `${Math.max(dc.percentage * 100, 2)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-16 text-right ${
                    dc.percentage > 0.5 ? "text-score-bad" :
                    dc.percentage > 0.3 ? "text-score-mid" :
                    "text-beige/40"
                  }`}>
                    {(dc.percentage * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-beige/25 font-mono w-12 text-right">
                    {dc.validatorCount} val{dc.validatorCount !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Commission Rug Detection */}
      {commissionChanges.length > 0 && (
        <AnimatedSection delay={0.25} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="gradient-border bg-white/[0.02] rounded-xl p-5 backdrop-blur-sm border-l-2 border-l-score-bad">
            <h2 className="text-sm font-medium text-score-bad uppercase tracking-wider mb-3">
              Commission Increases Detected
            </h2>
            <div className="space-y-2">
              {commissionChanges.map((ch) => (
                <div key={ch.validatorPubkey} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white">
                      {ch.validatorName || ch.validatorPubkey.slice(0, 8)}
                    </span>
                    <span className="text-[10px] text-beige/25 font-mono">
                      {formatSol(ch.delegatedSol)} SOL
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-beige/30 font-mono">{ch.oldCommission}%</span>
                    <span className="text-xs text-beige/20">→</span>
                    <span className="text-xs text-score-bad font-mono font-semibold">{ch.newCommission}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      )}

      {/* Top Validators */}
      <AnimatedSection delay={0.3} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider">
              Top Validators · {countries.size} countries
            </h2>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Validator</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Delegated</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Country</th>
              </tr>
            </thead>
            <tbody>
              {pool.topValidators.map((v: any, i: number) => (
                <tr key={v.validatorPubkey} className={`border-b border-white/5 hover:bg-lavender/[0.04] transition-colors duration-200 ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}>
                  <td className="px-4 py-3 text-sm text-beige/25 font-mono">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div>
                      <Link href={`/validator/${v.validatorPubkey}`} className="text-sm font-semibold text-white hover:text-lavender transition-colors">
                        {v.validatorName || v.validatorPubkey.slice(0, 8)}
                      </Link>
                      <Link href={`/validator/${v.validatorPubkey}`} className="text-[10px] text-beige/30 font-mono ml-2 hover:text-lavender/50 transition-colors">
                        {v.validatorPubkey.slice(0, 4)}...{v.validatorPubkey.slice(-4)}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-beige/60 font-mono">
                    {formatSol(v.delegatedSol)}
                  </td>
                  <td className="px-4 py-3 text-xs text-beige/50">
                    {v.country ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Share CTA */}
        <div className="mt-6 text-center">
          <p className="text-xs text-beige/30 font-mono">
            Share this report card: coefficient.mythx.art/pool/{pool.id}
          </p>
        </div>
      </AnimatedSection>
    </div>
  );
}
