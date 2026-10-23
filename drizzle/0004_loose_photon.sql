CREATE TABLE `library_styles` (
	`owner` text PRIMARY KEY NOT NULL,
	`earned` text DEFAULT '{}' NOT NULL,
	`customization` text DEFAULT '{}' NOT NULL
);
