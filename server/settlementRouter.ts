/**
 * 정산 관리 라우터
 * 지점별 손익 관리 및 순수익 분석을 위한 API
 */

import { publicProcedure, router } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from './db';
import { branches, dailySalesRecords, tableReports, staffIncentives } from '../drizzle/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import {
  calculateDailySettlement,
  calculateMonthlySummary,
  getStaffCounts,
} from './_core/settlementCalculations';
import { getStoreAccountById } from './db';
import { COOKIE_NAME } from '@shared/const';
import { ENV } from './_core/env';
import { jwtVerify } from 'jose';

// parseStoreCookie 함수 (routers.ts에서 복사)
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

export const settlementRouter = router({
  /**
   * 지점 설정 조회
   */
  getBranchSettings: publicProcedure
    .input(z.object({ branchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });

      const branch = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
      if (!branch || branch.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '지점을 찾을 수 없습니다' });
      }

      return branch[0];
    }),

  /**
   * 지점 설정 업데이트
   */
  updateBranchSettings: publicProcedure
    .input(
      z.object({
        branchId: z.number(),
        monthlyRent: z.string().optional(),
        managementFee: z.string().optional(),
        staffDailyWage: z.string().optional(),
        partTimeHourlyWage: z.string().optional(),
        commissionRate: z.string().optional(),
        hasManager: z.number().optional(),
        glassUnitPrice: z.string().optional(),
        bottleUnitPrice: z.string().optional(),
        beerBottleUnitPrice: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
      if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });

      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });

      // 관리자만 설정 변경 가능
      if (account.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 설정을 변경할 수 있습니다' });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });

      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (input.monthlyRent !== undefined) updateData.monthlyRent = input.monthlyRent;
      if (input.managementFee !== undefined) updateData.managementFee = input.managementFee;
      if (input.staffDailyWage !== undefined) updateData.staffDailyWage = input.staffDailyWage;
      if (input.partTimeHourlyWage !== undefined) updateData.partTimeHourlyWage = input.partTimeHourlyWage;
      if (input.commissionRate !== undefined) updateData.commissionRate = input.commissionRate;
      if (input.hasManager !== undefined) updateData.hasManager = input.hasManager;
      if (input.glassUnitPrice !== undefined) updateData.glassUnitPrice = input.glassUnitPrice;
      if (input.bottleUnitPrice !== undefined) updateData.bottleUnitPrice = input.bottleUnitPrice;
      if (input.beerBottleUnitPrice !== undefined) updateData.beerBottleUnitPrice = input.beerBottleUnitPrice;

      await db.update(branches).set(updateData).where(eq(branches.id, input.branchId));

      const updated = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
      return updated[0] || null;
    }),

  /**
   * 일별 정산 조회 및 계산
   */
  getDailySettlement: publicProcedure
    .input(z.object({ branchId: z.number(), date: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });

      const record = await db
        .select()
        .from(dailySalesRecords)
        .where(and(eq(dailySalesRecords.branchId, input.branchId), eq(dailySalesRecords.date, input.date)))
        .limit(1);

      if (!record || record.length === 0) {
        return null;
      }

      return record[0];
    }),

  /**
   * 일별 정산 저장 (정산 계산 포함)
   */
  saveDailySettlement: publicProcedure
    .input(
      z.object({
        branchId: z.number(),
        date: z.string(),
        cash: z.string().default('0'),
        card: z.string().default('0'),
        expenses: z.array(z.object({ id: z.string(), description: z.string(), amount: z.string() })).default([]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
      if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });

      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });

      if (account.role !== 'admin' && account.branchId !== input.branchId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });

      // 테이블 기록 조회 (직원 수 및 스탭음료 계산용)
      const tableReport = await db
        .select()
        .from(tableReports)
        .where(and(eq(tableReports.branchId, input.branchId), eq(tableReports.date, input.date)))
        .limit(1);

      const tableReportId = tableReport && tableReport.length > 0 ? tableReport[0].id : null;
      const { staffCount, partTimeCount, managerCount, partTimeTotalHours } = tableReportId
        ? await getStaffCounts(tableReportId)
        : { staffCount: 0, partTimeCount: 0, managerCount: 0, partTimeTotalHours: 0 };

      // 정산 계산
      const cash = Number(input.cash || 0);
      const card = Number(input.card || 0);
      const [year, month] = input.date.split('-').map(Number);

      const settlement = await calculateDailySettlement(
        input.branchId,
        input.date,
        cash,
        card,
        staffCount,
        partTimeCount,
        input.expenses,
        tableReportId,
        managerCount,
        partTimeTotalHours
      );

      // 기존 레코드 확인
      const existing = await db
        .select()
        .from(dailySalesRecords)
        .where(and(eq(dailySalesRecords.branchId, input.branchId), eq(dailySalesRecords.date, input.date)))
        .limit(1);

      let result;
      if (existing && existing.length > 0) {
        // 업데이트
        await db
          .update(dailySalesRecords)
          .set({
            cash: String(cash),
            card: String(card),
            expenses: input.expenses,
            totalRevenue: String(settlement.totalRevenue),
            commissionExpense: String(settlement.commissionExpense),
            rentExpense: String(settlement.rentExpense),
            managementFeeExpense: String(settlement.managementFeeExpense),
            staffWageExpense: String(settlement.staffWageExpense),
            partTimeWageExpense: String(settlement.partTimeWageExpense),
            liquorCostExpense: String(settlement.liquorCostExpense),
            staffDrinkExpense: String(settlement.staffDrinkExpense),
            otherExpense: String(settlement.otherExpense),
            totalExpenses: String(settlement.totalExpenses),
            netProfit: String(settlement.netProfit),
            staffCount,
            partTimeCount,
            submittedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(dailySalesRecords.id, existing[0].id));

        const updated = await db
          .select()
          .from(dailySalesRecords)
          .where(eq(dailySalesRecords.id, existing[0].id))
          .limit(1);
        result = updated[0];
      } else {
        // 생성
        const insertResult = await db.insert(dailySalesRecords).values({
          branchId: input.branchId,
          date: input.date,
          cash: String(cash),
          card: String(card),
          expenses: input.expenses,
          totalRevenue: String(settlement.totalRevenue),
          commissionExpense: String(settlement.commissionExpense),
          rentExpense: String(settlement.rentExpense),
          managementFeeExpense: String(settlement.managementFeeExpense),
          staffWageExpense: String(settlement.staffWageExpense),
          partTimeWageExpense: String(settlement.partTimeWageExpense),
          liquorCostExpense: String(settlement.liquorCostExpense),
          staffDrinkExpense: String(settlement.staffDrinkExpense),
          otherExpense: String(settlement.otherExpense),
          totalExpenses: String(settlement.totalExpenses),
          netProfit: String(settlement.netProfit),
          staffCount,
          partTimeCount,
          submittedAt: new Date(),
        });

        const recordId = (insertResult as any).insertId;
        const created = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.id, recordId)).limit(1);
        result = created[0];
      }

      return result;
    }),

  /**
   * 월 누적 현황 조회
   */
  getMonthlySummary: publicProcedure
    .input(z.object({ branchId: z.number(), year: z.number(), month: z.number() }))
    .query(async ({ ctx, input }) => {
      const summary = await calculateMonthlySummary(input.branchId, input.year, input.month);
      return summary;
    }),

  /**
   * 기간별 정산 조회
   */
  getSettlementsByDateRange: publicProcedure
    .input(z.object({ branchId: z.number(), startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });

      const records = await db
        .select()
        .from(dailySalesRecords)
        .where(
          and(
            eq(dailySalesRecords.branchId, input.branchId),
            gte(dailySalesRecords.date, input.startDate),
            lte(dailySalesRecords.date, input.endDate)
          )
        )
        .orderBy(desc(dailySalesRecords.date));

      return records;
    }),

  /**
   * 오늘 순수익 조회
   */
  getTodayNetProfit: publicProcedure
    .input(z.object({ branchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });

      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      const record = await db
        .select()
        .from(dailySalesRecords)
        .where(and(eq(dailySalesRecords.branchId, input.branchId), eq(dailySalesRecords.date, todayStr)))
        .limit(1);

      if (!record || record.length === 0) {
        return { netProfit: 0, totalRevenue: 0 };
      }

      return {
        netProfit: Number(record[0].netProfit || 0),
        totalRevenue: Number(record[0].totalRevenue || 0),
      };
    }),

  /**
   * 이번 달 누적 순수익 조회
   */
  getMonthlyNetProfit: publicProcedure
    .input(z.object({ branchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth() + 1;

      const summary = await calculateMonthlySummary(input.branchId, year, month);
      return {
        netProfit: summary.netProfit,
        totalRevenue: summary.totalRevenue,
      };
    }),

  /**
   * 모든 지점의 오늘 순수익 조회
   */
  getAllBranchesTodayNetProfit: publicProcedure.query(async ({ ctx }) => {
    const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
    if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });

    const account = await getStoreAccountById(payload.accountId);
    if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });

    if (account.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });

    const allBranches = await db.select().from(branches).orderBy(branches.name);

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const records = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.date, todayStr));

    return allBranches.map(branch => ({
      branchId: branch.id,
      branchName: branch.name,
      netProfit: Number(records.find(r => r.branchId === branch.id)?.netProfit || 0),
      totalRevenue: Number(records.find(r => r.branchId === branch.id)?.totalRevenue || 0),
    }));
  }),
});
