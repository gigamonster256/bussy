CREATE TABLE `device` (
	`id` char(30) PRIMARY KEY,
	`push_endpoint` text,
	`push_p256dh` text,
	`push_auth` text,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` char(30) PRIMARY KEY,
	`device_id` char(30) NOT NULL,
	`route_id` varchar(64) NOT NULL,
	`direction_id` varchar(64) NOT NULL,
	`stop_id` varchar(64) NOT NULL,
	`notify_minutes` tinyint NOT NULL DEFAULT 5,
	`time_range_start` varchar(5) NOT NULL DEFAULT '00:00',
	`time_range_end` varchar(5) NOT NULL DEFAULT '23:59',
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX `idx_subscriptions_device_id` ON `subscription` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_route_stop` ON `subscription` (`route_id`,`direction_id`,`stop_id`);--> statement-breakpoint
ALTER TABLE `subscription` ADD CONSTRAINT `subscription_device_id_device_id_fkey` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE CASCADE;