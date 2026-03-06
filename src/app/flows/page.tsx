import { getDelegationFlows, getLatestScoredEpoch } from "@/db/queries";
import { SankeyDiagram } from "@/components/flows/sankey-diagram";
import { StatCard } from "@/components/ui/stat-card";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";

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
      <HeroSection
        eyebrow={`Epoch ${epoch ?? "—"}`}
        title="Stake"
        accent="Flows"
        description="Visualize how SOL flows from stake pools to validators. See which pools feed the superminority vs. support the tail. Hover nodes to highlight connections."
        gradient="green"
      />

      {/* Stats */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
          <StatCard label="Active Pools" value={flowData.pools.length.toString()} subtext="Delegating this epoch" index={0} />
          <StatCard label="Validators" value={flowData.validators.length.toString()} subtext="Receiving delegation" index={1} />
          <StatCard label="Delegation Links" value={flowData.flows.length.toString()} subtext="Pool → validator pairs" index={2} />
          <StatCard label="Avg Delegation" value={`${(avgDelegation / 1_000).toFixed(0)}K`} subtext="SOL per link" index={3} />
        </div>
      </AnimatedSection>

      {/* Sankey */}
      <AnimatedSection delay={0.2} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm p-4">
          <SankeyDiagram data={flowData} />
        </div>

        <p className="text-xs text-beige/20 mt-4 text-center font-mono">
          Line thickness = delegation size &middot; Hover to highlight connections
        </p>
      </AnimatedSection>
    </div>
  );
}
