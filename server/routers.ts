import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import webpush from "web-push";
import { ENV } from "./_core/env";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import {
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptionsByOpenId,
  createBranch,
  getBranchById,
  getDailySalesRecord,
  getDailySalesRecordsByDateRange,
  upsertDailySalesRecord,
  getDb,
  getStoreAccountByLoginId,
  getStoreAccountById,
  createStoreAccount,
  updateStoreAccount,
  getAllStoreAccounts,
  deleteStoreAccount,
} from "./db";
import { branches, branchManagers, users, dailySalesRecords, storeAccounts } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// VAPID 설정
if (ENV.vapidPublicKey && ENV.vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@salesdash.app",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
}

// JWT 세션 토큰 생성 (storeAccount용)
async function createStoreSessionToken(accountId: number, loginId: string, role: string): Promise<string> {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT({ accountId, loginId, role, type: 'store' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1000))
    .sign(secret);
}

// 쿠키에서 storeAccount 페이로드 파싱 헬퍼
async function parseStoreCookie(cookieHeader: string | undefined) {
  if (!cookieHeader) return null;
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), v.join('=')];
    })
  );
  const token = cookies[COOKIE_NAME];
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

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // 자체 아이디/비밀번호 로그인
    loginWithPassword: publicProcedure
      .input(z.object({
        loginId: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const account = await getStoreAccountByLoginId(input.loginId);
        if (!account) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '아이디 또는 비밀번호가 올바르지 않습니다' });
        }

        const isValid = await bcrypt.compare(input.password, account.passwordHash);
        if (!isValid) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: '아이디 또는 비밀번호가 올바르지 않습니다' });
        }

        const token = await createStoreSessionToken(account.id, account.loginId, account.role);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        let branch = null;
        if (account.branchId) {
          branch = await getBranchById(account.branchId);
        }

        return {
          success: true,
          account: {
            id: account.id,
            loginId: account.loginId,
            displayName: account.displayName,
            role: account.role,
            branchId: account.branchId,
            branch,
          },
        };
      }),

    // 자체 계정 현재 사용자 조회
    storeMe: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie);
      if (!payload) return null;

      const account = await getStoreAccountById(payload.accountId);
      if (!account) return null;

      let branch = null;
      if (account.branchId) {
        branch = await getBranchById(account.branchId);
      }

      let allBranches = null;
      if (account.role === 'admin') {
        const db = await getDb();
        if (db) {
          allBranches = await db.select().from(branches).orderBy(branches.name);
        }
      }

      return {
        id: account.id,
        loginId: account.loginId,
        displayName: account.displayName,
        role: account.role,
        branchId: account.branchId,
        branch,
        allBranches,
      };
    }),
  }),

  push: router({
    subscribe: protectedProcedure
      .input(z.object({ endpoint: z.string(), p256dh: z.string(), auth: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await savePushSubscription({ userId: ctx.user.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth });
        return { success: true };
      }),
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await deletePushSubscription(input.endpoint);
        return { success: true };
      }),
    test: protectedProcedure.mutation(async ({ ctx }) => {
      const subs = await getPushSubscriptionsByOpenId(ctx.user.openId);
      if (subs.length === 0) return { success: false, message: "구독 없음" };
      const payload = JSON.stringify({ title: "매출 보고 알림 테스트", body: "푸시 알림이 정상적으로 작동합니다! ✅" });
      for (const sub of subs) {
        try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload); }
        catch (err: any) { if (err.statusCode === 410) await deletePushSubscription(sub.endpoint); }
      }
      return { success: true };
    }),
  }),

  branch: router({
    myBranches: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (ctx.user.role === 'admin') return db.select().from(branches).orderBy(branches.name);
      const managed = await db.select({ branch: branches }).from(branchManagers)
        .innerJoin(branches, eq(branchManagers.branchId, branches.id))
        .where(eq(branchManagers.userId, ctx.user.id));
      return managed.map(r => r.branch);
    }),
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(branches).orderBy(branches.name);
    }),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), code: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const branch = await createBranch({ name: input.name, code: input.code, ownerId: ctx.user.id });
        return { success: true, branch };
      }),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1), code: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(branches).set({ name: input.name, code: input.code }).where(eq(branches.id, input.id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.delete(branches).where(eq(branches.id, input.id));
        return { success: true };
      }),
  }),

  user: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const allUsers = await db.select().from(users).orderBy(users.name);
      return Promise.all(allUsers.map(async (u) => {
        const managed = await db.select({ branch: branches }).from(branchManagers)
          .innerJoin(branches, eq(branchManagers.branchId, branches.id))
          .where(eq(branchManagers.userId, u.id));
        return { ...u, assignedBranches: managed.map(r => r.branch) };
      }));
    }),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(['user', 'admin']) }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),
    assignBranch: adminProcedure
      .input(z.object({ userId: z.number(), branchId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const existing = await db.select().from(branchManagers)
          .where(and(eq(branchManagers.userId, input.userId), eq(branchManagers.branchId, input.branchId))).limit(1);
        if (existing.length === 0) {
          await db.insert(branchManagers).values({ userId: input.userId, branchId: input.branchId, role: 'manager' });
        }
        return { success: true };
      }),
    unassignBranch: adminProcedure
      .input(z.object({ userId: z.number(), branchId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.delete(branchManagers).where(and(eq(branchManagers.userId, input.userId), eq(branchManagers.branchId, input.branchId)));
        return { success: true };
      }),
  }),

  // storeAccount 관리 API
  storeAccount: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie);
      if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
      const accounts = await getAllStoreAccounts();
      const db = await getDb();
      const allBranches = db ? await db.select().from(branches) : [];
      return accounts.map(acc => ({
        id: acc.id, loginId: acc.loginId, displayName: acc.displayName,
        role: acc.role, branchId: acc.branchId, createdAt: acc.createdAt,
        branch: allBranches.find(b => b.id === acc.branchId) || null,
      }));
    }),
    create: publicProcedure
      .input(z.object({
        loginId: z.string().min(1).max(50),
        password: z.string().min(1),
        displayName: z.string().optional(),
        role: z.enum(['user', 'admin']).default('user'),
        branchId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        const existing = await getStoreAccountByLoginId(input.loginId);
        if (existing) throw new TRPCError({ code: 'CONFLICT', message: '이미 사용 중인 아이디입니다' });
        const passwordHash = await bcrypt.hash(input.password, 10);
        const account = await createStoreAccount({
          loginId: input.loginId, passwordHash,
          displayName: input.displayName || input.loginId,
          role: input.role, branchId: input.branchId || null,
        });
        return { success: true, account };
      }),
    changePassword: publicProcedure
      .input(z.object({ accountId: z.number(), newPassword: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateStoreAccount(input.accountId, { passwordHash });
        return { success: true };
      }),
    delete: publicProcedure
      .input(z.object({ accountId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        await deleteStoreAccount(input.accountId);
        return { success: true };
      }),
    assignBranch: publicProcedure
      .input(z.object({ accountId: z.number(), branchId: z.number().nullable() }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        await updateStoreAccount(input.accountId, { branchId: input.branchId });
        return { success: true };
      }),
    branchList: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie(ctx.req.headers.cookie);
      if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(branches).orderBy(branches.name);
    }),
  }),

  // 매출 기록 API (storeAccount 기반)
  storeSales: router({
    getRecord: publicProcedure
      .input(z.object({ branchId: z.number(), date: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== input.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
        }
        return getDailySalesRecord(input.branchId, input.date);
      }),
    getPrevRecord: publicProcedure
      .input(z.object({ branchId: z.number(), date: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== input.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
        }
        return getDailySalesRecord(input.branchId, input.date);
      }),
    getRecords: publicProcedure
      .input(z.object({ branchId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== input.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
        }
        return getDailySalesRecordsByDateRange(input.branchId, input.startDate, input.endDate);
      }),
    save: publicProcedure
      .input(z.object({
        branchId: z.number(), date: z.string(),
        posStartAmount: z.string().default('0'), cash: z.string().default('0'), card: z.string().default('0'),
        cashTotal: z.string().default('0'), cardTotal: z.string().default('0'), posEndAmount: z.string().default('0'),
        cashDeposit: z.string().optional(), paymentChangeNote: z.string().optional(),
        paymentChangeDate: z.string().optional(), paymentChangeAmount: z.string().default('0'),
        expenses: z.array(z.object({ id: z.string(), description: z.string(), amount: z.string() })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
        const account = await getStoreAccountById(payload.accountId);
        if (!account) throw new TRPCError({ code: 'UNAUTHORIZED', message: '계정을 찾을 수 없습니다' });
        if (account.role !== 'admin' && account.branchId !== input.branchId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: '접근 권한이 없습니다' });
        }
        const record = await upsertDailySalesRecord({
          branchId: input.branchId, date: input.date,
          posStartAmount: input.posStartAmount, cash: input.cash, card: input.card,
          cashTotal: input.cashTotal, cardTotal: input.cardTotal, posEndAmount: input.posEndAmount,
          paymentChangeNote: input.paymentChangeNote, paymentChangeDate: input.paymentChangeDate,
          paymentChangeAmount: input.paymentChangeAmount, expenses: input.expenses, submittedAt: new Date(),
        });
        const branch = await getBranchById(input.branchId);
        const branchName = branch?.name ?? '알 수 없는 지점';
        const fmt = (v: string) => { const n = Number((v||''). replace(/,/g,'')); return isNaN(n)||n===0?'—':`₩${n.toLocaleString('ko-KR')}`; };
        const dailyTotal = Number(input.cash||0)+Number(input.card||0);
        const title = `[${branchName}] ${input.date} 매출 보고`;
        const body = `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)} | 합계: ₩${dailyTotal.toLocaleString('ko-KR')}`;
        const expenseLines = input.expenses.filter(e=>e.description&&e.amount).map(e=>`• ${e.description}: ${fmt(e.amount)}`).join('\n');
        const content = [`📍 지점: ${branchName}`,`📅 날짜: ${input.date}`,'','💰 오늘 매출',`  현금: ${fmt(input.cash)}`,`  카드: ${fmt(input.card)}`,`  합계: ₩${dailyTotal.toLocaleString('ko-KR')}`, ...(expenseLines?['',"🧾 지출 내역",expenseLines]:[]), ...(input.paymentChangeNote?['',"📝 결제변경: "+input.paymentChangeNote]:[])].join('\n');
        try { await notifyOwner({ title, content }); } catch {}
        let pushSent = false;
        if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
          try {
            const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
            for (const sub of subs) {
              try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body })); pushSent = true; }
              catch (err: any) { if (err.statusCode === 410) await deletePushSubscription(sub.endpoint); }
            }
          } catch {}
        }
        return { success: true, record, pushSent };
      }),
    adminDailyDetail: publicProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        const db = await getDb();
        if (!db) return [];
        const allBranches = await db.select().from(branches).orderBy(branches.name);
        const records = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.date, input.date));
        return allBranches.map(branch => ({ branch, record: records.find(r => r.branchId === branch.id) || null }));
      }),
    adminSummary: publicProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ ctx, input }) => {
        const payload = await parseStoreCookie(ctx.req.headers.cookie);
        if (!payload || payload.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: '관리자만 접근 가능합니다' });
        const db = await getDb();
        if (!db) return { byBranch: [], byDate: [] };
        const allBranches = await db.select().from(branches).orderBy(branches.name);
        const records = await db.select().from(dailySalesRecords).orderBy(desc(dailySalesRecords.date));
        const filtered = records.filter(r => r.date >= input.startDate && r.date <= input.endDate);
        const byBranch = allBranches.map(branch => {
          const br = filtered.filter(r => r.branchId === branch.id);
          const totalCash = br.reduce((s,r)=>s+Number(r.cash||0),0);
          const totalCard = br.reduce((s,r)=>s+Number(r.card||0),0);
          const totalExpense = br.reduce((s,r)=>s+(r.expenses as any[]).reduce((ss:number,e:any)=>ss+Number(e.amount||0),0),0);
          return { branch, totalCash, totalCard, total: totalCash+totalCard, totalExpense, recordCount: br.length };
        });
        const dateMap: Record<string,{totalCash:number;totalCard:number;total:number}> = {};
        filtered.forEach(r => {
          if (!dateMap[r.date]) dateMap[r.date]={totalCash:0,totalCard:0,total:0};
          dateMap[r.date].totalCash+=Number(r.cash||0); dateMap[r.date].totalCard+=Number(r.card||0); dateMap[r.date].total+=Number(r.cash||0)+Number(r.card||0);
        });
        const byDate = Object.entries(dateMap).map(([date,data])=>({date,...data})).sort((a,b)=>b.date.localeCompare(a.date));
        return { byBranch, byDate };
      }),
  }),

  // 기존 Manus OAuth 기반 매출 API (하위 호환)
  sales: router({
    getRecord: protectedProcedure
      .input(z.object({ branchId: z.number(), date: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return null;
          const managed = await db.select().from(branchManagers)
            .where(and(eq(branchManagers.userId, ctx.user.id), eq(branchManagers.branchId, input.branchId))).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }
        return getDailySalesRecord(input.branchId, input.date);
      }),
    getRecords: protectedProcedure
      .input(z.object({ branchId: z.number(), startDate: z.string(), endDate: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return [];
          const managed = await db.select().from(branchManagers)
            .where(and(eq(branchManagers.userId, ctx.user.id), eq(branchManagers.branchId, input.branchId))).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }
        return getDailySalesRecordsByDateRange(input.branchId, input.startDate, input.endDate);
      }),
    save: protectedProcedure
      .input(z.object({
        branchId: z.number(), date: z.string(),
        posStartAmount: z.string().default('0'), cash: z.string().default('0'), card: z.string().default('0'),
        cashTotal: z.string().default('0'), cardTotal: z.string().default('0'), posEndAmount: z.string().default('0'),
        cashDeposit: z.string().optional(), paymentChangeNote: z.string().optional(),
        paymentChangeDate: z.string().optional(), paymentChangeAmount: z.string().default('0'),
        expenses: z.array(z.object({ id: z.string(), description: z.string(), amount: z.string() })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return { success: false };
          const managed = await db.select().from(branchManagers)
            .where(and(eq(branchManagers.userId, ctx.user.id), eq(branchManagers.branchId, input.branchId))).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }
        const record = await upsertDailySalesRecord({
          branchId: input.branchId, date: input.date,
          posStartAmount: input.posStartAmount, cash: input.cash, card: input.card,
          cashTotal: input.cashTotal, cardTotal: input.cardTotal, posEndAmount: input.posEndAmount,
          paymentChangeNote: input.paymentChangeNote, paymentChangeDate: input.paymentChangeDate,
          paymentChangeAmount: input.paymentChangeAmount, expenses: input.expenses,
          submittedBy: ctx.user.id, submittedAt: new Date(),
        });
        const branch = await getBranchById(input.branchId);
        const branchName = branch?.name ?? '알 수 없는 지점';
        const fmt = (v: string) => { const n = Number((v||''). replace(/,/g,'')); return isNaN(n)||n===0?'—':`₩${n.toLocaleString('ko-KR')}`; };
        const dailyTotal = Number(input.cash||0)+Number(input.card||0);
        const title = `[${branchName}] ${input.date} 매출 보고`;
        const body = `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)} | 합계: ₩${dailyTotal.toLocaleString('ko-KR')}`;
        try { await notifyOwner({ title, content: body }); } catch {}
        let pushSent = false;
        if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
          try {
            const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
            for (const sub of subs) {
              try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body })); pushSent = true; }
              catch (err: any) { if (err.statusCode === 410) await deletePushSubscription(sub.endpoint); }
            }
          } catch {}
        }
        return { success: true, record, pushSent };
      }),
    adminSummary: adminProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { byBranch: [], byDate: [] };
        const allBranches = await db.select().from(branches).orderBy(branches.name);
        const records = await db.select().from(dailySalesRecords).orderBy(desc(dailySalesRecords.date));
        const filtered = records.filter(r => r.date >= input.startDate && r.date <= input.endDate);
        const byBranch = allBranches.map(branch => {
          const br = filtered.filter(r => r.branchId === branch.id);
          const totalCash = br.reduce((s,r)=>s+Number(r.cash||0),0);
          const totalCard = br.reduce((s,r)=>s+Number(r.card||0),0);
          const totalExpense = br.reduce((s,r)=>s+(r.expenses as any[]).reduce((ss:number,e:any)=>ss+Number(e.amount||0),0),0);
          return { branch, totalCash, totalCard, total: totalCash+totalCard, totalExpense, recordCount: br.length };
        });
        const dateMap: Record<string,{totalCash:number;totalCard:number;total:number}> = {};
        filtered.forEach(r => {
          if (!dateMap[r.date]) dateMap[r.date]={totalCash:0,totalCard:0,total:0};
          dateMap[r.date].totalCash+=Number(r.cash||0); dateMap[r.date].totalCard+=Number(r.card||0); dateMap[r.date].total+=Number(r.cash||0)+Number(r.card||0);
        });
        const byDate = Object.entries(dateMap).map(([date,data])=>({date,...data})).sort((a,b)=>b.date.localeCompare(a.date));
        return { byBranch, byDate };
      }),
    adminDailyDetail: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const allBranches = await db.select().from(branches);
        const records = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.date, input.date));
        return allBranches.map(branch => ({ branch, record: records.find(r => r.branchId === branch.id) || null }));
      }),
    notify: publicProcedure
      .input(z.object({
        branch: z.string(), date: z.string(), cash: z.string(), card: z.string(),
        dailyTotal: z.string(), cashTotal: z.string(), cardTotal: z.string(), grandTotal: z.string(),
        posStartAmount: z.string(), posEndAmount: z.string(), cashDeposit: z.string().optional(),
        expenses: z.array(z.object({ description: z.string(), amount: z.string() })),
        paymentChangeNote: z.string().optional(), paymentChangeAmount: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const fmt = (v: string) => { const n = Number((v||''). replace(/,/g,'')); return isNaN(n)||n===0?'—':`₩${n.toLocaleString('ko-KR')}`; };
        const title = `[${input.branch}] ${input.date} 매출 보고`;
        const body = `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)} | 합계: ${fmt(input.dailyTotal)}`;
        try { await notifyOwner({ title, content: body }); } catch {}
        let pushSent = false;
        if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
          try {
            const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
            for (const sub of subs) {
              try { await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body })); pushSent = true; }
              catch (err: any) { if (err.statusCode === 410) await deletePushSubscription(sub.endpoint); }
            }
          } catch {}
        }
        return { success: true, pushSent };
      }),
  }),
});

export type AppRouter = typeof appRouter;
