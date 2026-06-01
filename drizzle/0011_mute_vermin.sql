ALTER TABLE `dailySalesRecords` ADD `totalRevenue` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `commissionExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `rentExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `managementFeeExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `staffWageExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `managerWageExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `partTimeWageExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `liquorCostExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `staffDrinkExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `otherExpense` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `totalExpenses` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `netProfit` decimal(15,0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `staffCount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `dailySalesRecords` ADD `partTimeCount` int DEFAULT 0 NOT NULL;