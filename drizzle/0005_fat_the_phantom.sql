ALTER TABLE `tableItems` MODIFY COLUMN `guestType` enum('walking','regular','named') NOT NULL DEFAULT 'walking';--> statement-breakpoint
ALTER TABLE `staffIncentives` ADD `salesIncentive` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `staffIncentives` ADD `workStart` varchar(5);--> statement-breakpoint
ALTER TABLE `staffIncentives` ADD `workEnd` varchar(5);--> statement-breakpoint
ALTER TABLE `tableItems` ADD `guestName` varchar(100);--> statement-breakpoint
ALTER TABLE `tableReports` ADD `cashAmount` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `tableReports` ADD `cardAmount` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `tableReports` DROP COLUMN `branchNewGuestTip`;--> statement-breakpoint
ALTER TABLE `tableReports` DROP COLUMN `barNewGuestTip`;