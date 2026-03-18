CREATE TABLE `pool_fee_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`epoch_number` integer NOT NULL,
	`pool_id` text NOT NULL,
	`epoch_fee_percent` real,
	`total_pool_lamports` real,
	`last_epoch_total_lamports` real,
	`epoch_revenue_sol` real,
	`cumulative_revenue_sol` real,
	`manager_fee_account` text,
	`fee_source` text,
	FOREIGN KEY (`epoch_number`) REFERENCES `epochs`(`epoch_number`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pool_id`) REFERENCES `stake_pools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pfs_epoch_pool` ON `pool_fee_snapshots` (`epoch_number`,`pool_id`);--> statement-breakpoint
ALTER TABLE `pool_scores` ADD `epoch_fee_percent` real;--> statement-breakpoint
ALTER TABLE `pool_scores` ADD `epoch_revenue_sol` real;--> statement-breakpoint
ALTER TABLE `pool_scores` ADD `cumulative_revenue_sol` real;--> statement-breakpoint
ALTER TABLE `pool_scores` ADD `fee_source` text;--> statement-breakpoint
ALTER TABLE `stake_pools` ADD `epoch_fee_numerator` integer;--> statement-breakpoint
ALTER TABLE `stake_pools` ADD `epoch_fee_denominator` integer;--> statement-breakpoint
ALTER TABLE `stake_pools` ADD `deposit_fee_numerator` integer;--> statement-breakpoint
ALTER TABLE `stake_pools` ADD `deposit_fee_denominator` integer;--> statement-breakpoint
ALTER TABLE `stake_pools` ADD `withdrawal_fee_numerator` integer;--> statement-breakpoint
ALTER TABLE `stake_pools` ADD `withdrawal_fee_denominator` integer;--> statement-breakpoint
ALTER TABLE `stake_pools` ADD `manager_fee_account` text;