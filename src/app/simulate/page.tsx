import { getPoolsWithScores, getLatestScoredEpoch, getEpochInfo, getSimulatorData } from "@/db/queries";
import { WhatIfSimulator } from "@/components/scorecard/what-if-simulator";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";

export const dynamic = "force-dynamic";

export default async function SimulatePage() {
  const [pools, epoch] = await Promise.all([
    getPoolsWithScores(),
    getLatestScoredEpoch(),
  ]);

  const [epochInfo, simData] = await Promise.all([
    epoch ? getEpochInfo(epoch) : null,
    getSimulatorData(epoch ?? undefined),
  ]);

  const nakamoto = epochInfo?.nakamotoCoefficient ?? 20;

  return (
    <div>
      <HeroSection
        eyebrow={`Epoch ${epoch ?? "—"}`}
        title="What-If"
        accent="Simulator"
        description="How would Solana's decentralization change if pools grew or shrank? Adjust stake multipliers to see the projected impact on the Nakamoto Coefficient."
        gradient="green"
      />

      <AnimatedSection className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WhatIfSimulator
          pools={pools.map((p) => ({
            id: p.id,
            name: p.name,
            activeSolStaked: p.activeSolStaked,
            validatorCount: p.validatorCount,
            networkHealthScore: p.networkHealthScore,
          }))}
          currentNakamoto={nakamoto}
          validatorStakes={simData.validatorStakes}
          delegations={simData.delegations}
        />
      </AnimatedSection>
    </div>
  );
}
