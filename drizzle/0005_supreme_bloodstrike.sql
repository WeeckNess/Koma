CREATE TABLE `catalog_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`isbn` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `gift_reservations` (
	`list` text NOT NULL,
	`isbn` text NOT NULL,
	`secret` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`list`, `isbn`)
);
--> statement-breakpoint
CREATE TABLE `loan_requests` (
	`sender` text NOT NULL,
	`target` text NOT NULL,
	`isbn` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`sender`, `target`, `isbn`)
);
--> statement-breakpoint
CREATE TABLE `reader_loans` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`isbn` text NOT NULL,
	`borrower` text NOT NULL,
	`due` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	`returned` text
);
--> statement-breakpoint
CREATE TABLE `reader_alerts` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `reader_events` (
	`owner` text NOT NULL,
	`isbn` text NOT NULL,
	`kind` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`owner`, `isbn`, `kind`, `day`)
);
--> statement-breakpoint
CREATE TABLE `reader_settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`gift_token` text,
	`calendar_token` text,
	`gift_enabled` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `release_observations` (
	`owner` text NOT NULL,
	`isbn` text NOT NULL,
	`date` text NOT NULL,
	PRIMARY KEY(`owner`, `isbn`)
);
--> statement-breakpoint
CREATE TABLE `series_follows` (
	`owner` text NOT NULL,
	`key` text NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`owner`, `key`)
);
--> statement-breakpoint
CREATE TABLE `spine_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`isbn` text NOT NULL,
	`created` text NOT NULL
);
