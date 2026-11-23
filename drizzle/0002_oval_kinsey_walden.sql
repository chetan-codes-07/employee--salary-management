CREATE TABLE `hr_sessions` (
	`digest` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `hr_sessions_expiry` ON `hr_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `login_attempts` (
	`client` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`expires_at` integer NOT NULL
);
