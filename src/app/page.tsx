import { StatCard } from "@/components/ui/stat-card";
import { PoolTable } from "@/components/scorecard/pool-table";
import { getPoolsWithScores, getLatestScoredEpoch, getEpochInfo } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function ScorecardPage() {
  const pools = await getPoolsWithScores();
  const latestEpoch = await getLatestScoredEpoch();
  const epochInfo = latestEpoch ? await getEpochInfo(latestEpoch) : null;

  const totalStake = pools.reduce((sum, p) => sum + p.activeSolStaked, 0);
  const totalValidators = new Set(pools.flatMap(() => [])).size; // will be real when we have delegations
  const avgScore = pools.length
    ? Math.round(pools.reduce((sum, p) => sum + p.networkHealthScore, 0) / pools.length)
    : 0;

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-lavender/[0.07] via-transparent to-info/[0.04]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-lavender/[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-xs font-mono text-lavender/60 uppercase tracking-[0.2em] mb-3">
            Nakamoto Coefficient Tracker
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Stake Pool<br />
            <span className="text-lavender">Scorecard</span>
          </h1>
          <p className="text-beige/40 mt-4 max-w-lg leading-relaxed">
            Which multi-validator stake pools are helping Solana decentralize?
            Which ones concentrate power? Click any pool to see its full
            score breakdown.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
          <StatCard
            label="Pools Tracked"
            value={pools.length.toString()}
            subtext="Multi-validator only"
          />
          <StatCard
            label="Total Pool Stake"
            value={`${(totalStake / 1_000_000).toFixed(1)}M`}
            subtext="SOL across all pools"
          />
          <StatCard
            label="Epoch"
            value={latestEpoch?.toString() ?? "—"}
            subtext={epochInfo ? `Nakamoto: ${epochInfo.nakamotoCoefficient}` : "Loading..."}
          />
          <StatCard
            label="Avg Health Score"
            value={avgScore.toString()}
            subtext={avgScore >= 70 ? "Network healthy" : avgScore >= 40 ? "Room to improve" : "Needs attention"}
          />
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden backdrop-blur-sm">
          <PoolTable pools={pools} />
        </div>

        <p className="text-xs text-beige/25 mt-4 text-center font-mono">
          Scores are illustrative (mock data) &middot; Live scoring coming with epoch indexer
        </p>
      </div>
    </div>
  );
}
