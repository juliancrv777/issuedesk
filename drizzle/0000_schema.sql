CREATE TABLE `activity` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_id` integer NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_activity_ticket_created` ON `activity` (`ticket_id`,`created_at`);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creation_key` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`requester` text NOT NULL,
	`assignee` text DEFAULT '' NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`mutation_id` text NOT NULL,
	CONSTRAINT "valid_status" CHECK("tickets"."status" in ('open','in_progress','resolved')),
	CONSTRAINT "valid_priority" CHECK("tickets"."priority" in ('low','medium','high','urgent'))
);

--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_creation_key_unique` ON `tickets` (`creation_key`);
--> statement-breakpoint
CREATE INDEX `idx_tickets_status_created` ON `tickets` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `idx_tickets_created` ON `tickets` (`created_at`);
