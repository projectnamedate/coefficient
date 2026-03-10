# Coefficient

**Solana stake pool health dashboard** — scoring how multi-validator stake pools impact network decentralization.

Live at [coefficient.mythx.art](https://coefficient.mythx.art)

---

## What is Coefficient?

Stake pools control tens of millions of SOL and decide which validators receive delegation. Some pools genuinely support small validators and geographic diversity. Others concentrate stake in the superminority or require validators to buy tokens for delegation.

Coefficient scores each pool on **how well it distributes stake**, not just how much yield it generates. It's pool-centric, not validator-centric — answering: *"Where is each pool's SOL going, and is that good or bad for the network?"*

## Pools Tracked

Coefficient tracks multi-validator stake pools with 10+ validators. Single-validator Sanctum wrappers (~170+) are excluded since they don't make delegation decisions.

| Pool | LST | Program |
|------|-----|---------|
| Jito | JitoSOL | SPL Stake Pool |
| DoubleZero | dSOL | SPL Stake Pool |
| BlazeStake | bSOL | SPL Stake Pool |
| JPool | JSOL | SPL Stake Pool |
| Phase Delegation | phaseSOL | SPL Stake Pool |
| Vault | vSOL | SPL Stake Pool |
| dynoSOL | dynoSOL | SPL Stake Pool |
| JagPool | jagSOL | SPL Stake Pool |
| STKE | stkeSOL | SPL Stake Pool |
| Marinade | mSOL | Marinade |
| Shinobi | shinSOL | SPL Stake Pool |
| Edgevana | edgeSOL | SPL Stake Pool |
| Definity | dfSOL | Sanctum Multi |
| IndieSOL | indSOL | SPL Stake Pool |
| SharkPool | sharkSOL | SPL Stake Pool |

## Scoring

Each pool receives a **Network Health Score** (0–100) composed of 7 weighted sub-scores:

| Sub-Score | Weight | What It Measures |
|-----------|--------|------------------|
| Small Validator Bias | 20% | Stake to validators below median vs. superminority |
| Nakamoto Impact | 20% | Would removing this pool's delegation hurt the Nakamoto Coefficient? |
| MEV/Sandwich Policy | 15% | Exposure to known sandwich validators |
| Stake Distribution | 15% | How evenly stake is spread across validators (Shannon entropy + count bonus) |
| Self-Dealing | 10% | Token purchase or LST staking requirements for delegation |
| Geographic Diversity | 10% | Shannon entropy of stake-weighted country distribution |
| Commission Discipline | 10% | Percentage of validators at ≤10% commission |

Scores are normalized to a [55, 95] curve. Grades: A (≥90), A- (≥85), B+ (≥80), B (≥75), B- (≥70), C+ (≥65), C (≥60), D (<60).

A **Delegation Transparency** grade (A–D) is also shown on each pool's detail page but carries 0% weight in the composite.

## Pages

- **/** — Scorecard with all pools ranked by health score
- **/pool/[id]** — Pool detail: score breakdown, validator list, delegation history
- **/validator/[pubkey]** — Validator detail: pool memberships, profitability, commission
- **/validators** — Validator leaderboard with interactive geographic heatmap
- **/compare** — Side-by-side pool comparison
- **/flows** — Stake flow visualization (pools → validators)
- **/insights** — Narrative insights on MEV, geography, and delegation patterns
- **/overlap** — Ecosystem reach: validator overlap across pools
- **/about** — Methodology and data sources
- **/embed** — Embeddable score widgets

## Data Sources

| Source | What It Provides |
|--------|-----------------|
| [Solana RPC](https://solana.com) | On-chain stake pool accounts, delegation lists, epoch data |
| [StakeWiz](https://stakewiz.com) | Validator names, geography, datacenter, skip rates, APY |
| [Trillium](https://trillium.so) | Per-epoch validator profitability and revenue breakdown |
| [Marinade API](https://marinade.finance) | Marinade-specific delegation data |
| [sandwiched.me](https://sandwiched.me) | Sandwich validator blacklist |
| [a-guard](https://github.com/a-guard) | Additional sandwich validator data |
| Solana Config Program | On-chain validator names (ValidatorInfo) |

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Styling:** Tailwind CSS v4 + Framer Motion
- **Database:** Turso (libSQL) + Drizzle ORM
- **Blockchain:** @solana/web3.js + @solana/spl-stake-pool
- **Visualization:** D3.js (Sankey diagrams, geographic maps)
- **Deployment:** Vercel

## Architecture

```
src/
├── app/              # Next.js pages and API routes
│   ├── api/          # /api/pools, /api/cron, /api/search, /api/embed
│   ├── pool/[id]/    # Pool detail pages
│   ├── validator/    # Validator detail pages
│   └── ...           # Other pages
├── components/       # React components
├── db/               # Drizzle schema, queries, seed data
├── indexer/          # Data pipeline
│   ├── fetchers/     # Solana RPC, StakeWiz, Marinade, ValidatorInfo
│   ├── scoring/      # 7 sub-score algorithms + composite
│   ├── data/         # Pool registry, overrides, sandwich list
│   └── run.ts        # CLI entry point
└── lib/              # Shared types, utilities, grade computation
```

### Indexer Pipeline

The indexer runs daily via Vercel cron (`/api/cron`):

1. Fetch epoch info from Solana RPC
2. Fetch validator data (RPC + StakeWiz + Marinade + on-chain ValidatorInfo)
3. Parse on-chain stake pool delegation accounts
4. Load sandwich validator blacklist
5. Compute all sub-scores and weighted composite
6. Write epoch snapshot to database
7. Send alerts via webhook (Discord/Slack) on significant changes

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run indexer (requires .env with SOLANA_RPC_URL, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
npm run index

# Dry run (no DB writes)
npm run index:dry

# Force reindex current epoch
npm run index:force

# Build for production
npm run build
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SOLANA_RPC_URL` | Yes | Solana mainnet RPC endpoint |
| `TURSO_DATABASE_URL` | Yes | Turso database URL |
| `TURSO_AUTH_TOKEN` | Yes | Turso authentication token |
| `CRON_SECRET` | Yes | Secret for Vercel cron authentication |
| `ALERT_WEBHOOK_URL` | No | Discord/Slack webhook for alerts |

## Built by Mythx

Coefficient is an open-source project by [Mythx](https://mythx.art), a Solana validator operator.
