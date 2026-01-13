ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_device_id_devices_id_fk` FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `route_name`;--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `direction_name`;--> statement-breakpoint
ALTER TABLE `subscriptions` DROP COLUMN `stop_name`;