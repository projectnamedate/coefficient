import { StatCard } from "@/components/ui/stat-card";
import { PoolTable } from "@/components/scorecard/pool-table";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";
import { getPoolsWithScores, getLatestScoredEpoch, getEpochInfo } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function ScorecardPage() {
  const pools = await getPoolsWithScores();
  const latestEpoch = await getLatestScoredEpoch();
  const epochInfo = latestEpoch ? await getEpochInfo(latestEpoch) : null;

  const totalStake = pools.reduce((sum, p) => sum + p.activeSolStaked, 0);
  const avgScore = pools.length
    ? Math.round(pools.reduce((sum, p) => sum + p.networkHealthScore, 0) / pools.length)
    : 0;

  return (
    <div>
      <HeroSection
        eyebrow="Nakamoto Coefficient Tracker"
        title="Stake Pool"
        accent="Scorecard"
        description="Which multi-validator stake pools are helping Solana decentralize? Which ones concentrate power? Click any pool to see its full score breakdown."
        gradient="lavender"
      />

      {/* Stats */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
          <StatCard label="Pools Tracked" value={pools.length.toString()} subtext="Multi-validator only" index={0} />
          <StatCard label="Total Pool Stake" value={`${(totalStake / 1_000_000).toFixed(1)}M`} subtext="SOL across all pools" index={1} />
          <StatCard label="Epoch" value={latestEpoch?.toString() ?? "—"} subtext={epochInfo ? `Nakamoto: ${epochInfo.nakamotoCoefficient}` : "Loading..."} index={2} />
          <StatCard label="Avg Health Score" value={avgScore.toString()} subtext={avgScore >= 70 ? "Network healthy" : avgScore >= 40 ? "Room to improve" : "Needs attention"} index={3} />
        </div>
      </AnimatedSection>

      {/* Table */}
      <AnimatedSection delay={0.2} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
          <PoolTable pools={pools} />
        </div>

        <p className="text-xs text-beige/20 mt-4 text-center font-mono">
          Scores update every epoch &middot; {pools.length} pools scored
        </p>
      </AnimatedSection>
    </div>
  );
}
