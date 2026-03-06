import { getValidatorLeaderboard, getLatestScoredEpoch } from "@/db/queries";
import { ValidatorTable } from "@/components/validators/validator-table";
import { StatCard } from "@/components/ui/stat-card";

export const dynamic = "force-dynamic";

export default async function ValidatorsPage() {
  const validators = await getValidatorLeaderboard();
  const epoch = await getLatestScoredEpoch();

  const sandwichCount = validators.filter((v) => v.isSandwich).length;
  const smallCount = validators.filter((v) => v.stakeTier === "small").length;
  const sfdpCount = validators.filter((v) => v.sfdpStatus === "active").length;
  const countries = new Set(validators.map((v) => v.country).filter(Boolean));

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-info/[0.06] via-transparent to-lavender/[0.04]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-xs font-mono text-lavender/60 uppercase tracking-[0.2em] mb-3">
            Epoch {epoch ?? "—"}
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Validator<br />
            <span className="text-lavender">Leaderboard</span>
          </h1>
          <p className="text-beige/40 mt-4 max-w-lg leading-relaxed">
            Ranked by their contribution to network health. See which pools
            delegate to each validator and identify sandwich attackers.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
          <StatCard
            label="Validators Tracked"
            value={validators.length.toString()}
            subtext="In pool delegations"
          />
          <StatCard
            label="Small Validators"
            value={smallCount.toString()}
            subtext={`${validators.length ? ((smallCount / validators.length) * 100).toFixed(0) : 0}% of tracked set`}
          />
          <StatCard
            label="SFDP Active"
            value={sfdpCount.toString()}
            subtext="Foundation delegation"
          />
          <StatCard
            label="Sandwich Flagged"
            value={sandwichCount.toString()}
            subtext={sandwichCount === 0 ? "Network clean" : `${sandwichCount} known attacker${sandwichCount > 1 ? "s" : ""}`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden backdrop-blur-sm">
          <ValidatorTable validators={validators} />
        </div>

        <p className="text-xs text-beige/25 mt-4 text-center font-mono">
          {countries.size} countries represented &middot; Data from epoch {epoch ?? "—"}
        </p>
      </div>
    </div>
  );
}
