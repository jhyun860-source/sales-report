import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, publicProcedure, adminProcedure } from './_core/trpc';
import { getDb } from './db';
import { branchSettings } from '../drizzle/schema';
import { TRPCError } from '@trpc/server';



export const branchSettingsRouter = router({
  getAll: adminProcedure
    .query(async ({ ctx }) => {
      console.log('Server Side User Context:', { user: ctx.user, role: ctx.user?.role });
      console.log('[branchSettings.getAll] Admin user accessing:', {
        userId: ctx.user?.id,
        userRole: ctx.user?.role,
        userName: ctx.user?.name,
      });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const result = await db.select().from(branchSettings).orderBy(branchSettings.branchId);
      console.log('[branchSettings.getAll] Query success, returning', result.length, 'records');
      return result;
    }),

  getByBranch: publicProcedure
    .input(z.object({ branchId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const [setting] = await db.select().from(branchSettings)
        .where(eq(branchSettings.branchId, input.branchId)).limit(1);
      return setting ?? null;
    }),

  upsert: adminProcedure
    .input(z.object({
      branchId: z.number(),
      monthlyRent: z.number().min(0),
      managerMonthlySalary: z.number().min(0),
      managerDailyWage: z.number().min(0),
      deputyMonthlySalary: z.number().min(0).default(0),
      deputyDailyWage: z.number().min(0).default(0),
      staffMonthlySalary: z.number().min(0).default(0),
      staffDailyWage: z.number().min(0),
      partTimeHourlyWage: z.number().min(0),
      monthlyFixedExpense: z.number().min(0).default(0),
      commissionRate: z.number().min(0).max(1).default(0.17),
      workType: z.enum(['MON_FRI', 'MON_SAT']).default('MON_FRI'),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log('Server Side User Context (upsert):', { user: ctx.user, role: ctx.user?.role });
      console.log('[branchSettings.upsert] Admin user updating:', {
        userId: ctx.user?.id,
        userRole: ctx.user?.role,
        branchId: input.branchId,
      });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const computedDailyWage = input.managerMonthlySalary > 0
        ? Math.round(input.managerMonthlySalary / 22)
        : input.managerDailyWage;
      const computedDeputyDailyWage = input.deputyMonthlySalary > 0
        ? Math.round(input.deputyMonthlySalary / 22)
        : input.deputyDailyWage;
      const computedStaffDailyWage = input.staffMonthlySalary > 0
        ? Math.round(input.staffMonthlySalary / 22)
        : input.staffDailyWage;

      const [existing] = await db.select().from(branchSettings)
        .where(eq(branchSettings.branchId, input.branchId)).limit(1);

      if (existing) {
        const result = await db.update(branchSettings).set({
          monthlyRent: String(input.monthlyRent),
          managerMonthlySalary: String(input.managerMonthlySalary),
          managerDailyWage: String(computedDailyWage),
          deputyMonthlySalary: String(input.deputyMonthlySalary),
          deputyDailyWage: String(computedDeputyDailyWage),
          staffMonthlySalary: String(input.staffMonthlySalary),
          staffDailyWage: String(computedStaffDailyWage),
          partTimeHourlyWage: String(input.partTimeHourlyWage),
          monthlyFixedExpense: String(input.monthlyFixedExpense ?? 0),
          commissionRate: String(input.commissionRate),
        }).where(eq(branchSettings.branchId, input.branchId));
        if (!result) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to update branch settings' });
      } else {
        await db.insert(branchSettings).values({
          branchId: input.branchId,
          monthlyRent: String(input.monthlyRent),
          managerMonthlySalary: String(input.managerMonthlySalary),
          managerDailyWage: String(computedDailyWage),
          deputyMonthlySalary: String(input.deputyMonthlySalary),
          deputyDailyWage: String(computedDeputyDailyWage),
          staffMonthlySalary: String(input.staffMonthlySalary),
          staffDailyWage: String(computedStaffDailyWage),
          partTimeHourlyWage: String(input.partTimeHourlyWage),
          monthlyFixedExpense: String(input.monthlyFixedExpense ?? 0),
          commissionRate: String(input.commissionRate),
        });
      }
      // 설정값 변경 후 당월 전체 정산 재계산
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;

        console.log('[설정 저장] 재계산 시작:', { branchId: input.branchId, startDate, endDate });
        
        const result = await db.execute(`
          UPDATE dailySalesRecords d
          SET
            d.staffWageExpense = d.staffCount * ${input.staffDailyWage},
            d.managerWageExpense = (
              SELECT COALESCE(SUM(CASE
                WHEN si.staffType = 'manager' THEN ${computedDailyWage}
                WHEN si.staffType = 'deputy' THEN ${computedDeputyDailyWage}
                ELSE 0 END), 0)
              FROM staffIncentives si
              JOIN tableReports tr ON si.tableReportId = tr.id
              WHERE tr.branchId = d.branchId AND tr.date = d.date
            ),
            d.commissionExpense = ROUND(d.totalRevenue * ${input.commissionRate}),
            d.rentExpense = ROUND(${input.monthlyRent} / (
              SELECT COUNT(*) FROM (
                SELECT date FROM dailySalesRecords
                WHERE branchId = ${input.branchId}
                AND date BETWEEN '${startDate}' AND '${endDate}'
                AND DAYOFWEEK(date) != 1
                AND totalRevenue > 0
              ) sub
            )),
            d.totalExpenses = d.commissionExpense + d.rentExpense + d.managementFeeExpense
              + (d.staffCount * ${input.staffDailyWage})
              + (SELECT COALESCE(SUM(CASE
                  WHEN si.staffType = 'manager' THEN ${computedDailyWage}
                  WHEN si.staffType = 'deputy' THEN ${computedDeputyDailyWage}
                  ELSE 0 END), 0)
                 FROM staffIncentives si JOIN tableReports tr ON si.tableReportId = tr.id
                 WHERE tr.branchId = d.branchId AND tr.date = d.date)
              + d.partTimeWageExpense + d.liquorCostExpense + d.staffDrinkExpense + d.otherExpense,
            d.netProfit = d.totalRevenue - (d.commissionExpense + d.rentExpense + d.managementFeeExpense
              + (d.staffCount * ${input.staffDailyWage})
              + (SELECT COALESCE(SUM(CASE
                  WHEN si.staffType = 'manager' THEN ${computedDailyWage}
                  WHEN si.staffType = 'deputy' THEN ${computedDeputyDailyWage}
                  ELSE 0 END), 0)
                 FROM staffIncentives si JOIN tableReports tr ON si.tableReportId = tr.id
                 WHERE tr.branchId = d.branchId AND tr.date = d.date)
              + d.partTimeWageExpense + d.liquorCostExpense + d.staffDrinkExpense + d.otherExpense)
          WHERE d.branchId = ${input.branchId}
          AND d.date BETWEEN '${startDate}' AND '${endDate}'
          AND d.totalRevenue > 0
        `);
        console.log('[설정 저장] 재계산 완료:', result);
      } catch (e) {
        console.error('[설정 저장 후 재계산 오류]', e);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to recalculate settlements: ${e instanceof Error ? e.message : String(e)}` });
      }

      return { success: true, managerDailyWage: computedDailyWage, deputyDailyWage: computedDeputyDailyWage };
    }),
});
