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
CREATE TABLE `branchSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`monthlyRent` decimal(15,0) NOT NULL DEFAULT '0',
	`dailyRentExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`managerMonthlySalary` decimal(15,0) NOT NULL DEFAULT '0',
	`managerDailyWage` decimal(15,0) NOT NULL DEFAULT '0',
	`staffMonthlySalary` decimal(15,0) NOT NULL DEFAULT '0',
	`staffDailyWage` decimal(15,0) NOT NULL DEFAULT '0',
	`partTimeHourlyWage` decimal(15,0) NOT NULL DEFAULT '0',
	`deputyMonthlySalary` decimal(15,0) NOT NULL DEFAULT '0',
	`deputyDailyWage` decimal(15,0) NOT NULL DEFAULT '0',
	`monthlyFixedExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`commissionRate` decimal(5,4) NOT NULL DEFAULT '0.1700',
	`workType` enum('MON_FRI','MON_SAT') NOT NULL DEFAULT 'MON_FRI',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branchSettings_id` PRIMARY KEY(`id`)
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
	`cashDeposit` decimal(15,0) NOT NULL DEFAULT '0',
	`paymentChangeNote` text,
	`paymentChangeDate` varchar(10),
	`paymentChangeAmount` decimal(15,0) NOT NULL DEFAULT '0',
	`expenses` json NOT NULL DEFAULT ('[]'),
	`submittedBy` int,
	`submittedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`totalRevenue` decimal(15,0) NOT NULL DEFAULT '0',
	`commissionExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`rentExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`managementFeeExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`staffWageExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`managerWageExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`partTimeWageExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`liquorCostExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`staffDrinkExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`salesIncentiveExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`otherExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`totalExpenses` decimal(15,0) NOT NULL DEFAULT '0',
	`netProfit` decimal(15,0) NOT NULL DEFAULT '0',
	`staffCount` int NOT NULL DEFAULT 0,
	`partTimeCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `dailySalesRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `liquorHiddenItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`liquorItemId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `liquorHiddenItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `pushSubscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pushSubscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staffIncentives` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableReportId` int NOT NULL,
	`staffName` varchar(50) NOT NULL,
	`glassCount` int NOT NULL DEFAULT 0,
	`bottleCount` int NOT NULL DEFAULT 0,
	`beerBottleCount` int NOT NULL DEFAULT 0,
	`salesIncentive` decimal(15,0) NOT NULL DEFAULT '0',
	`staffType` enum('staff','parttime','manager','deputy') NOT NULL DEFAULT 'staff',
	`workStart` varchar(5),
	`workEnd` varchar(5),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `staffIncentives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `storeAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`loginId` varchar(50) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`branchId` int,
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`displayName` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `storeAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `storeAccounts_loginId_unique` UNIQUE(`loginId`)
);
--> statement-breakpoint
CREATE TABLE `tableItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tableReportId` int NOT NULL,
	`tableNumber` varchar(20) NOT NULL,
	`guestType` enum('walking','regular','named') NOT NULL DEFAULT 'walking',
	`guestName` varchar(100),
	`amount` decimal(15,0) NOT NULL DEFAULT '0',
	`paymentMethod` enum('card','cash') NOT NULL DEFAULT 'card',
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
	`cashAmount` decimal(15,0) NOT NULL DEFAULT '0',
	`cardAmount` decimal(15,0) NOT NULL DEFAULT '0',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tableReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
