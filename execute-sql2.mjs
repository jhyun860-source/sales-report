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
    
    // 각 컬럼을 개별적으로 추가
    const columns = [
      'totalRevenue DECIMAL(15,0) DEFAULT 0',
      'commissionExpense DECIMAL(15,0) DEFAULT 0',
      'rentExpense DECIMAL(15,0) DEFAULT 0',
      'managementFeeExpense DECIMAL(15,0) DEFAULT 0',
      'staffWageExpense DECIMAL(15,0) DEFAULT 0',
      'managerWageExpense DECIMAL(15,0) DEFAULT 0',
      'partTimeWageExpense DECIMAL(15,0) DEFAULT 0',
      'liquorCostExpense DECIMAL(15,0) DEFAULT 0',
      'staffDrinkExpense DECIMAL(15,0) DEFAULT 0',
      'otherExpense DECIMAL(15,0) DEFAULT 0',
      'totalExpenses DECIMAL(15,0) DEFAULT 0',
      'netProfit DECIMAL(15,0) DEFAULT 0',
      'staffCount INT DEFAULT 0',
      'partTimeCount INT DEFAULT 0'
    ];

    for (const column of columns) {
      try {
        await db.execute(sql.raw(`ALTER TABLE dailySalesRecords ADD COLUMN ${column}`));
        console.log(`✓ ${column.split(' ')[0]} 추가 완료`);
      } catch (e) {
        if (e.message.includes('Duplicate column')) {
          console.log(`⚠ ${column.split(' ')[0]} 이미 존재`);
        } else {
          console.error(`✗ ${column.split(' ')[0]} 추가 실패:`, e.message);
        }
      }
    }
    
    console.log('\n✓ ALTER TABLE 완료\n');

    // DESCRIBE 실행
    console.log('DESCRIBE dailySalesRecords 실행 중...\n');
    const result = await db.execute(sql.raw('DESCRIBE dailySalesRecords'));
    
    // 결과 출력
    const rows = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : result;
    console.log('[dailySalesRecords 테이블 구조]');
    if (Array.isArray(rows)) {
      rows.forEach(row => {
        console.log(JSON.stringify(row));
      });
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
