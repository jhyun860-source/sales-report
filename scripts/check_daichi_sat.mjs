import mysql from 'mysql2/promise';
import { config } from 'dotenv';
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 대치점 branchId 확인
const [branches] = await conn.execute(`SELECT id, name FROM branches`);
const daichi = branches.find(b => b.name === '대치점');
const branchId = daichi?.id;
console.log('대치점 id:', branchId);

// 대치점 토요일 dailySalesRecords
const [salesRows] = await conn.execute(`
  SELECT id, date, cash, card, cashTotal, cardTotal
  FROM dailySalesRecords
  WHERE branchId = ? AND DAYOFWEEK(date) = 7
  ORDER BY date DESC
  LIMIT 5
`, [branchId]);

console.log('\n=== 대치점 토요일 매출보고 (dailySalesRecords) ===');
for (const r of salesRows) {
  const total = (Number(r.cash)||0) + (Number(r.card)||0);
  console.log(`${r.date} | 현금:${r.cash} 카드:${r.card} | 일매출합계:${total}`);
}

// 대치점 토요일 tableReports + tableItems 합산
const [tableReportRows] = await conn.execute(`
  SELECT tr.id, tr.date, tr.cashAmount, tr.cardAmount,
         SUM(ti.amount) as itemTotal,
         SUM(CASE WHEN ti.paymentMethod='cash' THEN ti.amount ELSE 0 END) as itemCash,
         SUM(CASE WHEN ti.paymentMethod='card' THEN ti.amount ELSE 0 END) as itemCard,
         COUNT(ti.id) as itemCount
  FROM tableReports tr
  LEFT JOIN tableItems ti ON ti.tableReportId = tr.id
  WHERE tr.branchId = ? AND DAYOFWEEK(tr.date) = 7
  GROUP BY tr.id, tr.date, tr.cashAmount, tr.cardAmount
  ORDER BY tr.date DESC
  LIMIT 5
`, [branchId]);

console.log('\n=== 대치점 토요일 테이블 기록 (tableReports + tableItems) ===');
for (const r of tableReportRows) {
  const reportTotal = (Number(r.cashAmount)||0) + (Number(r.cardAmount)||0);
  const itemTotal = Number(r.itemTotal)||0;
  console.log(`${r.date} | cashAmount:${r.cashAmount} cardAmount:${r.cardAmount} | reportTotal:${reportTotal} | itemTotal:${itemTotal} (${r.itemCount}건)`);
}

// 비교
console.log('\n=== 비교 (매출보고 일매출 vs 테이블 기록 합계) ===');
for (const s of salesRows) {
  const t = tableReportRows.find(r => String(r.date).slice(0,10) === s.date);
  if (t) {
    const salesTotal = (Number(s.cash)||0) + (Number(s.card)||0);
    const tableItemTotal = Number(t.itemTotal)||0;
    const tableReportTotal = (Number(t.cashAmount)||0) + (Number(t.cardAmount)||0);
    console.log(`${s.date}`);
    console.log(`  매출보고(현금+카드): ${salesTotal}`);
    console.log(`  테이블기록 itemTotal: ${tableItemTotal}`);
    console.log(`  테이블기록 cashAmount+cardAmount: ${tableReportTotal}`);
    console.log(`  차이(매출보고 - itemTotal): ${salesTotal - tableItemTotal}`);
  }
}

// 가장 최근 토요일 tableItems 상세
if (tableReportRows.length > 0) {
  const latestReport = tableReportRows[0];
  const [items] = await conn.execute(`
    SELECT id, tableNumber, amount, paymentMethod, memo, guestType
    FROM tableItems
    WHERE tableReportId = ?
    ORDER BY sortOrder, id
  `, [latestReport.id]);
  console.log(`\n=== ${latestReport.date} 테이블 기록 상세 (${items.length}건, reportId:${latestReport.id}) ===`);
  let cashSum = 0, cardSum = 0;
  for (const item of items) {
    console.log(`  테이블${item.tableNumber} | ${item.paymentMethod} | ${item.amount}원 | ${item.guestType} | ${item.memo?.slice(0,30)}`);
    if (item.paymentMethod === 'cash') cashSum += Number(item.amount);
    else cardSum += Number(item.amount);
  }
  console.log(`  합계 - 현금:${cashSum} 카드:${cardSum} 총:${cashSum+cardSum}`);
}

await conn.end();
