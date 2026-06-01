import { getDb } from './server/db.ts';
import { calculateDailySettlement } from './server/_core/settlementCalculations.ts';
import { eq } from 'drizzle-orm';
import { dailySalesRecords, tableReports } from './drizzle/schema.ts';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB 연결 실패');
      process.exit(1);
    }

    // 1. 문정2호점 5/1 tableReport ID 확인
    console.log('[1단계] tableReport ID 확인\n');
    const tableReportResult = await db.execute(sql.raw(`
      SELECT id FROM tableReports WHERE branchId = 5 AND date = '2026-05-01'
    `));
    
    const tableReportRows = Array.isArray(tableReportResult) ? (Array.isArray(tableReportResult[0]) ? tableReportResult[0] : tableReportResult) : tableReportResult;
    console.log(JSON.stringify(tableReportRows, null, 2));
    
    // 2. ID=2040001 레코드 조회
    console.log('\n[2단계] ID=2040001 레코드 조회\n');
    const recordResult = await db.select().from(dailySalesRecords)
      .where(eq(dailySalesRecords.id, 2040001));
    
    if (recordResult.length === 0) {
      console.error('레코드를 찾을 수 없습니다: ID=2040001');
      process.exit(1);
    }
    
    const record = recordResult[0];
    console.log(`✓ 레코드 찾음: ID=${record.id}, branchId=${record.branchId}, date=${record.date}`);

    // 3. tableReportId=null로 정산 재계산
    console.log('\n[3단계] tableReportId=null로 정산 재계산\n');
    const cash = Number(record.cash || 0);
    const card = Number(record.card || 0);
    const expenses = Array.isArray(record.expenses) ? record.expenses : [];

    console.log(`매출 정보: 현금=${cash}, 카드=${card}, 기타비용=${expenses.length}개`);

    const settlement = await calculateDailySettlement(
      record.branchId,
      record.date,
      cash,
      card,
      0,  // staffCount = 0
      0,  // partTimeCount = 0
      expenses,
      null  // tableReportId = null (staffIncentives 데이터 없음)
    );
    
    console.log('\n[계산된 정산 데이터]');
    console.log(JSON.stringify(settlement, null, 2));

    // 4. DB 업데이트
    console.log('\n[4단계] DB 업데이트\n');
    const updateQuery = sql`
      UPDATE dailySalesRecords 
      SET 
        totalRevenue = ${settlement.totalRevenue},
        commissionExpense = ${settlement.commissionExpense},
        rentExpense = ${settlement.rentExpense},
        managementFeeExpense = ${settlement.managementFeeExpense},
        staffWageExpense = ${settlement.staffWageExpense},
        managerWageExpense = ${settlement.managerWageExpense},
        partTimeWageExpense = ${settlement.partTimeWageExpense},
        liquorCostExpense = ${settlement.liquorCostExpense},
        staffDrinkExpense = ${settlement.staffDrinkExpense},
        otherExpense = ${settlement.otherExpense},
        totalExpenses = ${settlement.totalExpenses},
        netProfit = ${settlement.netProfit},
        staffCount = 0,
        partTimeCount = 0,
        updatedAt = NOW()
      WHERE id = ${record.id}
    `;
    
    await db.execute(updateQuery);
    console.log('✓ DB 업데이트 완료');

    // 5. 업데이트된 레코드 조회
    console.log('\n[5단계] 업데이트된 정산 컬럼 값\n');
    const verifyResult = await db.execute(sql.raw(`
      SELECT 
        id, branchId, date, cash, card,
        totalRevenue, commissionExpense, rentExpense, managementFeeExpense,
        staffWageExpense, managerWageExpense, partTimeWageExpense,
        liquorCostExpense, staffDrinkExpense, otherExpense,
        totalExpenses, netProfit, staffCount, partTimeCount,
        updatedAt
      FROM dailySalesRecords 
      WHERE id = 2040001
    `));
    
    const rows = Array.isArray(verifyResult) ? (Array.isArray(verifyResult[0]) ? verifyResult[0] : verifyResult) : verifyResult;
    if (Array.isArray(rows) && rows.length > 0) {
      console.log(JSON.stringify(rows[0], null, 2));
    } else {
      console.log(JSON.stringify(rows, null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error('에러:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
