import mysql from 'mysql2/promise';
import { calculateDailySettlement } from './server/_core/settlementCalculations.ts';

// DATABASE_URL 파싱
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// mysql://user:password@host:port/database?ssl=...
const urlObj = new URL(dbUrl);
const host = urlObj.hostname;
const port = urlObj.port || 4000;
const user = urlObj.username;
const password = urlObj.password;
const database = urlObj.pathname.slice(1);

console.log(`\n데이터베이스 연결 정보:`);
console.log(`  Host: ${host}:${port}`);
console.log(`  Database: ${database}`);
console.log(`  User: ${user}\n`);

const connection = await mysql.createConnection({
  host,
  port,
  user,
  password,
  database,
  ssl: {
    rejectUnauthorized: false,
  },
  waitForConnections: true,
  connectionLimit: 1,
  queueLimit: 0,
});

try {
  // 문정2호점(branchId=5) 2026년 5월 전체 레코드 조회
  const [records] = await connection.execute(
    `SELECT * FROM dailySalesRecords 
     WHERE branchId = 5 AND date LIKE '2026-05-%'
     ORDER BY date ASC`
  );

  console.log(`처리할 레코드: ${records.length}개\n`);

  let processedCount = 0;

  for (const record of records) {
    try {
      // expenses는 JSON 배열 문자열이므로 파싱 필요
      let expensesArray = [];
      if (record.expenses) {
        if (typeof record.expenses === 'string') {
          try {
            expensesArray = JSON.parse(record.expenses);
          } catch (e) {
            console.warn(`  경고: ${record.date} expenses 파싱 실패, 빈 배열로 처리`);
            expensesArray = [];
          }
        } else if (Array.isArray(record.expenses)) {
          expensesArray = record.expenses;
        }
      }

      // calculateDailySettlement 함수로 정산 계산
      const settlement = await calculateDailySettlement(
        record.branchId,
        record.date,
        parseInt(record.cash) || 0,
        parseInt(record.card) || 0,
        parseInt(record.staffCount) || 0,
        parseInt(record.partTimeCount) || 0,
        expensesArray,
        null // tableReportId는 null로 설정
      );

      // DB 업데이트
      await connection.execute(
        `UPDATE dailySalesRecords SET
          totalRevenue = ?,
          commissionExpense = ?,
          rentExpense = ?,
          managementFeeExpense = ?,
          staffWageExpense = ?,
          partTimeWageExpense = ?,
          liquorCostExpense = ?,
          staffDrinkExpense = ?,
          otherExpense = ?,
          totalExpenses = ?,
          netProfit = ?,
          updatedAt = NOW()
         WHERE id = ?`,
        [
          settlement.totalRevenue,
          settlement.commissionExpense,
          settlement.rentExpense,
          settlement.managementFeeExpense,
          settlement.staffWageExpense,
          settlement.partTimeWageExpense,
          settlement.liquorCostExpense,
          settlement.staffDrinkExpense,
          settlement.otherExpense,
          settlement.totalExpenses,
          settlement.netProfit,
          record.id
        ]
      );

      processedCount++;
      console.log(`✓ ${record.date}: 정산 재계산 완료 (순수익: ${settlement.netProfit.toLocaleString()}원)`);
    } catch (error) {
      console.error(`✗ ${record.date}: 오류 - ${error.message}`);
    }
  }

  console.log(`\n=== 처리 완료 ===`);
  console.log(`총 처리된 레코드: ${processedCount}개\n`);

} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
