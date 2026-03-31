RENAME TABLE `subscriptions` TO `subscription`;--> statement-breakpoint
ALTER TABLE `subscription` RENAME COLUMN `created_at` TO `time_created`;--> statement-breakpoint
ALTER TABLE `subscription` RENAME COLUMN `updated_at` TO `time_updated`;--> statement-breakpoint
ALTER TABLE `subscription` DROP FOREIGN KEY `subscriptions_device_id_device_id_fk`;
--> statement-breakpoint
ALTER TABLE `subscription` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `subscription` MODIFY COLUMN `id` char(30) NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription` MODIFY COLUMN `device_id` char(30) NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription` MODIFY COLUMN `time_created` timestamp(3) NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `subscription` MODIFY COLUMN `time_updated` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);--> statement-breakpoint
ALTER TABLE `subscription` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `subscription` ADD CONSTRAINT `subscription_device_id_device_id_fk` FOREIGN KEY (`device_id`) REFERENCES `device`(`id`) ON DELETE cascade ON UPDATE no action;