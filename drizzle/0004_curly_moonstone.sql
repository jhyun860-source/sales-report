CREATE TABLE `staffIncentives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableReportId` int NOT NULL,
	`staffName` varchar(50) NOT NULL,
	`glassCount` int NOT NULL DEFAULT 0,
	`bottleCount` int NOT NULL DEFAULT 0,
	`beerBottleCount` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staffIncentives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tableItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableReportId` int NOT NULL,
	`tableNumber` varchar(20) NOT NULL,
	`guestType` enum('walking','regular') NOT NULL DEFAULT 'walking',
	`amount` decimal(15,0) NOT NULL DEFAULT '0',
	`paymentMethod` enum('card','cash','mixed') NOT NULL DEFAULT 'card',
	`memo` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tableItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tableReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`teamCount` int NOT NULL DEFAULT 0,
	`notes` text,
	`branchNewGuestTip` decimal(15,0) NOT NULL DEFAULT '0',
	`barNewGuestTip` decimal(15,0) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tableReports_id` PRIMARY KEY(`id`)
);
