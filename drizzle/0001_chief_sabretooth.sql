DROP INDEX `division_quotas_division_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `division_month_year_idx` ON `division_quotas` (`division`,`month_year`);--> statement-breakpoint
CREATE INDEX `generations_user_idx` ON `generations` (`user_id`);--> statement-breakpoint
CREATE INDEX `generations_created_at_idx` ON `generations` (`created_at`);--> statement-breakpoint
CREATE INDEX `generations_public_idx` ON `generations` (`is_public`);--> statement-breakpoint
CREATE INDEX `prompt_library_likes_idx` ON `prompt_library` (`likes`,`created_at`);--> statement-breakpoint
CREATE INDEX `token_logs_user_idx` ON `token_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `token_logs_division_month_idx` ON `token_logs` (`division`,`month_year`);