CREATE TABLE `friends` (
	`owner` text NOT NULL,
	`target` text NOT NULL,
	PRIMARY KEY(`owner`, `target`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`owner` text NOT NULL,
	`isbn` text NOT NULL,
	`data` text NOT NULL,
	`status` text DEFAULT 'owned' NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `isbn`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`shared` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_code_unique` ON `profiles` (`code`);