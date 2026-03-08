import { getCrossPoolOverlap, getLatestScoredEpoch } from "@/db/queries";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";

export const dynamic = "force-dynamic";

function formatSol(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

export default async function OverlapPage() {
  const [overlap, epoch] = await Promise.all([
    getCrossPoolOverlap(),
    getLatestScoredEpoch(),
  ]);

  const maxPools = Math.max(...overlap.map((v) => v.pools.length), 0);
  const totalOverlapValidators = overlap.length;
  const in3Plus = overlap.filter((v) => v.pools.length >= 3).length;
  const in5Plus = overlap.filter((v) => v.pools.length >= 5).length;

  return (
    <div>
      <HeroSection
        eyebrow={`Epoch ${epoch ?? "—"}`}
        title="Stake Pool"
        accent="Reach"
        description="Which validators are earning trust across the ecosystem? See who's receiving delegations from the most stake pools — a signal of broad confidence in their performance."
        gradient="lavender"
      />

      {/* Stats */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
          <div className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm">
            <p className="text-xs text-beige/40 uppercase tracking-wider">Validators in 2+ Pools</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{totalOverlapValidators}</p>
          </div>
          <div className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm">
            <p className="text-xs text-beige/40 uppercase tracking-wider">In 3+ Pools</p>
            <p className="text-2xl font-bold text-lavender mt-1 font-mono">{in3Plus}</p>
          </div>
          <div className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm">
            <p className="text-xs text-beige/40 uppercase tracking-wider">In 5+ Pools</p>
            <p className="text-2xl font-bold text-info mt-1 font-mono">{in5Plus}</p>
          </div>
          <div className="gradient-border bg-white/[0.02] rounded-xl p-4 backdrop-blur-sm">
            <p className="text-xs text-beige/40 uppercase tracking-wider">Most Pools Reached</p>
            <p className="text-2xl font-bold text-lavender mt-1 font-mono">{maxPools} pools</p>
          </div>
        </div>
      </AnimatedSection>

      {/* Table */}
      <AnimatedSection delay={0.2} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-deep z-10">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Validator</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Pools</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Pool Memberships</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-beige/50 uppercase tracking-wider">Total Delegated</th>
                </tr>
              </thead>
              <tbody>
                {overlap.map((v, i) => (
                  <tr key={v.pubkey} className="border-b border-white/5 hover:bg-lavender/[0.04]">
                    <td className="px-4 py-3 text-sm text-beige/25 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-sm font-semibold text-white">{v.name}</span>
                        <span className="text-[10px] text-beige/30 font-mono ml-2">
                          {v.pubkey.slice(0, 4)}...{v.pubkey.slice(-4)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-mono font-bold ${
                        v.pools.length >= 5 ? "text-info" :
                        v.pools.length >= 3 ? "text-lavender" :
                        "text-beige/60"
                      }`}>
                        {v.pools.length}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {v.pools.map((p) => (
                          <span
                            key={p.poolId}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-lavender/10 text-lavender/70 font-mono"
                          >
                            {p.poolName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-beige/60 font-mono">
                      {formatSol(v.totalSol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-beige/20 mt-4 text-center font-mono">
          {totalOverlapValidators} validators receiving stake from multiple pools · Epoch {epoch ?? "—"}
        </p>
      </AnimatedSection>
    </div>
  );
}
