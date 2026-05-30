/**
 * 정산 계산 로직
 * 일별 순수익 및 월 누적 현황 계산을 위한 핵심 함수들
 */

import { getDb } from '../db';
import { dailySalesRecords, staffIncentives, liquorStockMovements, branches } from '../../drizzle/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

/**
 * 영업일수 계산 (월~토, 일요일 제외)
 */
export function getBusinessDaysInMonth(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  let businessDays = 0;
  for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    // 일요일(0)이 아니면 영업일
    if (dayOfWeek !== 0) {
      businessDays++;
    }
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
export async function getStaffCounts(tableReportId: number): Promise<{ staffCount: number; partTimeCount: number }> {
  const db = await getDb();
  if (!db) return { staffCount: 0, partTimeCount: 0 };

  const incentives = await db
    .select()
    .from(staffIncentives)
    .where(eq(staffIncentives.tableReportId, tableReportId));

  const staffCount = incentives.filter(i => i.staffType === 'staff').length;
  const partTimeCount = incentives.filter(i => i.staffType === 'parttime').length;

  return { staffCount, partTimeCount };
}

/**
 * 스탭음료 비용 계산
 */
export async function calculateStaffDrinkExpense(tableReportId: number, branchId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const branch = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!branch || branch.length === 0) return 0;

  const branchData = branch[0];
  const glassPrice = Number(branchData.glassUnitPrice || 0);
  const bottlePrice = Number(branchData.bottleUnitPrice || 0);
  const beerBottlePrice = Number(branchData.beerBottleUnitPrice || 0);

  const incentives = await db
    .select()
    .from(staffIncentives)
    .where(eq(staffIncentives.tableReportId, tableReportId));

  let totalStaffDrink = 0;
  incentives.forEach(incentive => {
    totalStaffDrink += (Number(incentive.glassCount || 0) * glassPrice);
    totalStaffDrink += (Number(incentive.bottleCount || 0) * bottlePrice);
    totalStaffDrink += (Number(incentive.beerBottleCount || 0) * beerBottlePrice);
  });

  return totalStaffDrink;
}

/**
 * 주류/단가 비용 계산 (해당 날짜의 OUT 기록)
 */
export async function calculateLiquorCostExpense(branchId: number, date: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const movements = await db
    .select()
    .from(liquorStockMovements)
    .where(
      and(
        eq(liquorStockMovements.branchId, branchId),
        eq(liquorStockMovements.date, date),
        eq(liquorStockMovements.type, 'OUT')
      )
    );

  let totalCost = 0;
  movements.forEach(movement => {
    totalCost += Number(movement.totalCost || 0);
  });

  return totalCost;
}

/**
 * 기타 비용 합계 계산
 */
