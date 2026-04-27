ALTER TABLE `subscription` RENAME COLUMN `route_id` TO `route_name`;--> statement-breakpoint
ALTER TABLE `subscription` RENAME COLUMN `direction_id` TO `direction_name`;--> statement-breakpoint
ALTER TABLE `subscription` RENAME COLUMN `stop_id` TO `stop_name`;--> statement-breakpoint
DROP INDEX `idx_subscriptions_route_stop` ON `subscription`;--> statement-breakpoint
ALTER TABLE `subscription` MODIFY COLUMN `route_name` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription` MODIFY COLUMN `direction_name` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription` MODIFY COLUMN `stop_name` varchar(128) NOT NULL;