import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB 연결 실패');
      process.exit(1);
    }

    console.log('SQL SELECT로 레코드 조회 중...\n');
    
    // 직접 SQL로 조회
    const result = await db.execute(sql.raw(`
      SELECT 
        id, branchId, date, posStartAmount, cash, card, cashTotal, cardTotal, 
        posEndAmount, cashDeposit, paymentChangeAmount, 
        totalRevenue, commissionExpense, rentExpense, managementFeeExpense,
        staffWageExpense, managerWageExpense, partTimeWageExpense,
        liquorCostExpense, staffDrinkExpense, otherExpense,
        totalExpenses, netProfit, staffCount, partTimeCount,
        updatedAt
      FROM dailySalesRecords 
      WHERE id = 1980001
    `));
    
    const rows = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : result;
    console.log('[업데이트된 레코드 - SQL SELECT]');
    if (Array.isArray(rows) && rows.length > 0) {
      console.log(JSON.stringify(rows[0], null, 2));
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('에러:', error.message);
    process.exit(1);
  }
}

main();