export function calculateOtherExpenses(expenses: Array<{ id: string; description: string; amount: string }>): number {
  if (!Array.isArray(expenses)) return 0;
  return expenses.reduce((sum, exp) => sum + (Number(exp.amount || 0)), 0);
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
  tableReportId: number | null
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
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalRevenue: 0,
      commissionExpense: 0,
      rentExpense: 0,
      managementFeeExpense: 0,
      staffWageExpense: 0,
      partTimeWageExpense: 0,
      liquorCostExpense: 0,
      staffDrinkExpense: 0,
      otherExpense: 0,
      totalExpenses: 0,
      netProfit: 0,
    };
  }

  // 지점 정보 조회
  const branchData = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  if (!branchData || branchData.length === 0) {
    return {
      totalRevenue: 0,
      commissionExpense: 0,
      rentExpense: 0,
      managementFeeExpense: 0,
      staffWageExpense: 0,
      partTimeWageExpense: 0,
      liquorCostExpense: 0,
      staffDrinkExpense: 0,
      otherExpense: 0,
      totalExpenses: 0,
      netProfit: 0,
    };
  }

  const branch = branchData[0];
  const [year, month] = date.split('-').map(Number);

  // 1. 총매출
  const totalRevenue = cash + card;

  // 2. 수수료/주방
  const commissionRate = Number(branch.commissionRate || 0.05);
  const commissionExpense = Math.round(totalRevenue * commissionRate);

  // 3. 임대료
  const monthlyRent = Number(branch.monthlyRent || 0);
  const rentExpense = calculateDailyRent(monthlyRent, year, month);

  // 4. 관리비
  const managementFeeExpense = Number(branch.managementFee || 0);

  // 5. 여직원 인건비 (점장 유무 확인)
  const hasManager = Number(branch.hasManager || 1);
  const staffDailyWage = Number(branch.staffDailyWage || 0);
  const staffWageExpense = hasManager === 1 ? staffCount * staffDailyWage : 0;

  // 6. 여알바 인건비 (시급 기반)
  const partTimeHourlyWage = Number(branch.partTimeHourlyWage || 0);
  // 평균 근무 시간은 8시간으로 가정 (실제로는 workStart/workEnd에서 계산 가능)
  const partTimeWageExpense = partTimeCount * partTimeHourlyWage * 8;

  // 7. 주류/단가
  const liquorCostExpense = await calculateLiquorCostExpense(branchId, date);

  // 8. 스탭음료
  let staffDrinkExpense = 0;
  if (tableReportId) {
    staffDrinkExpense = await calculateStaffDrinkExpense(tableReportId, branchId);
  }

  // 9. 기타 비용
  const otherExpense = calculateOtherExpenses(expenses);

  // 10. 총 지출
  const totalExpenses =
    commissionExpense +
    rentExpense +
    managementFeeExpense +
    staffWageExpense +
    partTimeWageExpense +
    liquorCostExpense +
    staffDrinkExpense +
    otherExpense;

  // 11. 순수익
  const netProfit = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    commissionExpense,
    rentExpense,
    managementFeeExpense,
    staffWageExpense,
    partTimeWageExpense,
    liquorCostExpense,
    staffDrinkExpense,
    otherExpense,
    totalExpenses,
    netProfit,
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
  if (!db) {
    return {
      totalRevenue: 0,
      commissionExpense: 0,
      rentExpense: 0,
      managementFeeExpense: 0,
      staffWageExpense: 0,
      partTimeWageExpense: 0,
      liquorCostExpense: 0,
      staffDrinkExpense: 0,
      otherExpense: 0,
      totalExpenses: 0,
      netProfit: 0,
      ratios: {},
    };
  }

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  const records = await db
    .select()
    .from(dailySalesRecords)
    .where(
      and(
        eq(dailySalesRecords.branchId, branchId),
        gte(dailySalesRecords.date, startDate),
        lte(dailySalesRecords.date, endDate)
      )
    );

  let totalRevenue = 0;
  let commissionExpense = 0;
  let rentExpense = 0;
  let managementFeeExpense = 0;
  let staffWageExpense = 0;
  let partTimeWageExpense = 0;
  let liquorCostExpense = 0;
  let staffDrinkExpense = 0;
  let otherExpense = 0;
  let totalExpenses = 0;
  let netProfit = 0;

  records.forEach(record => {
    totalRevenue += Number(record.totalRevenue || 0);
    commissionExpense += Number(record.commissionExpense || 0);
    rentExpense += Number(record.rentExpense || 0);
    managementFeeExpense += Number(record.managementFeeExpense || 0);
    staffWageExpense += Number(record.staffWageExpense || 0);
    partTimeWageExpense += Number(record.partTimeWageExpense || 0);
    liquorCostExpense += Number(record.liquorCostExpense || 0);
    staffDrinkExpense += Number(record.staffDrinkExpense || 0);
    otherExpense += Number(record.otherExpense || 0);
    totalExpenses += Number(record.totalExpenses || 0);
    netProfit += Number(record.netProfit || 0);
  });

  // 비율 계산
  const ratios: Record<string, number> = {};
  if (totalRevenue > 0) {
    ratios.commission = Math.round((commissionExpense / totalRevenue) * 100);
    ratios.rent = Math.round((rentExpense / totalRevenue) * 100);
    ratios.managementFee = Math.round((managementFeeExpense / totalRevenue) * 100);
    ratios.staffWage = Math.round((staffWageExpense / totalRevenue) * 100);
    ratios.partTimeWage = Math.round((partTimeWageExpense / totalRevenue) * 100);
    ratios.liquorCost = Math.round((liquorCostExpense / totalRevenue) * 100);
    ratios.staffDrink = Math.round((staffDrinkExpense / totalRevenue) * 100);
    ratios.otherExpense = Math.round((otherExpense / totalRevenue) * 100);
    ratios.netProfit = Math.round((netProfit / totalRevenue) * 100);
  }

  return {
    totalRevenue,
    commissionExpense,
    rentExpense,
    managementFeeExpense,
    staffWageExpense,
    partTimeWageExpense,
    liquorCostExpense,
    staffDrinkExpense,
    otherExpense,
    totalExpenses,
    netProfit,
    ratios,
  };
}
