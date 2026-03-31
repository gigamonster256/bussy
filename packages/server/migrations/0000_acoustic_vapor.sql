CREATE TABLE `subscriptions` (
	`id` varchar(36) NOT NULL,
	`device_id` varchar(36) NOT NULL,
	`route_id` varchar(64) NOT NULL,
	`direction_id` varchar(64) NOT NULL,
	`stop_id` varchar(64) NOT NULL,
	`notify_minutes` tinyint NOT NULL DEFAULT 5,
	`time_range_start` varchar(5) NOT NULL DEFAULT '00:00',
	`time_range_end` varchar(5) NOT NULL DEFAULT '23:59',
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `device` (
	`id` char(30) NOT NULL,
	`push_endpoint` text,
	`push_p256dh` text,
	`push_auth` text,
	`time_created` timestamp(3) NOT NULL DEFAULT (now()),
	`time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	CONSTRAINT `device_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_subscriptions_device_id` ON `subscriptions` (`device_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_route_stop` ON `subscriptions` (`route_id`,`direction_id`,`stop_id`);