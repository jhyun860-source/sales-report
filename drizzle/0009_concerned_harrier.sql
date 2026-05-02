CREATE TABLE `liquorInventories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`liquorItemId` int NOT NULL,
	`currentStock` decimal(12,2) NOT NULL DEFAULT '0',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `liquorInventories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `liquorItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`category` varchar(50) NOT NULL DEFAULT '기타',
	`unitCost` decimal(15,0) NOT NULL DEFAULT '0',
	`isActive` int NOT NULL DEFAULT 1,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `liquorItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `liquorStockMovements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`liquorItemId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`type` enum('IN','OUT','ADJUST') NOT NULL,
	`quantity` decimal(12,2) NOT NULL DEFAULT '0',
	`unitCost` decimal(15,0) NOT NULL DEFAULT '0',
	`totalCost` decimal(15,0) NOT NULL DEFAULT '0',
	`memo` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `liquorStockMovements_id` PRIMARY KEY(`id`)
);
