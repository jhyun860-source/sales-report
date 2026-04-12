CREATE TABLE `branchManagers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('manager','staff') NOT NULL DEFAULT 'staff',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branchManagers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `branches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(50) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branches_id` PRIMARY KEY(`id`),
	CONSTRAINT `branches_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `dailySalesRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`posStartAmount` decimal(15,0) NOT NULL DEFAULT '0',
	`cash` decimal(15,0) NOT NULL DEFAULT '0',
	`card` decimal(15,0) NOT NULL DEFAULT '0',
	`cashTotal` decimal(15,0) NOT NULL DEFAULT '0',
	`cardTotal` decimal(15,0) NOT NULL DEFAULT '0',
	`posEndAmount` decimal(15,0) NOT NULL DEFAULT '0',
	`paymentChangeNote` text,
	`paymentChangeDate` varchar(10),
	`paymentChangeAmount` decimal(15,0) NOT NULL DEFAULT '0',
	`expenses` json NOT NULL DEFAULT ('[]'),
	`submittedBy` int,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailySalesRecords_id` PRIMARY KEY(`id`)
);
