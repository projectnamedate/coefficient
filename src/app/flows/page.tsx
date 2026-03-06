import { getDelegationFlows, getLatestScoredEpoch } from "@/db/queries";
import { SankeyDiagram } from "@/components/flows/sankey-diagram";
import { StatCard } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";

export default async function FlowsPage() {
  const flowData = await getDelegationFlows();
  const epoch = await getLatestScoredEpoch();

  const totalFlowSol = flowData.flows.reduce((sum, f) => sum + f.value, 0);
  const avgDelegation = flowData.flows.length
    ? totalFlowSol / flowData.flows.length
    : 0;

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-score-good/[0.04] via-transparent to-lavender/[0.05]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-xs font-mono text-lavender/60 uppercase tracking-[0.2em] mb-3">
            Epoch {epoch ?? "—"}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Stake<br />
            <span className="text-lavender">Flows</span>
          </h1>
          <p className="text-beige/40 mt-4 max-w-lg leading-relaxed">
            Visualize how SOL flows from stake pools to validators. See which pools
            feed the superminority vs. support the tail. Hover nodes to highlight
            connections.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
          <StatCard
            label="Active Pools"
            value={flowData.pools.length.toString()}
            subtext="Delegating this epoch"
          />
          <StatCard
            label="Validators"
            value={flowData.validators.length.toString()}
            subtext="Receiving delegation"
          />
          <StatCard
            label="Delegation Links"
            value={flowData.flows.length.toString()}
            subtext="Pool → validator pairs"
          />
          <StatCard
            label="Avg Delegation"
            value={`${(avgDelegation / 1_000).toFixed(0)}K`}
            subtext="SOL per link"
          />
        </div>
      </div>

      {/* Sankey */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden backdrop-blur-sm p-4">
          <SankeyDiagram data={flowData} />
        </div>

        <p className="text-xs text-beige/25 mt-4 text-center font-mono">
          Line thickness = delegation size &middot; Hover to highlight connections
        </p>
      </div>
    </div>
  );
}
