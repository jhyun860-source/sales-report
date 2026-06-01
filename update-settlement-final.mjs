import { getDb } from './server/db.ts';
import { calculateDailySettlement, getStaffCounts } from './server/_core/settlementCalculations.ts';
import { eq } from 'drizzle-orm';
import { dailySalesRecords, branches, tableReports } from './drizzle/schema.ts';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB 연결 실패');
      process.exit(1);
    }

    // 1. branchId=5 (문정2호점) 확인
    const branchResult = await db.select().from(branches).where(eq(branches.id, 5));
    if (branchResult.length === 0) {
      console.error('지점을 찾을 수 없습니다: branchId=5');
      process.exit(1);
    }
    const branch = branchResult[0];
    console.log(`✓ 지점 찾음: ${branch.name} (ID: ${branch.id})`);

    // 2. 2026-05-01 dailySalesRecords 찾기
    const recordResult = await db.select().from(dailySalesRecords)
      .where(eq(dailySalesRecords.branchId, 5))
      .where(eq(dailySalesRecords.date, '2026-05-01'));
    
    if (recordResult.length === 0) {
      console.error(`레코드를 찾을 수 없습니다: branchId=5 2026-05-01`);
      process.exit(1);
    }
    
    const record = recordResult[0];
    console.log(`✓ 레코드 찾음: ${record.date}`);
    console.log('\n[업데이트 전 데이터]');
    console.log(JSON.stringify(record, null, 2));

    // 3. tableReportId 찾기
    let tableReportId = null;
    const tableReportResult = await db.select().from(tableReports)
      .where(eq(tableReports.branchId, 5))
      .where(eq(tableReports.date, '2026-05-01'));
    if (tableReportResult.length > 0) {
      tableReportId = tableReportResult[0].id;
      console.log(`\n✓ tableReportId 찾음: ${tableReportId}`);
    }

    // 4. 직원 수 조회
    const { staffCount, partTimeCount } = tableReportId 
      ? await getStaffCounts(tableReportId)
      : { staffCount: 0, partTimeCount: 0 };

    console.log(`\n[직원 정보]`);
    console.log(`정직원: ${staffCount}, 알바: ${partTimeCount}`);

    // 5. 정산 계산
    const cash = Number(record.cash || 0);
    const card = Number(record.card || 0);
    const expenses = Array.isArray(record.expenses) ? record.expenses : [];

    console.log(`\n[매출 정보]`);
    console.log(`현금: ${cash}, 카드: ${card}, 기타비용: ${expenses.length}개`);

    const settlement = await calculateDailySettlement(
      5,
      '2026-05-01',
      cash,
      card,
      staffCount,
      partTimeCount,
      expenses,
      tableReportId
    );
    
    console.log('\n[계산된 정산 데이터]');
    console.log(JSON.stringify(settlement, null, 2));

    // 6. SQL로 직접 업데이트
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
        staffCount = ${staffCount},
        partTimeCount = ${partTimeCount},
        updatedAt = NOW()
      WHERE id = ${record.id}
    `;
    
    await db.execute(updateQuery);
    console.log('\n✓ DB 업데이트 완료');

    // 7. 업데이트된 레코드 조회
    const updatedResult = await db.select().from(dailySalesRecords)
      .where(eq(dailySalesRecords.id, record.id));
    
    const updatedRecord = updatedResult[0];
    console.log('\n[업데이트된 레코드 - 모든 컬럼]');
    console.log(JSON.stringify(updatedRecord, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('에러:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
