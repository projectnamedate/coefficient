CREATE TABLE `epochs` (
	`epoch_number` integer PRIMARY KEY NOT NULL,
	`start_slot` integer NOT NULL,
	`end_slot` integer,
	`started_at` text NOT NULL,
	`ended_at` text,
	`total_stake` real,
	`nakamoto_coefficient` integer
);
--> statement-breakpoint
CREATE TABLE `pool_delegations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`epoch_number` integer NOT NULL,
	`pool_id` text NOT NULL,
	`validator_pubkey` text NOT NULL,
	`delegated_sol` real NOT NULL,
	FOREIGN KEY (`epoch_number`) REFERENCES `epochs`(`epoch_number`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pool_id`) REFERENCES `stake_pools`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`validator_pubkey`) REFERENCES `validators`(`pubkey`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pd_epoch_pool_validator` ON `pool_delegations` (`epoch_number`,`pool_id`,`validator_pubkey`);--> statement-breakpoint
CREATE TABLE `pool_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`epoch_number` integer NOT NULL,
	`pool_id` text NOT NULL,
	`network_health_score` integer NOT NULL,
	`small_validator_bias` integer NOT NULL,
	`self_dealing` integer NOT NULL,
	`mev_sandwich_policy` integer NOT NULL,
	`nakamoto_impact` integer NOT NULL,
	`validator_set_size` integer NOT NULL,
	`geographic_diversity` integer NOT NULL,
	`commission_discipline` integer NOT NULL,
	`transparency` integer NOT NULL,
	`active_sol_staked` real,
	`validator_count` integer,
	`median_apy` real,
	FOREIGN KEY (`epoch_number`) REFERENCES `epochs`(`epoch_number`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pool_id`) REFERENCES `stake_pools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ps_epoch_pool` ON `pool_scores` (`epoch_number`,`pool_id`);--> statement-breakpoint
CREATE TABLE `sandwich_list` (
	`validator_pubkey` text PRIMARY KEY NOT NULL,
	`detected_date` text NOT NULL,
	`source` text,
	`sandwich_percent` real,
	`last_updated` text NOT NULL,
	FOREIGN KEY (`validator_pubkey`) REFERENCES `validators`(`pubkey`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stake_pools` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`lst_ticker` text NOT NULL,
	`lst_mint` text,
	`program` text NOT NULL,
	`website` text,
	`self_dealing_flag` integer DEFAULT false,
	`self_dealing_notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `validator_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`epoch_number` integer NOT NULL,
	`validator_pubkey` text NOT NULL,
	`active_stake` real NOT NULL,
	`commission` integer NOT NULL,
	`vote_credits` integer,
	`skip_rate` real,
	`apy` real,
	`wiz_score` integer,
	`stake_tier` text,
	`is_superminority` integer DEFAULT false,
	FOREIGN KEY (`epoch_number`) REFERENCES `epochs`(`epoch_number`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`validator_pubkey`) REFERENCES `validators`(`pubkey`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vs_epoch_validator` ON `validator_snapshots` (`epoch_number`,`validator_pubkey`);--> statement-breakpoint
CREATE TABLE `validators` (
	`pubkey` text PRIMARY KEY NOT NULL,
	`name` text,
	`icon_url` text,
	`country` text,
	`city` text,
	`datacenter` text,
	`client` text,
	`sfdp_status` text,
	`created_at` text NOT NULL
);
