/**
 * cascadeUpdateCumulativeAmounts 실제 동작 검증
 * 선릉점(branchId=1) 4월 1일 기준으로 cascadeUpdate 실행 후 결과 확인
 */
import { drizzle } from 'drizzle-orm/mysql2';
import { dailySalesRecords } from '../drizzle/schema.ts';
import { eq, and, gte, lt, gt } from 'drizzle-orm';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);

async function computeCumulative(branchId, date, todayCash, todayCard) {
  const isFirstOfMonth = date.endsWith('-01');
  const dateObj = new Date(date + 'T12:00:00');
  const isSunday = dateObj.getDay() === 0;

  if (isFirstOfMonth) {
    return { cashTotal: isSunday ? 0 : todayCash, cardTotal: isSunday ? 0 : todayCard };
  }

  const [year, month] = date.split('-');
  const monthStart = `${year}-${month}-01`;

  const allPrevRecords = await db
    .select()
    .from(dailySalesRecords)
    .where(and(
      eq(dailySalesRecords.branchId, branchId),
      gte(dailySalesRecords.date, monthStart),
      lt(dailySalesRecords.date, date)
    ))
    .orderBy(dailySalesRecords.date);

  let baseCashTotal = 0;
  let baseCardTotal = 0;

  for (const r of allPrevRecords) {
    const rDateObj = new Date(r.date + 'T12:00:00');
    const rIsSunday = rDateObj.getDay() === 0;
    if (r.date === monthStart) {
      baseCashTotal = rIsSunday ? 0 : (parseInt(r.cash || '0') || 0);
      baseCardTotal = rIsSunday ? 0 : (parseInt(r.card || '0') || 0);
    } else if (!rIsSunday) {
      baseCashTotal += parseInt(r.cash || '0') || 0;
      baseCardTotal += parseInt(r.card || '0') || 0;
    }
  }

  if (isSunday) {
    return { cashTotal: baseCashTotal, cardTotal: baseCardTotal };
  }
  return { cashTotal: baseCashTotal + todayCash, cardTotal: baseCardTotal + todayCard };
}

// 현재 DB 상태 출력
console.log('=== 현재 선릉점 4월 데이터 ===');
const rows = await db.select().from(dailySalesRecords)
  .where(and(
    eq(dailySalesRecords.branchId, 1),
    gte(dailySalesRecords.date, '2026-04-01'),
    lt(dailySalesRecords.date, '2026-05-01')
  ))
  .orderBy(dailySalesRecords.date);

console.log('날짜        | cash      | card      | cashTotal  | cardTotal  | 예상cashTotal | 예상cardTotal | 일치?');
console.log('------------|-----------|-----------|------------|------------|--------------|--------------|------');

for (const r of rows) {
  const todayCash = parseInt(r.cash || '0') || 0;
  const todayCard = parseInt(r.card || '0') || 0;
  const { cashTotal: expectedCash, cardTotal: expectedCard } = await computeCumulative(1, r.date, todayCash, todayCard);
  const match = String(expectedCash) === r.cashTotal && String(expectedCard) === r.cardTotal ? '✓' : '✗ 불일치';
  console.log(`${r.date} | ${String(r.cash).padStart(9)} | ${String(r.card).padStart(9)} | ${String(r.cashTotal).padStart(10)} | ${String(r.cardTotal).padStart(10)} | ${String(expectedCash).padStart(12)} | ${String(expectedCard).padStart(12)} | ${match}`);
}

process.exit(0);
