import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import webpush from "web-push";
import { ENV } from "./_core/env";
import {
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptionsByOpenId,
  getBranchesByOwner,
  createBranch,
  getBranchById,
  getDailySalesRecord,
  getDailySalesRecordsByDateRange,
  upsertDailySalesRecord,
  getAllDailySalesRecords,
  getTotalSalesByDateRange,
  getDb,
} from "./db";
import { branches, branchManagers, users, dailySalesRecords } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

// VAPID 설정
if (ENV.vapidPublicKey && ENV.vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@salesdash.app",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
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
  }),

  push: router({
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string(),
        p256dh: z.string(),
        auth: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        await savePushSubscription({
          userId: ctx.user.id,
          endpoint: input.endpoint,
          p256dh: input.p256dh,
          auth: input.auth,
        });
        return { success: true };
      }),

    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await deletePushSubscription(input.endpoint);
        return { success: true };
      }),

    test: protectedProcedure
      .mutation(async ({ ctx }) => {
        const subs = await getPushSubscriptionsByOpenId(ctx.user.openId);
        if (subs.length === 0) return { success: false, message: "구독 없음" };
        const payload = JSON.stringify({
          title: "매출 보고 알림 테스트",
          body: "푸시 알림이 정상적으로 작동합니다! ✅",
        });
        for (const sub of subs) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            );
          } catch (err: any) {
            if (err.statusCode === 410) await deletePushSubscription(sub.endpoint);
          }
        }
        return { success: true };
      }),
  }),

  // 지점 관련 API
  branch: router({
    // 내 지점 조회 (점장: 배정된 지점, 관리자: 전체)
    myBranches: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      if (ctx.user.role === 'admin') {
        // 관리자: 전체 지점 조회
        return db.select().from(branches).orderBy(branches.name);
      } else {
        // 점장: 배정된 지점만
        const managed = await db
          .select({ branch: branches })
          .from(branchManagers)
          .innerJoin(branches, eq(branchManagers.branchId, branches.id))
          .where(eq(branchManagers.userId, ctx.user.id));
        return managed.map(r => r.branch);
      }
    }),

    // 전체 지점 목록 (관리자 전용)
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(branches).orderBy(branches.name);
    }),

    // 지점 생성 (관리자 전용)
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const branch = await createBranch({
          name: input.name,
          code: input.code,
          ownerId: ctx.user.id,
        });
        return { success: true, branch };
      }),

    // 지점 수정 (관리자 전용)
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
        code: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(branches)
          .set({ name: input.name, code: input.code })
          .where(eq(branches.id, input.id));
        return { success: true };
      }),

    // 지점 삭제 (관리자 전용)
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.delete(branches).where(eq(branches.id, input.id));
        return { success: true };
      }),
  }),

  // 사용자 관리 API (관리자 전용)
  user: router({
    // 전체 사용자 목록
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const allUsers = await db.select().from(users).orderBy(users.name);
      // 각 사용자의 배정된 지점 정보도 포함
      const result = await Promise.all(allUsers.map(async (u) => {
        const managed = await db
          .select({ branch: branches })
          .from(branchManagers)
          .innerJoin(branches, eq(branchManagers.branchId, branches.id))
          .where(eq(branchManagers.userId, u.id));
        return {
          ...u,
          assignedBranches: managed.map(r => r.branch),
        };
      }));
      return result;
    }),

    // 사용자 역할 변경 (관리자 전용)
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['user', 'admin']),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.update(users)
          .set({ role: input.role })
          .where(eq(users.id, input.userId));
        return { success: true };
      }),

    // 지점 배정 (관리자 전용)
    assignBranch: adminProcedure
      .input(z.object({
        userId: z.number(),
        branchId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        // 이미 배정되어 있으면 스킵
        const existing = await db.select().from(branchManagers)
          .where(and(
            eq(branchManagers.userId, input.userId),
            eq(branchManagers.branchId, input.branchId)
          )).limit(1);
        if (existing.length === 0) {
          await db.insert(branchManagers).values({
            userId: input.userId,
            branchId: input.branchId,
            role: 'manager',
          });
        }
        return { success: true };
      }),

    // 지점 배정 해제 (관리자 전용)
    unassignBranch: adminProcedure
      .input(z.object({
        userId: z.number(),
        branchId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        await db.delete(branchManagers)
          .where(and(
            eq(branchManagers.userId, input.userId),
            eq(branchManagers.branchId, input.branchId)
          ));
        return { success: true };
      }),
  }),

  // 매출 기록 API
  sales: router({
    // 특정 날짜 기록 조회 (점장: 본인 지점만, 관리자: 모든 지점)
    getRecord: protectedProcedure
      .input(z.object({
        branchId: z.number(),
        date: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        // 권한 확인: 점장은 본인 지점만
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return null;
          const managed = await db.select().from(branchManagers)
            .where(and(
              eq(branchManagers.userId, ctx.user.id),
              eq(branchManagers.branchId, input.branchId)
            )).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }
        return getDailySalesRecord(input.branchId, input.date);
      }),

    // 기간별 기록 조회
    getRecords: protectedProcedure
      .input(z.object({
        branchId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return [];
          const managed = await db.select().from(branchManagers)
            .where(and(
              eq(branchManagers.userId, ctx.user.id),
              eq(branchManagers.branchId, input.branchId)
            )).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }
        return getDailySalesRecordsByDateRange(input.branchId, input.startDate, input.endDate);
      }),

    // 매출 기록 저장 (점장: 본인 지점만)
    save: protectedProcedure
      .input(z.object({
        branchId: z.number(),
        date: z.string(),
        posStartAmount: z.string().default('0'),
        cash: z.string().default('0'),
        card: z.string().default('0'),
        cashTotal: z.string().default('0'),
        cardTotal: z.string().default('0'),
        posEndAmount: z.string().default('0'),
        cashDeposit: z.string().optional(),
        paymentChangeNote: z.string().optional(),
        paymentChangeDate: z.string().optional(),
        paymentChangeAmount: z.string().default('0'),
        expenses: z.array(z.object({
          id: z.string(),
          description: z.string(),
          amount: z.string(),
        })).default([]),
      }))
      .mutation(async ({ ctx, input }) => {
        // 권한 확인
        if (ctx.user.role !== 'admin') {
          const db = await getDb();
          if (!db) return { success: false };
          const managed = await db.select().from(branchManagers)
            .where(and(
              eq(branchManagers.userId, ctx.user.id),
              eq(branchManagers.branchId, input.branchId)
            )).limit(1);
          if (managed.length === 0) throw new Error('접근 권한이 없습니다');
        }

        const record = await upsertDailySalesRecord({
          branchId: input.branchId,
          date: input.date,
          posStartAmount: input.posStartAmount,
          cash: input.cash,
          card: input.card,
          cashTotal: input.cashTotal,
          cardTotal: input.cardTotal,
          posEndAmount: input.posEndAmount,
          paymentChangeNote: input.paymentChangeNote,
          paymentChangeDate: input.paymentChangeDate,
          paymentChangeAmount: input.paymentChangeAmount,
          expenses: input.expenses,
          submittedBy: ctx.user.id,
          submittedAt: new Date(),
        });

        // 알림 전송
        const branch = await getBranchById(input.branchId);
        const branchName = branch?.name ?? '알 수 없는 지점';
        const fmt = (v: string) => {
          const n = Number(v.replace(/,/g, ''));
          return isNaN(n) || n === 0 ? '—' : `₩${n.toLocaleString('ko-KR')}`;
        };
        const dailyTotal = Number(input.cash || 0) + Number(input.card || 0);
        const title = `[${branchName}] ${input.date} 매출 보고`;
        const body = `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)} | 합계: ₩${dailyTotal.toLocaleString('ko-KR')}`;
        const expenseLines = input.expenses
          .filter(e => e.description && e.amount)
          .map(e => `• ${e.description}: ${fmt(e.amount)}`)
          .join('\n');
        const content = [
          `📍 지점: ${branchName}`,
          `📅 날짜: ${input.date}`,
          ``,
          `💰 오늘 매출`,
          `  현금: ${fmt(input.cash)}`,
          `  카드: ${fmt(input.card)}`,
          `  합계: ₩${dailyTotal.toLocaleString('ko-KR')}`,
          ...(expenseLines ? [``, `🧾 지출 내역`, expenseLines] : []),
          ...(input.paymentChangeNote ? [``, `📝 결제변경: ${input.paymentChangeNote}`] : []),
        ].join('\n');

        try { await notifyOwner({ title, content }); } catch {}

        let pushSent = false;
        if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
          try {
            const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
            const payload = JSON.stringify({ title, body });
            for (const sub of subs) {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload
                );
                pushSent = true;
              } catch (err: any) {
                if (err.statusCode === 410) await deletePushSubscription(sub.endpoint);
              }
            }
          } catch {}
        }

        return { success: true, record, pushSent };
      }),

    // 관리자: 전지점 기간별 매출 합계
    adminSummary: adminProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return { byBranch: [], byDate: [] };

        const allBranches = await db.select().from(branches).orderBy(branches.name);
        const branchIds = allBranches.map(b => b.id);

        const records = await db.select().from(dailySalesRecords)
          .where(and(
            ...(branchIds.length > 0 ? [] : [eq(dailySalesRecords.branchId, -1)])
          ))
          .orderBy(desc(dailySalesRecords.date));

        const filtered = records.filter(r =>
          r.date >= input.startDate && r.date <= input.endDate
        );

        // 지점별 합계
        const byBranch = allBranches.map(branch => {
          const branchRecords = filtered.filter(r => r.branchId === branch.id);
          const totalCash = branchRecords.reduce((sum, r) => sum + Number(r.cash || 0), 0);
          const totalCard = branchRecords.reduce((sum, r) => sum + Number(r.card || 0), 0);
          const totalExpense = branchRecords.reduce((sum, r) => {
            return sum + (r.expenses as any[]).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
          }, 0);
          return {
            branch,
            totalCash,
            totalCard,
            total: totalCash + totalCard,
            totalExpense,
            recordCount: branchRecords.length,
          };
        });

        // 날짜별 합계
        const dateMap: Record<string, { totalCash: number; totalCard: number; total: number }> = {};
        filtered.forEach(r => {
          if (!dateMap[r.date]) dateMap[r.date] = { totalCash: 0, totalCard: 0, total: 0 };
          dateMap[r.date].totalCash += Number(r.cash || 0);
          dateMap[r.date].totalCard += Number(r.card || 0);
          dateMap[r.date].total += Number(r.cash || 0) + Number(r.card || 0);
        });
        const byDate = Object.entries(dateMap)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => b.date.localeCompare(a.date));

        return { byBranch, byDate };
      }),

    // 관리자: 전지점 특정 날짜 상세 기록
    adminDailyDetail: adminProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const allBranches = await db.select().from(branches);
        const records = await db.select().from(dailySalesRecords)
          .where(eq(dailySalesRecords.date, input.date));
        return allBranches.map(branch => {
          const record = records.find(r => r.branchId === branch.id) || null;
          return { branch, record };
        });
      }),

    // 레거시 알림 전용 (하위 호환)
    notify: publicProcedure
      .input(z.object({
        branch: z.string(),
        date: z.string(),
        cash: z.string(),
        card: z.string(),
        dailyTotal: z.string(),
        cashTotal: z.string(),
        cardTotal: z.string(),
        grandTotal: z.string(),
        posStartAmount: z.string(),
        posEndAmount: z.string(),
        cashDeposit: z.string().optional(),
        expenses: z.array(z.object({
          description: z.string(),
          amount: z.string(),
        })),
        paymentChangeNote: z.string().optional(),
        paymentChangeAmount: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const fmt = (v: string) => {
          const n = Number(v.replace(/,/g, ''));
          return isNaN(n) || n === 0 ? '—' : `₩${n.toLocaleString('ko-KR')}`;
        };
        const title = `[${input.branch}] ${input.date} 매출 보고`;
        const body = `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)} | 합계: ${fmt(input.dailyTotal)}`;
        const expenseLines = input.expenses
          .filter(e => e.description && e.amount)
          .map(e => `• ${e.description}: ${fmt(e.amount)}`)
          .join('\n');
        const content = [
          `📍 지점: ${input.branch}`,
          `📅 날짜: ${input.date}`,
          `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)}`,
          `📊 합계: ${fmt(input.dailyTotal)}`,
          ...(expenseLines ? [`🧾 지출`, expenseLines] : []),
        ].join('\n');

        try { await notifyOwner({ title, content }); } catch {}

        let pushSent = false;
        if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
          try {
            const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
            const payload = JSON.stringify({ title, body });
            for (const sub of subs) {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload
                );
                pushSent = true;
              } catch (err: any) {
                if (err.statusCode === 410) await deletePushSubscription(sub.endpoint);
              }
            }
          } catch {}
        }

        return { success: true, pushSent };
      }),
  }),
});

export type AppRouter = typeof appRouter;
