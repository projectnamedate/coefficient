# Coefficient - Solana Stake Pool Health Dashboard

## Mission

**Make it obvious which stake pools are helping the Solana network decentralize vs. which ones are extracting value or concentrating power.**

Most existing dashboards are validator-centric. This dashboard is **pool-centric** - it answers: "Where is each pool's SOL going, and is that good or bad for the network?"

---

## The Problem

Stake pools control ~63.8M+ SOL across ~597 validators (~15% of all staked SOL). They are the kingmakers of the Solana validator ecosystem. But they operate with wildly different philosophies:

- **Good pools** (e.g., Phase Delegation, BlazeStake, StarPool) prioritize giving stake to smaller, underrepresented validators in diverse geographies
- **Extractive pools** (e.g., Vault) use token flywheels to attract SOL, then pit validators against each other to compete for delegation - optimizing for pool revenue rather than network health. Vault specifically requires validators to: maintain 0/0 commission to qualify for the performance pool, hold $V tokens or incentivize votes on Votex.so, and direct stake through vSOL/Kamino. The top 100 validators who delegate the most SOL back through Vault's own vSOL mechanism share 40% of undirected stake equally - effectively requiring validators to buy into the system to receive delegation, creating a circular flywheel where validator demand for vSOL drives TVL which drives more delegation power.
- **Negligent pools** delegate to validators running sandwich attacks (e.g., Marinade sending ~20% of DeezNode's stake despite DeezNode extracting ~$13.4M/month from users)

No single dashboard makes these dynamics visible and comparable.

---

## Target Audience

1. **SOL holders** deciding which pool to stake with (primary)
2. **Validator operators** understanding how pools evaluate them and where to seek delegation
3. **Ecosystem researchers** analyzing systemic risks in stake distribution

---

## Three Core Views

### View 1: Stake Pool Scorecard

The headline view. Every stake pool gets a composite **"Network Health Score"** (0-100) broken down into sub-scores:

#### Sub-scores

| Metric | What It Measures | How It's Computed |
|--------|-----------------|-------------------|
| **Small Validator Bias** (weight: 20%) | Does the pool delegate to validators that need stake, or pile onto already-large ones? | Ratio of stake going to validators below median stake vs. above. Bonus for stake to validators outside the superminority. Penalty for stake going to top-20 validators. |
| **Self-Dealing Score** (weight: 10%) | Does the pool require validators to buy pool tokens/LSTs to receive delegation? | Flags pools where validators must purchase pool products ($V tokens, vSOL, governance tokens) or stake back through the pool's own LST to qualify for delegation. Binary + severity: no requirement = 100, optional incentive = 60, required = 0. |
| **MEV/Sandwich Policy** (weight: 15%) | Does the pool blacklist sandwich validators? | Binary: does the pool have an active blacklist? Plus: % of pool's delegated stake going to known sandwich validators (from Sandwiched.me + Pine Stake data). 0% = perfect score. |
| **Nakamoto Coefficient Impact** (weight: 20%) | Would removing this pool's delegation improve or worsen the Nakamoto coefficient? | Simulate removal of pool's stake from all its validators. If Nakamoto coefficient drops, pool is net-positive. If it stays the same or rises, pool is concentrating stake. |
| **Validator Set Size** (weight: 15%) | How many validators does the pool support? | Normalized count. More validators = better, with diminishing returns above ~100. |
| **Geographic Diversity** (weight: 10%) | Does the pool spread stake across regions and data centers? | Shannon entropy of delegated validators' geographic distribution (country + data center). Higher entropy = better score. |
| **Commission Discipline** (weight: 10%) | Does the pool enforce reasonable commission? | % of delegated validators at or below 10% commission. Deduct for validators with no commission cap. |
| **Transparency** (weight: 0%) | Are criteria, blacklists, and APIs public? | Qualitative checklist: published delegation criteria, public API, open blacklist, governance process. Shown on pool detail pages but not weighted into composite score. |

#### Scorecard UI

- **Summary row** per pool: Logo, name, LST ticker, total SOL, validator count, APY, Network Health Score (color-coded: green >70, yellow 40-70, red <40)
- **Expandable detail panel**: Breakdown of all sub-scores with visual bars
- **Comparison mode**: Select 2-3 pools side-by-side to compare sub-scores
- **Sort/filter**: By any column, filter by score range
- **Trend arrows**: Show score direction over last 5 epochs

### View 2: Stake Flow Network Map

An interactive visualization showing how SOL flows from pools to validators.

#### Primary Visualization: Sankey / Flow Diagram

- **Left side**: Stake pools (sized by total SOL)
- **Right side**: Validators (sized by total active stake)
- **Flows**: Lines from pools to validators, thickness = delegation size
- **Color coding on validators**:
  - Green = small validator (below median stake)
  - Yellow = mid-range
  - Red = superminority / top-20
  - Black skull icon = known sandwich validator
- **Hover**: Show exact SOL amount, % of pool, % of validator's total stake
- **Filter**: Show flows for a single pool, filter by validator size tier

#### Secondary Visualization: Geographic Heatmap

- World map showing validator locations
- Overlay: which pools delegate to which regions
- Color intensity = stake concentration
- Toggle by pool to see each pool's geographic footprint
- Data center clustering warnings (when >X% of a pool's validators are in one facility)

#### Epoch-over-Epoch Animation

- Play button to show stake movement across epochs
- Highlight stake additions (green arrows) and removals (red arrows)
- See which pools are actively redistributing vs. static

### View 3: Validator Leaderboard

Rank validators by their contribution to network health, with pool affiliation context.

#### Columns

| Column | Description |
|--------|-------------|
| **Rank** | Overall network health contribution rank |
| **Validator** | Name + identity pubkey |
| **Active Stake** | Total SOL delegated |
| **Stake Tier** | Small / Medium / Large / Superminority |
| **Pool Memberships** | Badges for which pools delegate to this validator |
| **Commission** | Staking + MEV commission rates |
| **Vote Credits** | Relative to cluster average (% above/below) |
| **Skip Rate** | Block production skip rate |
| **Sandwich Status** | Honest / Sandwicher (from Pine Stake data) |
| **Geographic Location** | Country + city + data center |
| **Client** | Agave / Firedancer / Jito / Frankendancer |
| **SFDP Status** | Onboarded / Retired / Rejected / Not on SFDP |
| **APY** | Current estimated annual yield |
| **Wiz Score** | From StakeWiz API |

#### Validator Detail Page

- Full history of stake changes by epoch
- Which pools added/removed stake and when
- Performance sparklines (vote credits, skip rate over time)
- Geographic and data center info
- Link to on-chain accounts (vote account, identity)

---

## Data Architecture

### Data Sources

| Source | What It Provides | Update Frequency |
|--------|-----------------|------------------|
| **Solana RPC** (`getVoteAccounts`) | Active stake, commission, vote credits, delinquency, epoch credits | Every epoch (~2 days) |
| **Solana RPC** (`getClusterNodes`) | Node IP/contact info for geographic mapping | Every epoch |
| **StakeWiz API** | Wiz Score, validator details, historical performance, skip rates | Every epoch |
| **On-chain stake pool accounts** | Pool → validator delegation mappings, pool size, fee structure | Every epoch |
| **Pine Stake / sandwich detection** | Sandwich validator blacklist, block times | Periodic |
| **IP Geolocation** | Validator geographic location from node IPs | On discovery |
| **Sandwiched.me** | Sandwich attack tracking: validator sandwich %, top attackers, victim data, attack volume | Real-time + 30-day aggregates |
| **Solana Compass API** | Raw validator data, decentralization stats | Reference/cross-validation |

### Backend Design

```
┌──────────────────────────────────────────────────┐
│                  Epoch Indexer                     │
│  (Runs at each epoch boundary, ~every 2 days)     │
│                                                    │
│  1. Fetch getVoteAccounts → validator snapshot     │
│  2. Fetch stake pool accounts → delegation map     │
│  3. Fetch StakeWiz API → scores + metadata         │
│  4. Geolocate new validator IPs                    │
│  5. Compute pool health scores                     │
│  6. Store epoch snapshot in DB                     │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│                   Database                         │
│  (SQLite for MVP, Postgres for production)         │
│                                                    │
│  Tables:                                           │
│  - epochs (epoch_number, slot_range, timestamp)    │
│  - validators (pubkey, name, geo, datacenter,      │
│    client, sfdp_status)                            │
│  - validator_snapshots (epoch, pubkey, stake,       │
│    commission, vote_credits, skip_rate, wiz_score) │
│  - stake_pools (pool_id, name, lst_ticker, fees)   │
│  - pool_delegations (epoch, pool_id, validator,    │
│    delegated_sol)                                   │
│  - pool_scores (epoch, pool_id, score_breakdown)   │
│  - sandwich_list (validator_pubkey, detected_date)  │
└────────────────────┬─────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│                  API Layer                          │
│  (Next.js API routes or separate Express server)   │
│                                                    │
│  GET /api/pools - list pools with scores           │
│  GET /api/pools/:id - pool detail + delegations    │
│  GET /api/pools/:id/history - score over time      │
│  GET /api/validators - leaderboard                 │
│  GET /api/validators/:pubkey - validator detail     │
│  GET /api/network/flows - sankey data              │
│  GET /api/network/geo - geographic distribution    │
│  GET /api/epochs/:n/snapshot - epoch snapshot      │
└──────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 + TypeScript | SSR for SEO, React ecosystem, great DX |
| **Styling** | Tailwind CSS + custom design system | Utility-first, easy to apply custom brand |
| **Charts** | D3.js (Sankey, geo map) + Recharts (bar/line charts) | D3 for custom viz, Recharts for standard charts |
| **State** | TanStack Query (React Query) | Caching, background refetch, pagination |
| **Database** | SQLite (MVP) → Postgres (production) | Zero-config start, easy migration path |
| **ORM** | Drizzle ORM | Type-safe, lightweight, great DX |
| **Indexer** | Node.js script + cron / Vercel cron | Simple epoch-boundary job |
| **Hosting** | Vercel (frontend) + Railway/Fly (DB) | Fast deploys, good free tiers |

---

## Scope: Multi-Validator Stake Pools Only

Of the 201 "pools" listed on Solana Compass, **~170+ are single-validator LST wrappers** created via Sanctum (e.g., Drift dSOL, Helius hSOL, Backpack bpSOL). These aren't making delegation decisions across validators - they're branded staking products for one operator. Our dashboard excludes these entirely.

We focus on the **~15 pools that actually distribute stake across 10+ validators** - the entities making real delegation decisions that impact network decentralization.

### Pools In Scope (sorted by validator count)

| Pool | LST | Validators | Active Stake (SOL) | APY | Program | Philosophy |
|------|-----|-----------|-------------------|-----|---------|------------|
| **Jito** | JitoSOL | 325 | 12,788,407 | 5.97% | spl-stake-pool | Performance-first, 0% staking commission required, large set |
| **DoubleZero** | dzSOL | 318 | 13,357,851 | 5.62% | spl-stake-pool | Infrastructure-based (private fiber network), 5% network fee |
| **BlazeStake** | bSOL | 234 | 1,031,679 | 5.72% | spl-stake-pool | Largest open validator set, decentralization-focused |
| **JPool** | JSOL | 217 | 1,250,759 | 5.78% | spl-stake-pool | Community signals, top 500 APY, audited spl program |
| **Phase Delegation** | pdSOL | 163 | 1,068,321 | 5.68% | spl-stake-pool | Prioritizes small validators explicitly |
| **Vault** | vSOL | 121 | 1,249,140 | 5.82% | spl-stake-pool | Token flywheel, validators compete for delegation via $V |
| **dynoSOL** | dynoSOL | 76 | 523,576 | 5.81% | spl-stake-pool | TBD - needs more research |
| **JagPool** | jagSOL | 75 | 744,077 | 5.75% | spl-stake-pool | Regional focus (LATAM, Singapore, South Africa) |
| **STKE** | STKESOL | 66 | 689,479 | 5.75% | spl-stake-pool | TBD - needs more research |
| **Marinade** | mSOL | 57 | 2,888,186 | 5.86% | marinade | PSR auction model, some sandwich delegation issues |
| **Shinobi** | xSHIN | 55 | 1,096,471 | 5.65% | spl-stake-pool | Every-epoch rebalancing, performance-focused |
| **Edgevana** | edgeSOL | 48 | 828,375 | 5.75% | spl-stake-pool | Requires Edgevana infrastructure hosting |
| **Definity** | definSOL | 25 | 261,604 | 5.78% | sanctum-multi | Asia-Pacific regional focus |
| **IndieSOL** | IndieSOL | 22 | 974 | 6.53% | spl-stake-pool | Very small, indie-focused |
| **SharkPool** | sharkSOL | 10 | 207,928 | 5.66% | spl-stake-pool | University validator partnerships (Princeton, UPenn) |

**Total multi-validator pool stake: ~37M SOL across ~15 pools**

### Notable Single-Validator Pools (shown for context, not scored)

These are listed separately on the dashboard as "Branded LSTs" - they don't get a Network Health Score since they don't make multi-validator delegation decisions, but their concentration is worth tracking:

| Pool | LST | Validators | Active Stake (SOL) | Note |
|------|-----|-----------|-------------------|------|
| **Binance** | BNSOL | 5 | 8,922,736 | Massive stake, minimal distribution |
| **Jupiter** | JupSOL | 4 | 4,141,527 | Mostly single-validator |
| **Drift** | dSOL | 1 | 2,513,558 | Single validator wrapper |
| **Phantom** | PSOL | 1 | 1,337,914 | Single validator wrapper |
| **Lido** | stSOL | 11 | 147,859 | Winding down, "decentralized on a technicality" |

---

## Score Computation: Detailed Algorithms

### 1. Small Validator Bias Score (0-100)

```
median_stake = median(all_validator_stakes)
superminority_threshold = stake_needed_for_top_19_validators

for each pool:
  stake_to_small = sum(delegation) where validator.stake < median_stake
  stake_to_super = sum(delegation) where validator.stake > superminority_threshold

  small_ratio = stake_to_small / total_pool_stake
  super_ratio = stake_to_super / total_pool_stake

  score = (small_ratio * 100) - (super_ratio * 50)
  clamp(score, 0, 100)
```

### 2. Geographic Diversity Score (0-100)

```
Using Shannon Entropy:
  H = -Σ (p_i * log2(p_i)) for each country i

  max_entropy = log2(number_of_countries_with_validators)
  score = (H / max_entropy) * 100
```

### 3. Nakamoto Coefficient Impact Score (0-100)

```
current_nakamoto = compute_nakamoto(all_validators)

for each pool:
  simulated_stakes = remove pool's delegations from all validators
  simulated_nakamoto = compute_nakamoto(simulated_stakes)

  impact = current_nakamoto - simulated_nakamoto
  // Positive impact = pool is helping (removing it would hurt)
  // Negative impact = pool is concentrating (removing it would help)

  score = 50 + (impact * 10)  // Centered at 50, scaled
  clamp(score, 0, 100)
```

---

## Key Design Principles

1. **Pool-centric, not validator-centric** - The primary lens is "what is this pool doing with its power?"
2. **Show the delta** - Not just current state but direction: is this pool getting better or worse?
3. **Make trade-offs visible** - Some pools sacrifice APY for decentralization. Show both.
4. **No hidden editorial** - Scoring methodology is fully transparent and published
5. **Epoch-grained history** - Every metric has a time dimension tied to epochs
6. **Mobile-friendly** - Scorecard view must work on mobile; flow map can be desktop-focused

---

## MVP Scope (v0.1)

### Must Have
- [ ] Epoch indexer that fetches and stores validator + pool delegation data
- [ ] Pool scorecard with Network Health Score and 7 sub-scores
- [ ] Sortable/filterable pool list with key metrics
- [ ] Pool detail page with sub-score breakdown
- [ ] Basic validator leaderboard with pool affiliation badges
- [ ] Validator detail page with pool delegation history
- [ ] Responsive design for scorecard view

### Should Have
- [ ] Sankey flow diagram (pools → validators)
- [ ] Geographic heatmap
- [ ] Pool comparison mode (side-by-side)
- [ ] Epoch history charts for scores
- [ ] Sandwich validator flagging

### Could Have
- [ ] Epoch-over-epoch animation of stake flows
- [ ] Data center concentration warnings
- [ ] Client diversity breakdown per pool
- [ ] API for third-party consumption
- [ ] Social sharing cards (pool score as OG image)

---

## Case Study: The Vault's Flywheel (Why This Dashboard Matters)

The Vault (vSOL) is a textbook example of a stake pool that appears to support decentralization but has mechanics that primarily serve its own token economics:

**The Flywheel:**
1. Users stake SOL → receive vSOL
2. Validators who want delegation from The Vault must:
   - Apply through Discord and get Validator Board approval
   - Maintain ≤5% base commission, ≤10% MEV commission
   - For the "performance pool" (40% of undirected stake): run 0/0 commission
   - Hold $V tokens OR incentivize votes on Votex.so
   - Direct their own stake through vSOL or Kamino (optional but incentivized)
3. **The top 100 validators who delegate the most SOL back through Vault's vSOL** share 40% of The Vault's undirected stake equally
4. This creates demand pressure: validators buy vSOL → TVL grows → Vault gets more delegation power → more validators need to buy in

**Why this is problematic:**
- Validators are essentially paying for delegation by staking through vSOL (circular demand)
- The 0/0 commission requirement for the performance pool means validators subsidize stakers at their own expense
- $V token holding requirement creates artificial demand for a governance token
- The system optimizes for Vault's TVL growth, not for network decentralization
- Contrast with Phase Delegation: simply gives more SOL to smaller validators with no token requirement

**What our dashboard would show:**
- Vault's validators are concentrated among those willing to buy into the system
- The "small validator bias" score would reveal whether Vault actually delegates to small validators or just to those who play the game
- The transparency score would flag the Discord-application gatekeeping
- A new "self-dealing" metric could flag pools where validators must purchase the pool's own products

---

## Open Questions

1. **Weighting**: Are the sub-score weights right? Should Small Validator Bias be even more heavily weighted since that's the core thesis?
2. **Sandwich data**: Pine Stake has this, but is there a public API? May need to maintain our own list.
3. **Pool identification**: How do we reliably identify which on-chain stake pool accounts belong to which pools? May need a manual registry to start.
4. **Vault's model**: Should we add a "Self-Dealing Score" sub-metric that penalizes pools requiring validators to buy the pool's own tokens/LSTs to receive delegation? This would capture the Vault flywheel pattern and any similar future pools.
5. **Update frequency**: Epoch-grained is ~every 2 days. Is that sufficient or do we need intra-epoch data for stake movement tracking?

---

## Research Sources

- [Helius: Solana Decentralization Facts & Figures](https://www.helius.dev/blog/solana-decentralization-facts-and-figures)
- [Helius: Solana MEV Report](https://www.helius.dev/blog/solana-mev-report)
- [Pine Analytics: Validator & Fee Economics](https://pineanalytics.substack.com/p/solana-validator-and-fee-economics)
- [Pine Stake: Pool Dashboard](https://www.pinestake.com/en/pools)
- [Solana Compass: Stake Pools](https://solanacompass.com/stake-pools)
- [Solana Compass: Decentralization Dashboard](https://solanacompass.com/statistics/decentralization)
- [Solana Foundation Delegation Program](https://solana.org/delegation-program)
- [StakeWiz API Docs](https://docs.stakewiz.com/)
- [SOFZP Stake Pools Research (GitHub)](https://github.com/SOFZP/Solana-Stake-Pools-Research)
- [DL News: Validator Network Decline](https://www.dlnews.com/articles/defi/solana-supports-say-validator-network-is-decline-is-a-good-thing/)
- [CryptoRank: Validator Decline Analysis](https://cryptorank.io/news/feed/74646-solana-validator-count-decline-analysis)
- [Sandwiched.me: State of MEV](https://sandwiched.me/research/state-of-solana-mev-may-2025-analysis)
- [Sandwiched.me: Sandwich Tracker](https://sandwiched.me/sandwiches)
- [Pine Stake: Pool Dashboard](https://www.pinestake.com/en/pools)
- [The Vault Docs](https://docs.thevault.finance/)
- [Everstake: Solana Staking Insights 2025](https://everstake.one/crypto-reports/solana-staking-insights-and-analysis-first-half-of-2025)
- [Solana Compass: Decentralization Dashboard](https://solanacompass.com/statistics/decentralization)
