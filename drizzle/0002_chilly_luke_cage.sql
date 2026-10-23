CREATE TABLE `friend_requests` (
	`sender` text NOT NULL,
	`target` text NOT NULL,
	`created` integer NOT NULL,
	PRIMARY KEY(`sender`, `target`)
);
