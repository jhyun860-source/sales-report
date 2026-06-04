CREATE TABLE `branchSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`branchId` int NOT NULL,
	`monthlyRent` decimal(15,0) NOT NULL DEFAULT '0',
	`dailyRentExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`managerMonthlySalary` decimal(15,0) NOT NULL DEFAULT '0',
	`managerDailyWage` decimal(15,0) NOT NULL DEFAULT '0',
	`staffDailyWage` decimal(15,0) NOT NULL DEFAULT '0',
	`partTimeHourlyWage` decimal(15,0) NOT NULL DEFAULT '0',
	`deputyMonthlySalary` decimal(15,0) NOT NULL DEFAULT '0',
	`deputyDailyWage` decimal(15,0) NOT NULL DEFAULT '0',
	`monthlyFixedExpense` decimal(15,0) NOT NULL DEFAULT '0',
	`commissionRate` decimal(5,4) NOT NULL DEFAULT '0.1700',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `branchSettings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `staffIncentives` MODIFY COLUMN `staffType` enum('staff','parttime','manager','deputy') NOT NULL DEFAULT 'staff';--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `totalRevenue` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `commissionExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `rentExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `managementFeeExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `staffWageExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `managerWageExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `partTimeWageExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `liquorCostExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `staffDrinkExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `salesIncentiveExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `otherExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `totalExpenses` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `netProfit` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `staffCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `partTimeCount` int DEFAULT 0 NOT NULL;