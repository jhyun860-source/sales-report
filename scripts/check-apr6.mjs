import { drizzle } from 'drizzle-orm/mysql2';
import { dailySalesRecords } from '../drizzle/schema.ts';
import { eq, and, between } from 'drizzle-orm';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);
const rows = await db.select().from(dailySalesRecords)
  .where(and(
    eq(dailySalesRecords.branchId, 1),
    between(dailySalesRecords.date, '2026-04-04', '2026-04-10')
  ))
  .orderBy(dailySalesRecords.date);

console.log('날짜        | cash      | card      | cashTotal  | cardTotal');
console.log('------------|-----------|-----------|------------|----------');
for (const r of rows) {
  console.log(`${r.date} | ${String(r.cash).padStart(9)} | ${String(r.card).padStart(9)} | ${String(r.cashTotal).padStart(10)} | ${String(r.cardTotal).padStart(10)}`);
}
process.exit(0);
