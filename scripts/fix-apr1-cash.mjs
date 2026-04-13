/**
 * 선릉점 4월 1일: cash=1500000(잘못 입력)을 card로 이동
 * cash: 1500000 → 0
 * card: 2454000 → 3954000
 * 이후 cascadeUpdate로 4월 2일~ 자동 재계산
 */
import { drizzle } from 'drizzle-orm/mysql2';
import { dailySalesRecords } from '../drizzle/schema.ts';
import { eq, and, gte, lt } from 'drizzle-orm';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);

// 1. 선릉점 4월 1일 수정
await db.update(dailySalesRecords)
  .set({ cash: '0', card: '3954000', cashTotal: '0', cardTotal: '3954000', updatedAt: new Date() })
  .where(and(eq(dailySalesRecords.branchId, 1), eq(dailySalesRecords.date, '2026-04-01')));

console.log('선릉점 4월 1일 수정 완료: cash=0, card=3954000');

// 2. 4월 2일 이후 전체 재계산 (computeCumulative 인라인)
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

  if (isSunday) return { cashTotal: baseCashTotal, cardTotal: baseCardTotal };
  return { cashTotal: baseCashTotal + todayCash, cardTotal: baseCardTotal + todayCard };
}

const futureRecords = await db
  .select()
  .from(dailySalesRecords)
  .where(and(
    eq(dailySalesRecords.branchId, 1),
    gte(dailySalesRecords.date, '2026-04-02'),
    lt(dailySalesRecords.date, '2026-05-01')
  ))
  .orderBy(dailySalesRecords.date);

for (const rec of futureRecords) {
  const todayCash = parseInt(rec.cash || '0') || 0;
  const todayCard = parseInt(rec.card || '0') || 0;
  const { cashTotal, cardTotal } = await computeCumulative(1, rec.date, todayCash, todayCard);

  await db.update(dailySalesRecords)
    .set({ cashTotal: String(cashTotal), cardTotal: String(cardTotal), updatedAt: new Date() })
    .where(eq(dailySalesRecords.id, rec.id));

  console.log(`${rec.date}: cashTotal=${cashTotal}, cardTotal=${cardTotal}`);
}

console.log('\n완료!');
process.exit(0);
