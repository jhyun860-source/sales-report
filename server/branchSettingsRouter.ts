import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, publicProcedure } from './_core/trpc';
import { getDb } from './db';
import { branchSettings } from '../drizzle/schema';
import { TRPCError } from '@trpc/server';
import { jwtVerify } from 'jose';
import { ENV } from './_core/env';
import { getBusinessDaysInMonth } from './_core/settlementCalculations';

const COOKIE_NAME = 'app_session_id';

// Store Account 권한 확인 함수
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
      // Store Account 권한 확인
      const storePayload = await parseStoreCookie(
        ctx.req.headers.cookie,
        ctx.req.headers.authorization as string | undefined
      );
      
      // Store Account admin 또는 Manus OAuth admin만 허용
      const isStoreAdmin = storePayload?.role === 'admin';
      const isOAuthAdmin = ctx.user?.role === 'admin';
      
      if (!isStoreAdmin && !isOAuthAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      console.log('[branchSettings.getAll] Admin user accessing:', {
        userId: ctx.user?.id,
        userRole: ctx.user?.role,
        storeLoginId: storePayload?.loginId,
        storeRole: storePayload?.role,
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

  upsert: publicProcedure
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
      // Store Account 권한 확인
      const storePayload = await parseStoreCookie(
        ctx.req.headers.cookie,
        ctx.req.headers.authorization as string | undefined
      );
      
      // Store Account admin 또는 Manus OAuth admin만 허용
      const isStoreAdmin = storePayload?.role === 'admin';
      const isOAuthAdmin = ctx.user?.role === 'admin';
      
      if (!isStoreAdmin && !isOAuthAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
      }

      console.log('[branchSettings.upsert] Admin user updating:', {
        userId: ctx.user?.id,
        userRole: ctx.user?.role,
        storeLoginId: storePayload?.loginId,
        storeRole: storePayload?.role,
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
          workType: input.workType,
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
          workType: input.workType,
        });
      }
      // 1단계: tableItems에서 매출 재계산 및 dailySalesRecords 업데이트
      try {
        console.log('[매출 재계산 시작] branchId:', input.branchId);
        
        // 해당 지점의 모든 tableReports 조회
        const tableReportsResult = await db.execute(`
          SELECT id, date FROM tableReports WHERE branchId = ${input.branchId}
        `);
        
        const tableReportIds = (tableReportsResult as any[]).map((tr: any) => tr.id);
        
        if (tableReportIds.length > 0) {
          // 각 tableReport의 tableItems 합계를 계산하고 dailySalesRecords 업데이트
          const updateResult = await db.execute(`
            UPDATE dailySalesRecords d
            SET d.totalRevenue = (
              SELECT COALESCE(SUM(CAST(ti.amount AS SIGNED)), 0)
              FROM tableItems ti
              JOIN tableReports tr ON ti.tableReportId = tr.id
              WHERE tr.branchId = d.branchId AND tr.date = d.date
            )
            WHERE d.branchId = ${input.branchId}
          `);
          console.log('[dailySalesRecords 업데이트] 완료:', updateResult);
        }
        console.log('[매출 재계산 완료] branchId:', input.branchId);
      } catch (e) {
        console.error('[매출 재계산 오류]', e);
      }

      // 2단계: 설정값 변경 후 당월 전체 정산 재계산
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-31`;

        console.log('[설정 저장] 재계산 시작:', { branchId: input.branchId, startDate, endDate });

        // 임대료는 항상 그 달 실제 캘린더 기준 월~토 영업일수로 나눔
        // (기존엔 "이미 입력된 날짜 수"로 나눠서 월초엔 임대료가 비정상적으로 커지는 버그가 있었음)
        const rentBusinessDays = getBusinessDaysInMonth(year, Number(month), 'MON_SAT');
        
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
            d.rentExpense = ROUND(${input.monthlyRent} / ${rentBusinessDays}),
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
