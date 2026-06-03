import { drizzle } from 'drizzle-orm/mysql2';
import { eq, and, gte, lte } from 'drizzle-orm';
import { dailySalesRecords, tableReports, staffIncentives, branches, branchSettings } from '../drizzle/schema.js';

const db = drizzle(process.env.DATABASE_URL);

/**
 * 영업일수 계산 (월~토, 일요일 제외)
 */
function getBusinessDaysInMonth(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let businessDays = 0;
  for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0) businessDays++;
  }
  return businessDays;
}

/**
 * 일별 임대료 계산
 */
function calculateDailyRent(monthlyRent, year, month) {
  const businessDays = getBusinessDaysInMonth(year, month);
  if (businessDays === 0) return 0;
  return Math.round(monthlyRent / businessDays);
}

/**
 * 직원 수 조회
 */
async function getStaffCounts(tableReportId) {
  if (!tableReportId) return { staffCount: 0, partTimeCount: 0, managerCount: 0, partTimeTotalHours: 0 };
  
  const incentives = await db.select().from(staffIncentives).where(eq(staffIncentives.tableReportId, tableReportId));
  const staffCount = incentives.filter(i => i.staffType === 'staff').length;
  const partTimeCount = incentives.filter(i => i.staffType === 'parttime').length;
  const managerCount = incentives.filter(i => i.staffType === 'manager' || i.staffType === 'deputy').length;

  let partTimeTotalHours = 0;
  for (const inc of incentives.filter(i => i.staffType === 'parttime')) {
    if (inc.workStart && inc.workEnd) {
      try {
        const [sh, sm] = (inc.workStart).split(':').map(Number);
        const [eh, em] = (inc.workEnd).split(':').map(Number);
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin <= startMin) endMin += 24 * 60;
        partTimeTotalHours += (endMin - startMin) / 60;
      } catch {}
    }
  }
  return { staffCount, partTimeCount, managerCount, partTimeTotalHours };
}

/**
 * 스탭음료 비용 계산
 */
async function calculateStaffDrinkExpense(tableReportId, branchName) {
  if (!tableReportId) return 0;

  const BRANCH_CONFIG = {
    '대치점': { glassUnitPrice: 5000, bottleUnitPrice: 10000, beerBottleUnitPrice: 3000 },
    '선릉점': { glassUnitPrice: 5000, bottleUnitPrice: 10000, beerBottleUnitPrice: 3000 },
    '삼성점': { glassUnitPrice: 5000, bottleUnitPrice: 10000, beerBottleUnitPrice: 3000 },
    '문정1호점': { glassUnitPrice: 5000, bottleUnitPrice: 10000, beerBottleUnitPrice: 3000 },
    '문정2호점': { glassUnitPrice: 5000, bottleUnitPrice: 10000, beerBottleUnitPrice: 3000 },
  };

  const config = BRANCH_CONFIG[branchName];
  const glassPrice = config?.glassUnitPrice ?? 5000;
  const bottlePrice = config?.bottleUnitPrice ?? 10000;
  const beerBottlePrice = config?.beerBottleUnitPrice ?? 3000;

  const incentives = await db.select().from(staffIncentives).where(eq(staffIncentives.tableReportId, tableReportId));
  let total = 0;
  incentives.forEach(inc => {
    total += (Number(inc.glassCount || 0) * glassPrice);
    total += (Number(inc.bottleCount || 0) * bottlePrice);
    total += (Number(inc.beerBottleCount || 0) * beerBottlePrice);
  });
  return total;
}

/**
 * 기타 비용 합계
 */
function calculateOtherExpenses(expenses) {
  if (!Array.isArray(expenses)) return 0;
  return expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
}

/**
 * 지점별 고정 설정값
 */
const BRANCH_CONFIG = {
  '대치점': {
    monthlyRent: 9000000,
    staffDailyWage: 136363,
    managerDailyWage: 272727,
    commissionRate: 0.17,
  },
  '선릉점': {
    monthlyRent: 6500000,
    staffDailyWage: 136363,
    managerDailyWage: 250000,
    commissionRate: 0.17,
  },
  '삼성점': {
    monthlyRent: 6500000,
    staffDailyWage: 159090,
    managerDailyWage: 181818,
    commissionRate: 0.17,
  },
  '문정1호점': {
    monthlyRent: 4500000,
    staffDailyWage: 136363,
    managerDailyWage: 204545,
    commissionRate: 0.17,
  },
  '문정2호점': {
    monthlyRent: 4500000,
    staffDailyWage: 136363,
    managerDailyWage: 181818,
    commissionRate: 0.17,
  },
};

/**
 * 일별 정산 결과 계산
 */
