CREATE TABLE `feed_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`published_at` text,
	`updated_at` text,
	`payload` text NOT NULL,
	`first_seen` text NOT NULL,
	`last_seen` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `feed_source_idx` ON `feed_items` (`source_id`);--> statement-breakpoint
CREATE TABLE `refresh_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`summary` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_changes` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`item_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`change_type` text NOT NULL,
	`observed_at` text NOT NULL,
	`before_payload` text,
	`after_payload` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_error` text,
	`etag` text
);
--> statement-breakpoint
CREATE TABLE `user_trips` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`updated_at` text NOT NULL
);
