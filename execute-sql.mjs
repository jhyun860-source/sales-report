import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB 연결 실패');
      process.exit(1);
    }

    console.log('ALTER TABLE 실행 중...');
    
    // ALTER TABLE 실행
    await db.execute(sql`
      ALTER TABLE dailySalesRecords
      ADD COLUMN totalRevenue DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN commissionExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN rentExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN managementFeeExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN staffWageExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN managerWageExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN partTimeWageExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN liquorCostExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN staffDrinkExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN otherExpense DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN totalExpenses DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN netProfit DECIMAL(15,0) DEFAULT 0,
      ADD COLUMN staffCount INT DEFAULT 0,
      ADD COLUMN partTimeCount INT DEFAULT 0
    `);
    
    console.log('✓ ALTER TABLE 완료\n');

    // DESCRIBE 실행
    console.log('DESCRIBE dailySalesRecords 실행 중...\n');
    const result = await db.execute(sql.raw('DESCRIBE dailySalesRecords'));
    
    // 결과 출력
    const rows = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : result;
    console.log('[dailySalesRecords 테이블 구조]');
    console.log(JSON.stringify(rows, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('에러:', error.message);
    process.exit(1);
  }
}

main();