async function calculateDailySettlement(
  branchId,
  date,
  cash,
  card,
  staffCount,
  partTimeCount,
  expenses,
  tableReportId,
  managerCount = 0,
  partTimeTotalHours = 0
) {
  const zero = {
    totalRevenue: 0, commissionExpense: 0, rentExpense: 0,
    managementFeeExpense: 0, staffWageExpense: 0, managerWageExpense: 0,
    partTimeWageExpense: 0, liquorCostExpense: 0, staffDrinkExpense: 0,
    otherExpense: 0, totalExpenses: 0, netProfit: 0,
  };

  // 지점 이름 조회
  const branchData = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!branchData || branchData.length === 0) {
    console.log('[정산계산] 지점 없음 branchId:', branchId);
    return zero;
  }

  // branchSettings DB에서 설정값 읽기
  const bsDataResult = await db.select().from(branchSettings).where(eq(branchSettings.branchId, branchId)).limit(1);
  const bsData = bsDataResult && bsDataResult.length > 0 ? bsDataResult[0] : null;
  const branchName = branchData[0].name;
  const hardConfig = BRANCH_CONFIG[branchName];

  const [year, month] = date.split('-').map(Number);

  // 1. 총매출
  const totalRevenue = cash + card;

  // 2. 수수료/주방
  const commissionRate = bsData ? Number(bsData.commissionRate || 0.17) : (hardConfig?.commissionRate ?? 0.17);
  const commissionExpense = Math.round(totalRevenue * commissionRate);

  // 3. 임대료
  const monthlyRent = bsData ? Number(bsData.monthlyRent || 0) : (hardConfig?.monthlyRent ?? 0);
  const rentExpense = calculateDailyRent(monthlyRent, year, month);

  // 4. 관리비
  const managementFeeExpense = 0;

  // 5. 여직원 인건비
  const staffDailyWage = bsData ? Number(bsData.staffDailyWage || 0) : (hardConfig?.staffDailyWage ?? 0);
  const staffWageExpense = staffCount * staffDailyWage;

  // 6. 점장/매니저 인건비
  const managerDailyWage = bsData ? Number(bsData.managerDailyWage || 0) : (hardConfig?.managerDailyWage ?? 0);
  const managerWageExpense = managerCount * managerDailyWage;

  // 7. 알바 인건비
  const partTimeHourlyWage = bsData ? Number(bsData.partTimeHourlyWage || 0) : 9860;
  const partTimeWageExpense = partTimeTotalHours > 0
    ? Math.round(partTimeHourlyWage * partTimeTotalHours)
    : partTimeCount * partTimeHourlyWage * 8;

  // 8. 주류/단가
  const liquorCostExpense = 0;

  // 9. 스탭음료
  const staffDrinkExpense = tableReportId
    ? await calculateStaffDrinkExpense(tableReportId, branchName)
    : 0;

  // 10. 기타비용
  const monthlyFixedExpense = bsData ? Number(bsData.monthlyFixedExpense || 0) : 0;
  const dailyFixedExpense = monthlyFixedExpense > 0 ? calculateDailyRent(monthlyFixedExpense, year, month) : 0;
  const webExpense = calculateOtherExpenses(expenses);
  const otherExpense = dailyFixedExpense + webExpense;

  // 11. 총 지출
  const totalExpenses =
    commissionExpense + rentExpense + managementFeeExpense +
    staffWageExpense + managerWageExpense + partTimeWageExpense +
    liquorCostExpense + staffDrinkExpense + otherExpense;

  // 12. 순수익
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalRevenue, commissionExpense, rentExpense, managementFeeExpense,
    staffWageExpense, managerWageExpense, partTimeWageExpense,
    liquorCostExpense, staffDrinkExpense, otherExpense, totalExpenses, netProfit,
  };
}

/**
 * 메인 실행
 */
async function main() {
  const branchIds = [1, 2, 3, 4]; // 선릉, 대치, 삼성, 문정1호
  const year = 2026;
  const month = 5;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

  console.log('🔄 5월 정산 재계산 시작...');
  console.log(`대상: 지점 ${branchIds.join(', ')}, 기간: ${startDate} ~ ${endDate}`);
  console.log('');

  const updateCounts = {};
  branchIds.forEach(id => { updateCounts[id] = 0; });

  for (const branchId of branchIds) {
    const records = await db.select().from(dailySalesRecords).where(
      and(
        eq(dailySalesRecords.branchId, branchId),
        gte(dailySalesRecords.date, startDate),
        lte(dailySalesRecords.date, endDate)
      )
    );

    console.log(`📊 지점 ${branchId}: ${records.length}건 발견`);

    for (const record of records) {
      // tableReports 조회
      const tableReportData = await db.select().from(tableReports).where(
        and(
          eq(tableReports.branchId, branchId),
          eq(tableReports.date, record.date)
        )
      ).limit(1);

      const tableReportId = tableReportData && tableReportData.length > 0 ? tableReportData[0].id : null;
      const { staffCount, partTimeCount, managerCount, partTimeTotalHours } = await getStaffCounts(tableReportId);

      // 정산 계산
      const cash = Number(record.cash || 0);
      const card = Number(record.card || 0);
      const expenses = record.expenses || [];

      const settlement = await calculateDailySettlement(
        branchId,
        record.date,
        cash,
        card,
        staffCount,
        partTimeCount,
        expenses,
        tableReportId,
        managerCount,
        partTimeTotalHours
      );

      // 업데이트
      await db.update(dailySalesRecords).set({
        totalRevenue: String(settlement.totalRevenue),
        commissionExpense: String(settlement.commissionExpense),
        rentExpense: String(settlement.rentExpense),
        managementFeeExpense: String(settlement.managementFeeExpense),
        staffWageExpense: String(settlement.staffWageExpense),
        managerWageExpense: String(settlement.managerWageExpense),
        partTimeWageExpense: String(settlement.partTimeWageExpense),
        liquorCostExpense: String(settlement.liquorCostExpense),
        staffDrinkExpense: String(settlement.staffDrinkExpense),
        otherExpense: String(settlement.otherExpense),
        totalExpenses: String(settlement.totalExpenses),
        netProfit: String(settlement.netProfit),
        staffCount,
        partTimeCount,
        updatedAt: new Date(),
      }).where(eq(dailySalesRecords.id, record.id));

      updateCounts[branchId]++;
    }
  }

  console.log('');
  console.log('✅ 재계산 완료!');
  console.log('');
  branchIds.forEach(id => {
    console.log(`지점 ${id}: ${updateCounts[id]}건 업데이트됨`);
  });
}

main().catch(err => {
  console.error('❌ 오류:', err);
  process.exit(1);
});
