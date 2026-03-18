import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

// ------- Epochs -------
export const epochs = sqliteTable("epochs", {
  epochNumber: integer("epoch_number").primaryKey(),
  startSlot: integer("start_slot").notNull(),
  endSlot: integer("end_slot"),
  startedAt: text("started_at").notNull(), // ISO timestamp
  endedAt: text("ended_at"),
  totalStake: real("total_stake"), // total SOL staked network-wide
  nakamotoCoefficient: integer("nakamoto_coefficient"),
});

// ------- Validators -------
export const validators = sqliteTable("validators", {
  pubkey: text("pubkey").primaryKey(),
  name: text("name"),
  iconUrl: text("icon_url"),
  country: text("country"),
  city: text("city"),
  datacenter: text("datacenter"),
  client: text("client"), // agave, firedancer, jito, etc
  sfdpStatus: text("sfdp_status"), // eligible, active, ineligible
  description: text("description"),
  createdAt: text("created_at").notNull(),
});

// ------- Validator Snapshots (per-epoch) -------
export const validatorSnapshots = sqliteTable(
  "validator_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    epochNumber: integer("epoch_number")
      .notNull()
      .references(() => epochs.epochNumber),
    validatorPubkey: text("validator_pubkey")
      .notNull()
      .references(() => validators.pubkey),
    activeStake: real("active_stake").notNull(), // SOL
    commission: integer("commission").notNull(), // 0-100
    voteCredits: integer("vote_credits"),
    skipRate: real("skip_rate"),
    apy: real("apy"),
    wizScore: integer("wiz_score"),
    stakeTier: text("stake_tier"), // small, medium, large, superminority
    isSuperminority: integer("is_superminority", { mode: "boolean" }).default(false),
  },
  (table) => [
    uniqueIndex("vs_epoch_validator").on(table.epochNumber, table.validatorPubkey),
  ]
);

// ------- Stake Pools -------
export const stakePools = sqliteTable("stake_pools", {
  id: text("id").primaryKey(), // slug: marinade, jito, blazestake, etc
  name: text("name").notNull(),
  lstTicker: text("lst_ticker").notNull(),
  lstMint: text("lst_mint"), // SPL token mint address
  program: text("program").notNull(), // spl-stake-pool, marinade, jito, sanctum
  website: text("website"),
  selfDealingFlag: integer("self_dealing_flag", { mode: "boolean" }).default(false),
  selfDealingNotes: text("self_dealing_notes"),
  // Fee structure (from on-chain stake pool account)
  epochFeeNumerator: integer("epoch_fee_numerator"),
  epochFeeDenominator: integer("epoch_fee_denominator"),
  depositFeeNumerator: integer("deposit_fee_numerator"),
  depositFeeDenominator: integer("deposit_fee_denominator"),
  withdrawalFeeNumerator: integer("withdrawal_fee_numerator"),
  withdrawalFeeDenominator: integer("withdrawal_fee_denominator"),
  managerFeeAccount: text("manager_fee_account"), // token account receiving minted LST
  managerWallet: text("manager_wallet"), // wallet that owns the fee account — tracks sells
  createdAt: text("created_at").notNull(),
});

// ------- Pool Delegations (per-epoch) -------
export const poolDelegations = sqliteTable(
  "pool_delegations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    epochNumber: integer("epoch_number")
      .notNull()
      .references(() => epochs.epochNumber),
    poolId: text("pool_id")
      .notNull()
      .references(() => stakePools.id),
    validatorPubkey: text("validator_pubkey")
      .notNull()
      .references(() => validators.pubkey),
    delegatedSol: real("delegated_sol").notNull(),
  },
  (table) => [
    uniqueIndex("pd_epoch_pool_validator").on(
      table.epochNumber,
      table.poolId,
      table.validatorPubkey
    ),
  ]
);

