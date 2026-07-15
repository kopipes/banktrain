CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `concept_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text DEFAULT 'Untitled Project' NOT NULL,
	`current_phase` integer DEFAULT 1 NOT NULL,
	`session_data` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `concept_projects_user_idx` ON `concept_projects` (`user_id`);--> statement-breakpoint
CREATE INDEX `concept_projects_updated_at_idx` ON `concept_projects` (`updated_at`);