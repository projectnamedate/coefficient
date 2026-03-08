import { HeroSection } from "@/components/ui/hero-section";
import { AnimatedSection } from "@/components/ui/animated-section";

export default function AboutPage() {
  return (
    <div>
      <HeroSection
        eyebrow="About"
        title="Why"
        accent="Coefficient"
        description="Solana has a Nakamoto Coefficient of ~20. That means just 20 validators control a third of all staked SOL. Stake pools can fix this — or make it worse."
        gradient="lavender"
      />

      <AnimatedSection className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-10 text-[15px] leading-relaxed text-beige/60">

          {/* Mission */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">The Problem</h2>
            <p>
              Solana&apos;s security depends on stake being distributed across many independent validators.
              When too much stake concentrates in a few hands, the network becomes vulnerable to censorship,
              collusion, and downtime. The{" "}
              <span className="text-lavender">Nakamoto Coefficient</span> measures this — it&apos;s the
              minimum number of validators that could collude to halt the network.
            </p>
            <p className="mt-3">
              Multi-validator stake pools are the primary mechanism for distributing stake, yet no one was
              scoring them on <em>how well</em> they actually do it. Some pools genuinely support small
              validators and geographic diversity. Others concentrate stake in the superminority or require
              validators to buy tokens for delegation.
            </p>
          </section>

          {/* What we measure */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">What We Score</h2>
            <p className="mb-4">
              Daily, Coefficient fetches on-chain delegation data for each stake pool
              and computes 7 sub-scores. These are weighted into a single{" "}
              <span className="text-lavender">Network Health Score</span> from 0-100.
            </p>

            <div className="space-y-4">
              <ScoreExplainer
                name="Small Validator Bias"
                weight={20}
                description="What percentage of the pool's stake goes to validators below the network median? Pools that actively support small validators help decentralization more than those that pile onto large ones."
              />
              <ScoreExplainer
                name="Nakamoto Impact"
                weight={20}
                description="If this pool's delegations were removed, what would happen to the Nakamoto Coefficient? Pools whose delegations improve decentralization score higher."
              />
              <ScoreExplainer
                name="MEV/Sandwich Policy"
                weight={15}
                description="How much of the pool's delegated stake goes to known sandwich attackers? Sandwich validators extract value from users through front-running. Pools should avoid delegating to them."
              />
              <ScoreExplainer
                name="Validator Set Size"
                weight={15}
                description="How many unique validators does the pool delegate to? More validators means more decentralization, with diminishing returns above ~100."
              />
              <ScoreExplainer
                name="Self-Dealing"
                weight={10}
                description="Does the pool require validators to purchase tokens, stake through specific LSTs, or participate in token flywheels to receive delegation? Pools that delegate purely on merit score highest."
              />
              <ScoreExplainer
                name="Geographic Diversity"
                weight={10}
                description="How evenly is the pool's stake distributed across countries? Measured using Shannon entropy. Pools concentrated in one country are vulnerable to jurisdiction risk."
              />
              <ScoreExplainer
                name="Commission Discipline"
                weight={10}
                description="What percentage of the pool's validators charge 10% commission or less? Pools that pick low-commission validators return more yield to stakers."
              />
            </div>
          </section>

          {/* Methodology */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Methodology</h2>
            <p>
              All on-chain data comes directly from Solana mainnet RPC. Pool delegation data is parsed
              from each pool&apos;s on-chain SPL stake pool account. Validator metadata (names, geography,
              skip rates) is enriched from the StakeWiz API. Marinade delegation data comes from their
              public API.
            </p>
            <p className="mt-3">
              Self-dealing scores are based on manual research into each pool&apos;s delegation
              requirements — whether validators must buy tokens, stake through specific LSTs, or meet
              financial prerequisites unrelated to performance.
            </p>
            <p className="mt-3">
              Final scores are normalized on a curve — the highest-scoring pool maps to ~95 and the
              lowest to ~55, ensuring meaningful differentiation across the field. Letter grades range
              from A (90+) to D (below 60).
            </p>
            <p className="mt-3">
              The sandwich validator list is curated from{" "}
              <a href="https://sandwiched.me" target="_blank" rel="noopener noreferrer" className="text-lavender hover:text-lavender-light transition-colors underline underline-offset-2">
                sandwiched.me
              </a>{" "}
              and community reports.
            </p>
          </section>

          {/* Data Sources */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Data Sources</h2>
            <p className="mb-4">
              Coefficient pulls from multiple sources to build a complete picture. All data refreshes daily.
            </p>
            <div className="space-y-3">
              <DataSource
                name="Solana RPC"
                url="https://solana.com"
                description="On-chain stake pool accounts, delegation lists, and epoch data. The ground truth for all pool scoring."
              />
              <DataSource
                name="StakeWiz API"
                url="https://stakewiz.com"
                description="Validator metadata — names, geography, datacenter, skip rates, APY, Wiz scores, and SFDP status."
              />
              <DataSource
                name="Trillium API"
                url="https://trillium.so"
                description="Per-epoch validator profitability — block rewards, MEV earnings, priority fees, vote costs, and APY breakdowns. Powers the profitability section on each validator page."
              />
              <DataSource
                name="Marinade API"
                url="https://marinade.finance"
                description="Marinade-specific delegation data and validator scores for the Marinade Native pool."
              />
              <DataSource
                name="sandwiched.me"
                url="https://sandwiched.me"
                description="Curated list of validators flagged for sandwich attacks, used in the MEV/Sandwich scoring."
              />
              <DataSource
                name="a-guard (GitHub)"
                url="https://github.com/a-guard"
                description="Additional sandwich validator data cross-referenced with community reports."
              />
            </div>
          </section>

          {/* Scope */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Scope</h2>
            <p>
              Coefficient tracks 14 multi-validator stake pools with 10+ validators. We exclude the
              170+ single-validator Sanctum wrappers (which are just thin LSTs around individual
              validators and don&apos;t make delegation decisions).
            </p>
          </section>

          {/* Built by */}
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Built by mythx</h2>
            <p>
              Coefficient is an open-source project by{" "}
              <a href="https://mythx.art" target="_blank" rel="noopener noreferrer" className="text-lavender hover:text-lavender-light transition-colors underline underline-offset-2">
                mythx
              </a>. The code is on{" "}
              <a href="https://github.com/projectnamedate/coefficient" target="_blank" rel="noopener noreferrer" className="text-lavender hover:text-lavender-light transition-colors underline underline-offset-2">
                GitHub
              </a>.
            </p>
          </section>
        </div>
      </AnimatedSection>
    </div>
  );
}

function DataSource({ name, url, description }: { name: string; url: string; description: string }) {
  return (
    <div className="flex gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="shrink-0">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-lavender hover:text-lavender-light transition-colors underline underline-offset-2"
        >
          {name}
        </a>
      </div>
      <p className="text-xs text-beige/50 leading-relaxed">{description}</p>
    </div>
  );
}

function ScoreExplainer({ name, weight, description }: { name: string; weight: number; description: string }) {
  return (
    <div className="flex gap-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <div className="shrink-0 w-12 text-center">
        <span className="text-xs font-mono text-lavender">{weight}%</span>
      </div>
      <div>
        <h3 className="text-sm font-medium text-white">{name}</h3>
        <p className="text-xs text-beige/50 mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