// ------- Pool Scores (per-epoch) -------
export const poolScores = sqliteTable(
  "pool_scores",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    epochNumber: integer("epoch_number")
      .notNull()
      .references(() => epochs.epochNumber),
    poolId: text("pool_id")
      .notNull()
      .references(() => stakePools.id),

    // Overall weighted score
    networkHealthScore: integer("network_health_score").notNull(),

    // Sub-scores (0-100 each)
    smallValidatorBias: integer("small_validator_bias").notNull(),
    selfDealing: integer("self_dealing").notNull(),
    mevSandwichPolicy: integer("mev_sandwich_policy").notNull(),
    nakamotoImpact: integer("nakamoto_impact").notNull(),
    validatorSetSize: integer("validator_set_size").notNull(),
    geographicDiversity: integer("geographic_diversity").notNull(),
    commissionDiscipline: integer("commission_discipline").notNull(),
    transparency: integer("transparency").notNull(),

    // Aggregate stats for this epoch
    activeSolStaked: real("active_sol_staked"),
    validatorCount: integer("validator_count"),
    medianApy: real("median_apy"),

    // Revenue data
    epochFeePercent: real("epoch_fee_percent"), // e.g. 0.05 for 5%
    epochRevenueSol: real("epoch_revenue_sol"), // SOL earned by pool operator this epoch
    cumulativeRevenueSol: real("cumulative_revenue_sol"), // running total
    feeSource: text("fee_source"), // "on-chain" | "estimated"
  },
  (table) => [
    uniqueIndex("ps_epoch_pool").on(table.epochNumber, table.poolId),
  ]
);

// ------- Pool Fee Snapshots (per-epoch revenue tracking) -------
export const poolFeeSnapshots = sqliteTable(
  "pool_fee_snapshots",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    epochNumber: integer("epoch_number")
      .notNull()
      .references(() => epochs.epochNumber),
    poolId: text("pool_id")
      .notNull()
      .references(() => stakePools.id),
    epochFeePercent: real("epoch_fee_percent"),
    totalPoolLamports: real("total_pool_lamports"),
    lastEpochTotalLamports: real("last_epoch_total_lamports"),
    epochRevenueSol: real("epoch_revenue_sol"),
    cumulativeRevenueSol: real("cumulative_revenue_sol"),
    managerFeeAccount: text("manager_fee_account"),
    feeSource: text("fee_source"), // "on-chain" | "estimated"
  },
  (table) => [
    uniqueIndex("pfs_epoch_pool").on(table.epochNumber, table.poolId),
  ]
);

// ------- Pool Fee Events (Tier 2: sell vs hold tracking) -------
export const poolFeeEvents = sqliteTable(
  "pool_fee_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    epochNumber: integer("epoch_number"),
    poolId: text("pool_id")
      .notNull()
      .references(() => stakePools.id),
    eventType: text("event_type").notNull(), // collected | redeemed | swapped | transferred | unknown
    amountSol: real("amount_sol"),
    txSignature: text("tx_signature"),
    destination: text("destination"),
    destinationLabel: text("destination_label"),
    blockTime: integer("block_time"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("pfe_tx_pool").on(table.txSignature, table.poolId),
  ]
);

// ------- Pool Fee Balances (Tier 2: per-epoch balance snapshots) -------
export const poolFeeBalances = sqliteTable(
  "pool_fee_balances",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    epochNumber: integer("epoch_number")
      .notNull()
      .references(() => epochs.epochNumber),
    poolId: text("pool_id")
      .notNull()
      .references(() => stakePools.id),
    feeAccountAddress: text("fee_account_address").notNull(),
    tokenBalance: real("token_balance"),
    solEquivalent: real("sol_equivalent"),
  },
  (table) => [
    uniqueIndex("pfb_epoch_pool").on(table.epochNumber, table.poolId),
  ]
);

// ------- Sandwich List -------
export const sandwichList = sqliteTable("sandwich_list", {
  validatorPubkey: text("validator_pubkey")
    .primaryKey()
    .references(() => validators.pubkey),
  detectedDate: text("detected_date").notNull(),
  source: text("source"), // sandwiched.me, pine-stake, manual
  sandwichPercent: real("sandwich_percent"), // % of blocks with sandwich
  lastUpdated: text("last_updated").notNull(),
});
