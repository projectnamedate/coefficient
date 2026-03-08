import { notFound } from "next/navigation";
import { getPoolReportCard, getLatestScoredEpoch } from "@/db/queries";
import { SCORE_LABELS, SCORE_WEIGHTS, type PoolScores } from "@/lib/types";
import { ScoreRadar } from "@/components/scorecard/score-radar";
import { ScoreHistoryChart } from "@/components/scorecard/score-history-chart";
import { ScoreBadge } from "@/components/ui/score-badge";
import { AnimatedSection } from "@/components/ui/animated-section";
import { HeroSection } from "@/components/ui/hero-section";

export const dynamic = "force-dynamic";

function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

function getGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "A-";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 30) return "D";
  return "F";
}

function getBarColor(s: number): string {
  if (s >= 70) return "bg-score-good";
  if (s >= 40) return "bg-score-mid";
  return "bg-score-bad";
}

export default async function PoolReportCard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pool = await getPoolReportCard(id);

  if (!pool) notFound();

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
                <span className="text-3xl font-bold text-lavender font-mono">
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
                  <div key={key}>
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
      <AnimatedSection delay={0.1} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
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

      {/* Top Validators */}
      <AnimatedSection delay={0.2} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider">
              Top Validators · {countries.size} countries
            </h2>
          </div>
          <table className="w-full">
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
                <tr key={v.validatorPubkey} className="border-b border-white/5 hover:bg-lavender/[0.04]">
                  <td className="px-4 py-3 text-sm text-beige/25 font-mono">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm font-semibold text-white">
                        {v.validatorName ?? v.validatorPubkey.slice(0, 8)}
                      </span>
                      <span className="text-[10px] text-beige/30 font-mono ml-2">
                        {v.validatorPubkey.slice(0, 4)}...{v.validatorPubkey.slice(-4)}
                      </span>
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
