CREATE TABLE `catalog_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`hash` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`owner` text,
	`name` text NOT NULL,
	`expires` integer NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_code_unique` ON `devices` (`code`);--> statement-breakpoint
CREATE TABLE `mutations` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suggestions` (
	`owner` text NOT NULL,
	`isbn` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`owner`, `isbn`)
);
