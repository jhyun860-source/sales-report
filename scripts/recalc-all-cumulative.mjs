/**
 * 전 지점 4월 dailySalesRecords의 cashTotal/cardTotal을 전체 스캔 방식으로 일괄 재계산
 * 실행: npx tsx scripts/recalc-all-cumulative.mjs
 */
import { drizzle } from 'drizzle-orm/mysql2';
import { dailySalesRecords } from '../drizzle/schema.ts';
import { eq, and, gte, lt } from 'drizzle-orm';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);

// 해당 달 1일부터 해당 날짜 직전까지 모든 레코드를 스캔해 정확한 누적금 계산
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

// 전 지점 4월 전체 레코드 조회
const allRecords = await db
  .select()
  .from(dailySalesRecords)
  .where(and(
    gte(dailySalesRecords.date, '2026-04-01'),
    lt(dailySalesRecords.date, '2026-05-01')
  ))
  .orderBy(dailySalesRecords.branchId, dailySalesRecords.date);

console.log(`총 ${allRecords.length}개 레코드 재계산 시작...`);

let fixedCount = 0;
for (const rec of allRecords) {
  const todayCash = parseInt(rec.cash || '0') || 0;
  const todayCard = parseInt(rec.card || '0') || 0;

  const { cashTotal: newCashTotal, cardTotal: newCardTotal } = await computeCumulative(
    rec.branchId, rec.date, todayCash, todayCard
  );

  const oldCashTotal = rec.cashTotal;
  const oldCardTotal = rec.cardTotal;

  if (String(newCashTotal) !== oldCashTotal || String(newCardTotal) !== oldCardTotal) {
    await db
      .update(dailySalesRecords)
      .set({ cashTotal: String(newCashTotal), cardTotal: String(newCardTotal), updatedAt: new Date() })
      .where(eq(dailySalesRecords.id, rec.id));

    console.log(`[지점${rec.branchId}] ${rec.date} 보정: cashTotal ${oldCashTotal}→${newCashTotal}, cardTotal ${oldCardTotal}→${newCardTotal}`);
    fixedCount++;
  }
}

console.log(`\n완료: ${fixedCount}개 레코드 보정됨`);
process.exit(0);
