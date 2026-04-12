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
