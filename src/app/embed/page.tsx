import { getPoolsWithScores } from "@/db/queries";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";
import { EmbedPreview } from "@/components/embed/embed-preview";

export const dynamic = "force-dynamic";

export default async function EmbedPage() {
  const pools = await getPoolsWithScores();

  return (
    <div>
      <HeroSection
        eyebrow="Developers"
        title="Embed"
        accent="Widgets"
        description="Add a Coefficient score badge to your website. Copy the embed code below for any pool."
        gradient="info"
      />

      <AnimatedSection className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EmbedPreview pools={pools.map((p) => ({ id: p.id, name: p.name }))} />
      </AnimatedSection>
    </div>
  );
}
