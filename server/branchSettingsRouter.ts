import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, publicProcedure } from './_core/trpc';
import { getDb, getStoreAccountById } from './db';
import { branchSettings } from '../drizzle/schema';
import { TRPCError } from '@trpc/server';
import { COOKIE_NAME } from '@shared/const';
import { ENV } from './_core/env';
import { jwtVerify } from 'jose';

async function parseStoreCookie(cookieHeader: string | undefined, authHeader?: string) {
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token && cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=')];
      })
    );
    token = cookies[COOKIE_NAME];
  }
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    if (payload.type !== 'store') return null;
    return payload as { accountId: number; loginId: string; role: string; type: string };
  } catch {
    return null;
  }
}

export const branchSettingsRouter = router({
  getAll: publicProcedure
    .query(async ({ ctx }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
      if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const account = await getStoreAccountById(payload.accountId);
      if (!account || account.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return await db.select().from(branchSettings).orderBy(branchSettings.branchId);
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

  upsert: publicProcedure
    .input(z.object({
      branchId: z.number(),
      monthlyRent: z.number().min(0),
      managerMonthlySalary: z.number().min(0),
      managerDailyWage: z.number().min(0),
      deputyMonthlySalary: z.number().min(0).default(0),
      deputyDailyWage: z.number().min(0).default(0),
      staffDailyWage: z.number().min(0),
      partTimeHourlyWage: z.number().min(0),
      monthlyFixedExpense: z.number().min(0).default(0),
      commissionRate: z.number().min(0).max(1).default(0.17),
    }))
    .mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
      if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED' });
      const account = await getStoreAccountById(payload.accountId);
      if (!account || account.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const computedDailyWage = input.managerMonthlySalary > 0
        ? Math.round(input.managerMonthlySalary / 22)
        : input.managerDailyWage;
      const computedDeputyDailyWage = input.deputyMonthlySalary > 0
        ? Math.round(input.deputyMonthlySalary / 22)
        : input.deputyDailyWage;

      const [existing] = await db.select().from(branchSettings)
        .where(eq(branchSettings.branchId, input.branchId)).limit(1);

      if (existing) {
        await db.update(branchSettings).set({
          monthlyRent: String(input.monthlyRent),
          managerMonthlySalary: String(input.managerMonthlySalary),
          managerDailyWage: String(computedDailyWage),
          deputyMonthlySalary: String(input.deputyMonthlySalary),
          deputyDailyWage: String(computedDeputyDailyWage),
          staffDailyWage: String(input.staffDailyWage),
          partTimeHourlyWage: String(input.partTimeHourlyWage),
          monthlyFixedExpense: String(input.monthlyFixedExpense ?? 0),
          commissionRate: String(input.commissionRate),
        }).where(eq(branchSettings.branchId, input.branchId));
      } else {
        await db.insert(branchSettings).values({
          branchId: input.branchId,
          monthlyRent: String(input.monthlyRent),
          managerMonthlySalary: String(input.managerMonthlySalary),
          managerDailyWage: String(computedDailyWage),
          deputyMonthlySalary: String(input.deputyMonthlySalary),
          deputyDailyWage: String(computedDeputyDailyWage),
          staffDailyWage: String(input.staffDailyWage),
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

        await db.execute(`
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
      } catch (e) {
        console.error('[설정 저장 후 재계산 오류]', e);
      }

      return { success: true, managerDailyWage: computedDailyWage, deputyDailyWage: computedDeputyDailyWage };
    }),
});
