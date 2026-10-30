CREATE TABLE `waitlist` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`email` text NOT NULL UNIQUE,
	`platform` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
