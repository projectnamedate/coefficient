CREATE TABLE `pool_fee_balances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`epoch_number` integer NOT NULL,
	`pool_id` text NOT NULL,
	`fee_account_address` text NOT NULL,
	`token_balance` real,
	`sol_equivalent` real,
	FOREIGN KEY (`epoch_number`) REFERENCES `epochs`(`epoch_number`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pool_id`) REFERENCES `stake_pools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pfb_epoch_pool` ON `pool_fee_balances` (`epoch_number`,`pool_id`);--> statement-breakpoint
CREATE TABLE `pool_fee_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`epoch_number` integer,
	`pool_id` text NOT NULL,
	`event_type` text NOT NULL,
	`amount_sol` real,
	`tx_signature` text,
	`destination` text,
	`destination_label` text,
	`block_time` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`pool_id`) REFERENCES `stake_pools`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pfe_tx_pool` ON `pool_fee_events` (`tx_signature`,`pool_id`);