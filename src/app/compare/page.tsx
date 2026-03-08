import { getPoolsWithScores, getLatestScoredEpoch } from "@/db/queries";
import { CompareView } from "@/components/scorecard/compare-view";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";

export const dynamic = "force-dynamic";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ pools?: string }>;
}) {
  const [pools, epoch, params] = await Promise.all([
    getPoolsWithScores(),
    getLatestScoredEpoch(),
    searchParams,
  ]);

  const initialSelected = params.pools
    ? params.pools.split(",").filter(Boolean)
    : [];

  return (
    <div>
      <HeroSection
        eyebrow={`Epoch ${epoch ?? "—"}`}
        title="Pool"
        accent="Compare"
        description="Side-by-side comparison of stake pool health scores. Select 2-3 pools to compare their decentralization metrics."
        gradient="info"
      />

      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CompareView pools={pools} initialSelected={initialSelected} />
      </AnimatedSection>
    </div>
  );
}
