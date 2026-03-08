import { getValidatorLeaderboard, getLatestScoredEpoch, getCountryDistribution } from "@/db/queries";
import { ValidatorTable } from "@/components/validators/validator-table";
import { GeoHeatmap } from "@/components/validators/geo-heatmap";
import { StatCard } from "@/components/ui/stat-card";
import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";

export const dynamic = "force-dynamic";

export default async function ValidatorsPage() {
  const [validators, epoch, countryData] = await Promise.all([
    getValidatorLeaderboard(),
    getLatestScoredEpoch(),
    getCountryDistribution(),
  ]);

  const sandwichCount = validators.filter((v) => v.isSandwich).length;
  const smallCount = validators.filter((v) => v.stakeTier === "small").length;
  const sfdpCount = validators.filter((v) => v.sfdpStatus === "active").length;
  const countries = new Set(validators.map((v) => v.country).filter(Boolean));

  return (
    <div>
      <HeroSection
        eyebrow={`Epoch ${epoch ?? "—"}`}
        title="Validator"
        accent="Leaderboard"
        description="Ranked by their contribution to network health. See which pools delegate to each validator and identify sandwich attackers."
        gradient="info"
      />

      {/* Stats */}
      <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
          <StatCard label="Validators Tracked" value={validators.length.toString()} subtext="In pool delegations" index={0} />
          <StatCard label="Small Validators" value={smallCount.toString()} subtext={`${validators.length ? ((smallCount / validators.length) * 100).toFixed(0) : 0}% of tracked set`} index={1} />
          <StatCard label="SFDP Active" value={sfdpCount.toString()} subtext="Foundation delegation" index={2} />
          <StatCard label="Sandwich Flagged" value={sandwichCount.toString()} subtext={sandwichCount === 0 ? "Network clean" : `${sandwichCount} known attacker${sandwichCount > 1 ? "s" : ""}`} index={3} />
        </div>
      </AnimatedSection>

      {/* Geographic Heatmap */}
      <AnimatedSection delay={0.15} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm p-4 sm:p-6">
          <h2 className="text-sm font-medium text-beige/50 uppercase tracking-wider mb-4">
            Validator Geography
          </h2>
          <GeoHeatmap data={countryData} />
        </div>
      </AnimatedSection>

      {/* Table */}
      <AnimatedSection delay={0.2} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 mt-6">
        <div className="gradient-border bg-white/[0.02] rounded-xl overflow-hidden backdrop-blur-sm">
          <ValidatorTable validators={validators} />
        </div>

        <p className="text-xs text-beige/20 mt-4 text-center font-mono">
          {countries.size} countries represented &middot; Data from epoch {epoch ?? "—"}
        </p>
      </AnimatedSection>
    </div>
  );
}
