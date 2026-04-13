import { config } from 'dotenv';
config();
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, branchId, date, cash, card, cashTotal, cardTotal, posStartAmount, posEndAmount FROM dailySalesRecords WHERE date >= '2026-04-13' ORDER BY branchId, date"
);
console.log(JSON.stringify(rows, null, 2));
await conn.end();
process.exit(0);
