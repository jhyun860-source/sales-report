/**
 * 정산 계산 로직
 * 일별 순수익 및 월 누적 현황 계산을 위한 핵심 함수들
 */

import { getDb } from '../db';
import { dailySalesRecords, staffIncentives, liquorStockMovements, branches, branchSettings } from '../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

/**
 * 지점별 고정 설정값 (DB 마이그레이션 없이 코드에서 관리)
 */
const BRANCH_CONFIG: Record<string, {
  monthlyRent: number;
  managementFee: number;
  staffDailyWage: number;
  partTimeDailyWage: number;
  commissionRate: number;
  hasManager: boolean;
  managerDailyWage: number;
  glassUnitPrice: number;
  bottleUnitPrice: number;
  beerBottleUnitPrice: number;
}> = {
  '대치점': {
    monthlyRent: 9000000,
    managementFee: 0,
    staffDailyWage: 136363,
    partTimeDailyWage: 20000,
    commissionRate: 0.17,
    hasManager: true,
    managerDailyWage: 272727,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
  '선릉점': {
    monthlyRent: 6500000,
    managementFee: 0,
    staffDailyWage: 136363,
    partTimeDailyWage: 20000,
    commissionRate: 0.17,
    hasManager: true,
    managerDailyWage: 250000,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
  '삼성점': {
    monthlyRent: 6500000,
    managementFee: 0,
    staffDailyWage: 159090,
    partTimeDailyWage: 20000,
    commissionRate: 0.17,
    hasManager: true,
    managerDailyWage: 181818,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
  '문정1호점': {
    monthlyRent: 4500000,
    managementFee: 0,
    staffDailyWage: 136363,
    partTimeDailyWage: 20000,
    commissionRate: 0.17,
    hasManager: true,
    managerDailyWage: 204545,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
  '문정2호점': {
    monthlyRent: 4500000,
    managementFee: 0,
    staffDailyWage: 136363,
    partTimeDailyWage: 20000,
    commissionRate: 0.17,
    hasManager: true,
    managerDailyWage: 181818,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
};

/**
 * 영업일수 계산 (월~토, 일요일 제외)
 */
export function getBusinessDaysInMonth(year: number, month: number): number {
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
export function calculateDailyRent(monthlyRent: number, year: number, month: number): number {
  const businessDays = getBusinessDaysInMonth(year, month);
  if (businessDays === 0) return 0;
  return Math.round(monthlyRent / businessDays);
}

/**
 * 직원 수 조회
 */
export async function getStaffCounts(tableReportId: number): Promise<{ staffCount: number; partTimeCount: number; managerCount: number; partTimeTotalHours: number }> {
  const db = await getDb();
  if (!db) return { staffCount: 0, partTimeCount: 0, managerCount: 0, partTimeTotalHours: 0 };
  const incentives = await db.select().from(staffIncentives).where(eq(staffIncentives.tableReportId, tableReportId));
  const staffCount = incentives.filter(i => i.staffType === 'staff').length;
  const partTimeCount = incentives.filter(i => i.staffType === 'parttime').length;
  const managerCount = incentives.filter(i => i.staffType === 'manager' || i.staffType === 'deputy').length;

  // 알바 총 근무시간 계산 (출퇴근 시간 기반)
  let partTimeTotalHours = 0;
  for (const inc of incentives.filter(i => i.staffType === 'parttime')) {
    if (inc.workStart && inc.workEnd) {
      try {
        const [sh, sm] = (inc.workStart as string).split(':').map(Number);
        const [eh, em] = (inc.workEnd as string).split(':').map(Number);
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin <= startMin) endMin += 24 * 60; // 자정 넘김
        partTimeTotalHours += (endMin - startMin) / 60;
      } catch {}
    }
  }
  return { staffCount, partTimeCount, managerCount, partTimeTotalHours };
}

/**
 * 스탭음료 비용 계산
 */
export async function calculateStaffDrinkExpense(tableReportId: number, branchName: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

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
 * 주류/단가 비용 계산 (해당 날짜의 OUT 기록 totalCost 합산)
 */
export async function calculateLiquorCostExpense(branchId: number, date: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const movements = await db.select().from(liquorStockMovements).where(
    and(
      eq(liquorStockMovements.branchId, branchId),
      eq(liquorStockMovements.date, date),
      eq(liquorStockMovements.type, 'OUT')
    )
  );
  return movements.reduce((sum, m) => sum + Number(m.totalCost || 0), 0);
}

/**
 * 기타 비용 합계
 */
export function calculateOtherExpenses(expenses: Array<{ id: string; description: string; amount: string }>): number {
  if (!Array.isArray(expenses)) return 0;
  return expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
}

/**
 * 일별 정산 결과 계산
 */
export async function calculateDailySettlement(
  branchId: number,
  date: string,
  cash: number,
  card: number,
  staffCount: number,
  partTimeCount: number,
  expenses: Array<{ id: string; description: string; amount: string }>,
  tableReportId: number | null,
  managerCount: number = 0,
  partTimeTotalHours: number = 0
): Promise<{
  totalRevenue: number;
  commissionExpense: number;
  rentExpense: number;
  managementFeeExpense: number;
  staffWageExpense: number;
  managerWageExpense: number;
  partTimeWageExpense: number;
  liquorCostExpense: number;
  staffDrinkExpense: number;
  otherExpense: number;
  totalExpenses: number;
  netProfit: number;
}> {
  const zero = {
    totalRevenue: 0, commissionExpense: 0, rentExpense: 0,
    managementFeeExpense: 0, staffWageExpense: 0, managerWageExpense: 0,
    partTimeWageExpense: 0, liquorCostExpense: 0, staffDrinkExpense: 0,
    otherExpense: 0, totalExpenses: 0, netProfit: 0,
  };

  const db = await getDb();
  if (!db) return zero;

  // 지점 이름 조회
  const branchData = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!branchData || branchData.length === 0) return zero;

  // branchSettings DB에서 설정값 읽기 (설정 페이지에서 저장한 값)
  const [bsData] = await db.select().from(branchSettings).where(eq(branchSettings.branchId, branchId)).limit(1);
  // DB 설정값이 없으면 하드코딩 폴백
  const branchName = branchData[0].name;
  const hardConfig = BRANCH_CONFIG[branchName];

  const [year, month] = date.split('-').map(Number);

  // 1. 총매출
  const totalRevenue = cash + card;

  // 2. 수수료/주방
  const commissionRate = bsData ? Number(bsData.commissionRate || 0.17) : (hardConfig?.commissionRate ?? 0.17);
  const commissionExpense = Math.round(totalRevenue * commissionRate);

  // 3. 임대료 (월 임대료 ÷ 영업일수)
  const monthlyRent = bsData ? Number(bsData.monthlyRent || 0) : (hardConfig?.monthlyRent ?? 0);
  const rentExpense = calculateDailyRent(monthlyRent, year, month);

  // 4. 관리비 (0으로 통일, 임대료에 포함)
  const managementFeeExpense = 0;

  // 5. 여직원 인건비
  const staffDailyWage = bsData ? Number(bsData.staffDailyWage || 0) : (hardConfig?.staffDailyWage ?? 0);
  const staffWageExpense = staffCount * staffDailyWage;

  // 6. 점장/매니저 인건비 - 테이블 기록에 직접 추가했을 때만 반영
  const managerDailyWage = bsData ? Number(bsData.managerDailyWage || 0) : (hardConfig?.managerDailyWage ?? 0);
  const deputyDailyWage = bsData ? Number(bsData.deputyDailyWage || 0) : managerDailyWage;
  const pureManagerCount = incentives.filter(i => i.staffType === 'manager').length;
  const deputyCount = incentives.filter(i => i.staffType === 'deputy').length;
  const managerWageExpense = (pureManagerCount * managerDailyWage) + (deputyCount * deputyDailyWage);

  // 7. 알바 인건비 (시급 × 근무시간)
  const partTimeHourlyWage = bsData ? Number(bsData.partTimeHourlyWage || 0) : (hardConfig?.partTimeDailyWage ?? 9860);
  // 알바: 시급 × 총 근무시간 (출퇴근 시간 기록 있으면 시간 계산, 없으면 인원수 × 시급 × 8시간)
  const partTimeWageExpense = partTimeTotalHours > 0
    ? Math.round(partTimeHourlyWage * partTimeTotalHours)
    : partTimeCount * partTimeHourlyWage * 8;

  // 8. 주류/단가
  const liquorCostExpense = await calculateLiquorCostExpense(branchId, date);

  // 9. 스탭음료
  const staffDrinkExpense = tableReportId
    ? await calculateStaffDrinkExpense(tableReportId, branchName)
    : 0;

  // 10. 기타비용
  const otherExpense = calculateOtherExpenses(expenses);

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
 * 월 누적 현황 계산
 */
export async function calculateMonthlySummary(
  branchId: number,
  year: number,
  month: number
): Promise<{
  totalRevenue: number;
  commissionExpense: number;
  rentExpense: number;
  managementFeeExpense: number;
  staffWageExpense: number;
  partTimeWageExpense: number;
  liquorCostExpense: number;
  staffDrinkExpense: number;
  otherExpense: number;
  totalExpenses: number;
  netProfit: number;
  ratios: Record<string, number>;
}> {
  const db = await getDb();
  const zero = {
    totalRevenue: 0, commissionExpense: 0, rentExpense: 0,
    managementFeeExpense: 0, staffWageExpense: 0, managerWageExpense: 0, partTimeWageExpense: 0,
    liquorCostExpense: 0, staffDrinkExpense: 0, otherExpense: 0,
    totalExpenses: 0, netProfit: 0, ratios: {},
  };
  if (!db) return zero;

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  const records = await db.select().from(dailySalesRecords).where(
    and(
      eq(dailySalesRecords.branchId, branchId),
      gte(dailySalesRecords.date, startDate),
      lte(dailySalesRecords.date, endDate)
    )
  );

  let totalRevenue = 0, commissionExpense = 0, rentExpense = 0;
  let managementFeeExpense = 0, staffWageExpense = 0, managerWageExpense = 0, partTimeWageExpense = 0;
  let liquorCostExpense = 0, staffDrinkExpense = 0, otherExpense = 0;
  let totalExpenses = 0, netProfit = 0;

  records.forEach(record => {
    totalRevenue      += Number(record.totalRevenue || 0);
    commissionExpense += Number(record.commissionExpense || 0);
    rentExpense       += Number(record.rentExpense || 0);
    managementFeeExpense += Number(record.managementFeeExpense || 0);
    staffWageExpense  += Number(record.staffWageExpense || 0);
    managerWageExpense += Number((record as any).managerWageExpense || 0);
    partTimeWageExpense += Number(record.partTimeWageExpense || 0);
    liquorCostExpense += Number(record.liquorCostExpense || 0);
    staffDrinkExpense += Number(record.staffDrinkExpense || 0);
    otherExpense      += Number(record.otherExpense || 0);
    totalExpenses     += Number(record.totalExpenses || 0);
    netProfit         += Number(record.netProfit || 0);
  });

  const ratios: Record<string, number> = {};
  if (totalRevenue > 0) {
    ratios.commission    = Math.round((commissionExpense / totalRevenue) * 100);
    ratios.rent          = Math.round((rentExpense / totalRevenue) * 100);
    ratios.managementFee = Math.round((managementFeeExpense / totalRevenue) * 100);
    ratios.staffWage     = Math.round((staffWageExpense / totalRevenue) * 100);
    ratios.managerWage   = Math.round((managerWageExpense / totalRevenue) * 100);
    ratios.partTimeWage  = Math.round((partTimeWageExpense / totalRevenue) * 100);
    ratios.liquorCost    = Math.round((liquorCostExpense / totalRevenue) * 100);
    ratios.staffDrink    = Math.round((staffDrinkExpense / totalRevenue) * 100);
    ratios.otherExpense  = Math.round((otherExpense / totalRevenue) * 100);
    ratios.netProfit     = Math.round((netProfit / totalRevenue) * 100);
  }

  return {
    totalRevenue, commissionExpense, rentExpense, managementFeeExpense,
    staffWageExpense, managerWageExpense, partTimeWageExpense, liquorCostExpense, staffDrinkExpense,
    otherExpense, totalExpenses, netProfit, ratios,
  };
}

/**
 * 일별 정산 결과를 DB에 저장 (upsert)
 */
export async function saveDailySettlementRecord(
  branchId: number,
  date: string,
  settlement: Awaited<ReturnType<typeof calculateDailySettlement>>
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const existing = await db
    .select()
    .from(dailySalesRecords)
    .where(and(eq(dailySalesRecords.branchId, branchId), eq(dailySalesRecords.date, date)))
    .limit(1);

  const fields = {
    totalRevenue: String(settlement.totalRevenue),
    commissionExpense: String(settlement.commissionExpense),
    rentExpense: String(settlement.rentExpense),
    managementFeeExpense: String(settlement.managementFeeExpense),
    staffWageExpense: String(settlement.staffWageExpense),
    managerWageExpense: String(settlement.managerWageExpense ?? 0),
    partTimeWageExpense: String(settlement.partTimeWageExpense),
    liquorCostExpense: String(settlement.liquorCostExpense),
    staffDrinkExpense: String(settlement.staffDrinkExpense),
    otherExpense: String(settlement.otherExpense),
    totalExpenses: String(settlement.totalExpenses),
    netProfit: String(settlement.netProfit),
    updatedAt: new Date(),
  };

  if (existing && existing.length > 0) {
    await db.update(dailySalesRecords).set(fields).where(eq(dailySalesRecords.id, existing[0].id));
  }
}
