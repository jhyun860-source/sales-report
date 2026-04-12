import mysql from 'mysql2/promise';
import 'dotenv/config';

async function migrate() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // dailySalesRecords 테이블 생성
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`dailySalesRecords\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`branchId\` int NOT NULL,
      \`date\` varchar(10) NOT NULL,
      \`posStartAmount\` decimal(15,0) NOT NULL DEFAULT 0,
      \`cash\` decimal(15,0) NOT NULL DEFAULT 0,
      \`card\` decimal(15,0) NOT NULL DEFAULT 0,
      \`cashTotal\` decimal(15,0) NOT NULL DEFAULT 0,
      \`cardTotal\` decimal(15,0) NOT NULL DEFAULT 0,
      \`posEndAmount\` decimal(15,0) NOT NULL DEFAULT 0,
      \`paymentChangeNote\` text,
      \`paymentChangeDate\` varchar(10),
      \`paymentChangeAmount\` decimal(15,0) NOT NULL DEFAULT 0,
      \`expenses\` json NOT NULL,
      \`submittedBy\` int,
      \`submittedAt\` timestamp NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`dailySalesRecords_id\` PRIMARY KEY(\`id\`)
    )
  `);
  console.log('dailySalesRecords table OK');
  
  // pushSubscriptions 테이블 생성
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`pushSubscriptions\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`userId\` int NOT NULL,
      \`endpoint\` text NOT NULL,
      \`p256dh\` text NOT NULL,
      \`auth\` text NOT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT \`pushSubscriptions_id\` PRIMARY KEY(\`id\`)
    )
  `);
  console.log('pushSubscriptions table OK');

  // storeAccounts 테이블 생성
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`storeAccounts\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`loginId\` varchar(50) NOT NULL,
      \`passwordHash\` varchar(255) NOT NULL,
      \`branchId\` int,
      \`role\` enum('user','admin') NOT NULL DEFAULT 'user',
      \`displayName\` varchar(100),
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`storeAccounts_id\` PRIMARY KEY(\`id\`),
      CONSTRAINT \`storeAccounts_loginId_unique\` UNIQUE(\`loginId\`)
    )
  `);
  console.log('storeAccounts table OK');
  
  const [rows] = await conn.execute('SHOW TABLES');
  console.log('All tables:', rows.map(r => Object.values(r)[0]));
  await conn.end();
}

migrate().catch(console.error);
