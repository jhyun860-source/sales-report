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
import { sql } from 'drizzle-orm';
import { HISTORICAL_MONTHLY } from './historicalMonthly';
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

// 점장 월말 추가인센 (월별·지점별 1건). 일별 기록은 건드리지 않고 월 요약의 "관리자 인건비"에만 합산한다.
let managerBonusTableReady = false;
async function ensureManagerBonusTable(db: any) {
  if (managerBonusTableReady) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS managerMonthlyBonus (
    branchId INT NOT NULL,
    yearMonth VARCHAR(7) NOT NULL,
    amount DECIMAL(15,0) NOT NULL DEFAULT 0,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (branchId, yearMonth)
  )`);
  managerBonusTableReady = true;
}

async function requireAdminAccount(ctx: any) {
  const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
  if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
  const account = await getStoreAccountById(payload.accountId);
  if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
  if (account.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
}

// 총 정산(연간)은 V1 아이디(관리자) 전용
async function requireV1Account(ctx: any) {
  const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization as string | undefined);
  if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
  const account = await getStoreAccountById(payload.accountId);
  if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
  if (account.role !== 'admin' || String(account.loginId).toLowerCase() !== 'v1') {
    throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
  }
}

export const settlementRouter = router({
  /**
   * 점장 월말 추가인센 조회 / 저장 (관리자 전용)
   */
  getManagerBonus: publicProcedure
    .input(z.object({ branchId: z.number(), yearMonth: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      await requireAdminAccount(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });
      await ensureManagerBonusTable(db);
      const res: any = await db.execute(
        sql`SELECT amount FROM managerMonthlyBonus WHERE branchId = ${input.branchId} AND yearMonth = ${input.yearMonth} LIMIT 1`
      );
      const raw = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : (res?.rows ?? []);
      const row: any = Array.isArray(raw) ? raw[0] : undefined;
      return { amount: Number(row?.amount ?? row?.[0] ?? 0) || 0 };
    }),

  setManagerBonus: publicProcedure
    .input(z.object({
      branchId: z.number(),
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
      amount: z.number().int().min(0).max(1000000000),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireAdminAccount(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });
      await ensureManagerBonusTable(db);
      await db.execute(
        sql`INSERT INTO managerMonthlyBonus (branchId, yearMonth, amount) VALUES (${input.branchId}, ${input.yearMonth}, ${input.amount})
            ON DUPLICATE KEY UPDATE amount = VALUES(amount)`
      );
      return { success: true, amount: input.amount };
    }),

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
   * 연간 총 정산: 월별 총매출 / 순수익 (점장 월말 추가인센 반영) — 관리자 전용
   * branchId 없으면 전 지점 합계
   */
  getYearlySummary: publicProcedure
    .input(z.object({ year: z.number().int().min(2000).max(2100), branchId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      await requireV1Account(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });
      await ensureManagerBonusTable(db);

      // 지점 선택과 상관없이 그 해 전 지점 기록을 먼저 모은다 (그 해에 영업한 지점 목록을 만들기 위함)
      const records = await db
        .select()
        .from(dailySalesRecords)
        .where(and(gte(dailySalesRecords.date, `${input.year}-01-01`), lte(dailySalesRecords.date, `${input.year}-12-31`)));

      // 지점·월별로 먼저 모은 뒤(앱 일별 기록), 확정 실적(스프레드시트)이 있는 달·지점은 그 값으로 교체한다
      const cell = new Map<string, { revenue: number; netProfit: number; fixed: boolean }>();
      const keyOf = (m: number, b: number) => `${m}-${b}`;
      for (const r of records) {
        const m = Number(String(r.date).slice(5, 7));
        if (!(m >= 1 && m <= 12)) continue;
        const c = cell.get(keyOf(m, r.branchId)) ?? { revenue: 0, netProfit: 0, fixed: false };
        c.revenue += Number(r.totalRevenue || 0);
        c.netProfit += Number(r.netProfit || 0);
        cell.set(keyOf(m, r.branchId), c);
      }
      for (const h of HISTORICAL_MONTHLY) {
        if (h.year !== input.year) continue;
        cell.set(keyOf(h.month, h.branchId), { revenue: h.revenue, netProfit: h.netProfit, fixed: true });
      }

      const bonusRes: any = await db.execute(
        sql`SELECT branchId, yearMonth, amount FROM managerMonthlyBonus WHERE yearMonth LIKE ${`${input.year}-%`}`
      );
      const bonusRaw = Array.isArray(bonusRes) ? (Array.isArray(bonusRes[0]) ? bonusRes[0] : bonusRes) : (bonusRes?.rows ?? []);
      for (const r of (Array.isArray(bonusRaw) ? bonusRaw : []) as any[]) {
        const bId = Number(r.branchId ?? r[0]);
        const m = Number(String(r.yearMonth ?? r[1]).slice(5, 7));
        if (!(m >= 1 && m <= 12)) continue;
        const c = cell.get(keyOf(m, bId));
        if (c?.fixed) continue; // 확정 실적에는 이미 반영된 값이므로 다시 빼지 않음
        const amt = Number(r.amount ?? r[2] ?? 0) || 0;
        if (c) c.netProfit -= amt;
        else cell.set(keyOf(m, bId), { revenue: 0, netProfit: -amt, fixed: false });
      }

      const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, netProfit: 0, hasData: false }));
      const activeBranches = new Set<number>(); // 그 해에 실제 실적(매출 또는 순수익)이 있었던 지점
      for (const [k, c] of Array.from(cell.entries())) {
        const [mStr, bStr] = k.split('-');
        const m = Number(mStr);
        const bId = Number(bStr);
        if (c.revenue !== 0 || c.netProfit !== 0) activeBranches.add(bId);
        if (input.branchId !== undefined && bId !== input.branchId) continue;
        months[m - 1].revenue += c.revenue;
        months[m - 1].netProfit += c.netProfit;
        months[m - 1].hasData = true;
      }
      return { year: input.year, months, branchIds: Array.from(activeBranches).sort((a, b) => a - b) };
    }),

  /**
   * 전 지점 월 누적 순수익 (1일 ~ 오늘, 점장 월말 추가인센 반영) — 관리자 전용
   */
  getAllBranchesMonthToDate: publicProcedure
    .input(z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .query(async ({ ctx, input }) => {
      await requireAdminAccount(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '데이터베이스 연결 실패' });
      await ensureManagerBonusTable(db);

      const allBranches = await db.select().from(branches).orderBy(branches.name);
      const records = await db
        .select()
        .from(dailySalesRecords)
        .where(and(gte(dailySalesRecords.date, input.startDate), lte(dailySalesRecords.date, input.endDate)));

      const bonusRes: any = await db.execute(
        sql`SELECT branchId, amount FROM managerMonthlyBonus WHERE yearMonth = ${input.yearMonth}`
      );
      const bonusRaw = Array.isArray(bonusRes) ? (Array.isArray(bonusRes[0]) ? bonusRes[0] : bonusRes) : (bonusRes?.rows ?? []);
      const bonusMap = new Map<number, number>();
      for (const r of (Array.isArray(bonusRaw) ? bonusRaw : []) as any[]) {
        bonusMap.set(Number(r.branchId ?? r[0]), Number(r.amount ?? r[1] ?? 0) || 0);
      }

      return allBranches.map(branch => {
        const mine = records.filter(r => r.branchId === branch.id);
        const revenue = mine.reduce((sum, r) => sum + Number(r.totalRevenue || 0), 0);
        const net = mine.reduce((sum, r) => sum + Number(r.netProfit || 0), 0);
        return {
          branchId: branch.id,
          branchName: branch.name,
          totalRevenue: revenue,
          netProfit: net - (bonusMap.get(branch.id) ?? 0),
        };
      });
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

  // 정산 계산 디버그
  debugCalculate: publicProcedure
    .input(z.object({ branchId: z.number(), date: z.string(), managerCount: z.number().default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      const dbExists = !!db;
      const dbUrl = !!process.env.DATABASE_URL;
      const { branchSettings } = await import('../drizzle/schema');
      const branchData = db ? await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1) : [];
      const bsData = db ? await db.select().from(branchSettings).where(eq(branchSettings.branchId, input.branchId)).limit(1) : [];
      const result = await calculateDailySettlement(input.branchId, input.date, 0, 0, 0, 0, [], null, input.managerCount, 0);
      return {
        dbExists,
        dbUrl,
        managerCount: input.managerCount,
        managerWageExpense: result.managerWageExpense,
        rentExpense: result.rentExpense,
        branchFound: branchData.length > 0,
        branchName: branchData.length > 0 ? (branchData[0] as any).name : null,
        bsFound: bsData.length > 0,
        bsManagerDailyWage: bsData.length > 0 ? String((bsData[0] as any).managerDailyWage) : null,
      };
    }),
});
