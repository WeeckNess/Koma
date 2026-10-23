CREATE INDEX `catalog_reports_owner_idx` ON `catalog_reports` (`owner`,`created`);--> statement-breakpoint
CREATE INDEX `loan_requests_target_idx` ON `loan_requests` (`target`,`state`);--> statement-breakpoint
CREATE INDEX `reader_loans_owner_idx` ON `reader_loans` (`owner`,`isbn`,`returned`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_gift_token_unique` ON `reader_settings` (`gift_token`);--> statement-breakpoint
CREATE UNIQUE INDEX `reader_calendar_token_unique` ON `reader_settings` (`calendar_token`);--> statement-breakpoint
CREATE INDEX `spine_photos_owner_idx` ON `spine_photos` (`owner`,`isbn`);