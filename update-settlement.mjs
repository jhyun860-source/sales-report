import { getDb } from './server/db.ts';
import { calculateDailySettlement, getStaffCounts } from './server/_core/settlementCalculations.ts';
import { eq } from 'drizzle-orm';
import { dailySalesRecords, branches, tableReports } from './drizzle/schema.ts';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB 연결 실패');
      process.exit(1);
    }

    // 1. 지점명 "문정2호점" 찾기
    const branchResult = await db.select().from(branches).where(eq(branches.name, '문정2호점'));
    if (branchResult.length === 0) {
      console.error('지점을 찾을 수 없습니다: 문정2호점');
      process.exit(1);
    }
    const branch = branchResult[0];
    console.log(`✓ 지점 찾음: ${branch.name} (ID: ${branch.id})`);

    // 2. 2026-05-01 dailySalesRecords 찾기
    const recordResult = await db.select().from(dailySalesRecords)
      .where(eq(dailySalesRecords.branchId, branch.id))
      .where(eq(dailySalesRecords.date, '2026-05-01'));
    
    if (recordResult.length === 0) {
      console.error(`레코드를 찾을 수 없습니다: ${branch.name} 2026-05-01`);
      process.exit(1);
    }
    
    const record = recordResult[0];
    console.log(`✓ 레코드 찾음: ${record.date}`);
    console.log('\n[업데이트 전 데이터]');
    console.log(JSON.stringify(record, null, 2));

    // 3. tableReportId 찾기 (같은 날짜)
    let tableReportId = null;
    const tableReportResult = await db.select().from(tableReports)
      .where(eq(tableReports.branchId, branch.id))
      .where(eq(tableReports.date, '2026-05-01'));
    if (tableReportResult.length > 0) {
      tableReportId = tableReportResult[0].id;
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

    const settlement = await calculateDailySettlement(
      branch.id,
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

    // 6. DB 업데이트
    await db.update(dailySalesRecords)
      .set(settlement)
      .where(eq(dailySalesRecords.id, record.id));
    
    console.log('\n✓ DB 업데이트 완료');

    // 7. 업데이트된 레코드 조회
    const updatedResult = await db.select().from(dailySalesRecords)
      .where(eq(dailySalesRecords.id, record.id));
    
    const updatedRecord = updatedResult[0];
    console.log('\n[업데이트된 데이터]');
    console.log(JSON.stringify(updatedRecord, null, 2));

    // 8. 숫자 필드만 출력
    console.log('\n[업데이트된 숫자 필드]');
    const numericFields = [
      'posStartAmount', 'cash', 'card', 'cashTotal', 'cardTotal', 'posEndAmount',
      'cashDeposit', 'paymentChangeAmount', 'totalRevenue', 'commissionExpense',
      'rentExpense', 'managementFeeExpense', 'staffWageExpense', 'managerWageExpense',
      'partTimeWageExpense', 'liquorCostExpense', 'staffDrinkExpense', 'otherExpense',
      'totalExpenses', 'netProfit'
    ];
    
    numericFields.forEach(field => {
      const value = updatedRecord[field];
      if (value !== undefined && value !== null) {
        console.log(`${field}: ${value}`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('에러:', error);
    process.exit(1);
  }
}

main();
