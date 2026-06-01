import { getDb } from './server/db.ts';
import { calculateDailySettlement, getStaffCounts } from './server/_core/settlementCalculations.ts';
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

    // 1. ID=2040001 레코드 조회
    const recordResult = await db.select().from(dailySalesRecords)
      .where(eq(dailySalesRecords.id, 2040001));
    
    if (recordResult.length === 0) {
      console.error('레코드를 찾을 수 없습니다: ID=2040001');
      process.exit(1);
    }
    
    const record = recordResult[0];
    console.log(`✓ 레코드 찾음: ID=${record.id}, branchId=${record.branchId}, date=${record.date}`);
    console.log('\n[업데이트 전 데이터]');
    console.log(JSON.stringify(record, null, 2));

    // 2. tableReportId 찾기
    let tableReportId = null;
    const tableReportResult = await db.select().from(tableReports)
      .where(eq(tableReports.branchId, record.branchId))
      .where(eq(tableReports.date, record.date));
    if (tableReportResult.length > 0) {
      tableReportId = tableReportResult[0].id;
      console.log(`\n✓ tableReportId 찾음: ${tableReportId}`);
    }

    // 3. 직원 수 조회
    const { staffCount, partTimeCount } = tableReportId 
      ? await getStaffCounts(tableReportId)
      : { staffCount: 0, partTimeCount: 0 };

    console.log(`\n[직원 정보]`);
    console.log(`정직원: ${staffCount}, 알바: ${partTimeCount}`);

    // 4. 정산 계산
    const cash = Number(record.cash || 0);
    const card = Number(record.card || 0);
    const expenses = Array.isArray(record.expenses) ? record.expenses : [];

    console.log(`\n[매출 정보]`);
    console.log(`현금: ${cash}, 카드: ${card}, 기타비용: ${expenses.length}개`);

    const settlement = await calculateDailySettlement(
      record.branchId,
      record.date,
      cash,
      card,
      staffCount,
      partTimeCount,
      expenses,
      tableReportId
    );
    
    console.log('\n[계산된 정산 데이터]');
    console.log(JSON.stringify(settlement, null, 2));

    // 5. SQL로 직접 업데이트
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

    // 6. 업데이트된 레코드 조회 (정산 컬럼만)
    console.log('\n[업데이트된 정산 컬럼 값]');
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
