CREATE TABLE `backups` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`data` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`owner`, `day`)
);
