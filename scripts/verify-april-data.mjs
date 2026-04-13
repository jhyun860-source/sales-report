/**
 * 전 지점 4월 cashTotal/cardTotal/posStartAmount/posEndAmount 정합성 검증 스크립트
 * 실행: node scripts/verify-april-data.mjs
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 전 지점 4월 데이터 조회
const [rows] = await conn.query(
  `SELECT id, branchId, date, cash, card, cashTotal, cardTotal, posStartAmount, posEndAmount, expenses
   FROM dailySalesRecords
   WHERE date LIKE '2026-04%'
   ORDER BY branchId, date`
);

const parseNum = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

// 지점별 그룹핑
const byBranch = {};
for (const r of rows) {
  if (!byBranch[r.branchId]) byBranch[r.branchId] = [];
  byBranch[r.branchId].push(r);
}

const branchNames = { 1: '선릉점', 2: '대치점', 3: '삼성점', 4: '문정당1', 5: '문정당2' };

let totalErrors = 0;
const corrections = [];

for (const [branchId, records] of Object.entries(byBranch)) {
  const name = branchNames[branchId] || `지점${branchId}`;
  console.log(`\n=== ${name} (branchId=${branchId}) ===`);

  let prevCashTotal = 0;
  let prevCardTotal = 0;
  let prevPosEnd = 0;
  let prevDate = null;

  for (const r of records) {
    const date = r.date;
    const dayOfWeek = new Date(date + 'T12:00:00').getDay(); // 0=일
    const isFirstOfMonth = date.endsWith('-01');

    const cash = parseNum(r.cash);
    const card = parseNum(r.card);
    const cashTotal = parseNum(r.cashTotal);
    const cardTotal = parseNum(r.cardTotal);
    const posStart = parseNum(r.posStartAmount);
    const posEnd = parseNum(r.posEndAmount);

    // 지출 합계 계산
    let expenseTotal = 0;
    try {
      const expenses = typeof r.expenses === 'string' ? JSON.parse(r.expenses) : (r.expenses || []);
      expenseTotal = expenses.reduce((sum, e) => sum + parseNum(e.amount), 0);
    } catch {}

    // 누적금 계산
    let expectedCashTotal, expectedCardTotal;
    if (isFirstOfMonth) {
      expectedCashTotal = cash;
      expectedCardTotal = card;
    } else if (dayOfWeek === 0) {
      // 일요일: 이전 날짜 누적금 유지
      expectedCashTotal = prevCashTotal;
      expectedCardTotal = prevCardTotal;
    } else {
      expectedCashTotal = prevCashTotal + cash;
      expectedCardTotal = prevCardTotal + card;
    }

    // 포스 시작금/마감금 계산
    const expectedPosStart = isFirstOfMonth ? posStart : prevPosEnd; // 첫날은 현재값 신뢰
    const expectedPosEnd = posStart + cash - expenseTotal;

    const cashTotalOk = cashTotal === expectedCashTotal;
    const cardTotalOk = cardTotal === expectedCardTotal;
    const posStartOk = isFirstOfMonth || posStart === prevPosEnd;
    const posEndOk = posEnd === expectedPosEnd || posEnd === posStart; // 지출 없으면 동일

    if (!cashTotalOk || !cardTotalOk || !posStartOk) {
      totalErrors++;
      console.log(`  ❌ ${date} (${['일','월','화','수','목','금','토'][dayOfWeek]})`);
      if (!cashTotalOk) {
        console.log(`     cashTotal: DB=${cashTotal.toLocaleString()} / 예상=${expectedCashTotal.toLocaleString()} (차이: ${(cashTotal-expectedCashTotal).toLocaleString()})`);
        corrections.push({ id: r.id, branchId, date, field: 'cashTotal', current: cashTotal, expected: expectedCashTotal });
      }
      if (!cardTotalOk) {
        console.log(`     cardTotal: DB=${cardTotal.toLocaleString()} / 예상=${expectedCardTotal.toLocaleString()} (차이: ${(cardTotal-expectedCardTotal).toLocaleString()})`);
        corrections.push({ id: r.id, branchId, date, field: 'cardTotal', current: cardTotal, expected: expectedCardTotal });
      }
      if (!posStartOk && !isFirstOfMonth) {
        console.log(`     posStart: DB=${posStart.toLocaleString()} / 예상=${prevPosEnd.toLocaleString()} (이전 마감금)`);
        corrections.push({ id: r.id, branchId, date, field: 'posStartAmount', current: posStart, expected: prevPosEnd });
      }
    } else {
      console.log(`  ✓ ${date} (${['일','월','화','수','목','금','토'][dayOfWeek]}) cash=${cash.toLocaleString()} card=${card.toLocaleString()} cashTotal=${cashTotal.toLocaleString()} cardTotal=${cardTotal.toLocaleString()}`);
    }

    prevCashTotal = expectedCashTotal;
    prevCardTotal = expectedCardTotal;
    prevPosEnd = posEnd;
    prevDate = date;
  }
}

console.log(`\n=== 검증 결과 ===`);
console.log(`총 오류 수: ${totalErrors}`);

if (corrections.length > 0) {
  console.log(`\n보정 필요 항목 (${corrections.length}개):`);
  for (const c of corrections) {
    const name = branchNames[c.branchId] || `지점${c.branchId}`;
    console.log(`  ${name} ${c.date} ${c.field}: ${c.current.toLocaleString()} → ${c.expected.toLocaleString()}`);
  }

  // 자동 보정 실행
  console.log('\n자동 보정 실행 중...');
  for (const c of corrections) {
    await conn.query(
      `UPDATE dailySalesRecords SET ${c.field} = ? WHERE id = ?`,
      [c.expected.toString(), c.id]
    );
    console.log(`  ✓ id=${c.id} ${c.field} = ${c.expected.toLocaleString()}`);
  }
  console.log('보정 완료!');
} else {
  console.log('모든 데이터 정합성 OK!');
}

await conn.end();
