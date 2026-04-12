import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import webpush from "web-push";
import { ENV } from "./_core/env";
import {
  savePushSubscription,
  deletePushSubscription,
  getPushSubscriptionsByOpenId,
} from "./db";

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
      return {
        success: true,
      } as const;
    }),
  }),

  push: router({
    // 구독 등록
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

    // 구독 해제
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ input }) => {
        await deletePushSubscription(input.endpoint);
        return { success: true };
      }),

    // 테스트 알림 발송
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
            if (err.statusCode === 410) {
              await deletePushSubscription(sub.endpoint);
            }
          }
        }
        return { success: true };
      }),
  }),

  sales: router({
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
        const expenseLines = input.expenses
          .filter(e => e.description && e.amount)
          .map(e => `• ${e.description}: ₩${Number(e.amount).toLocaleString('ko-KR')}`)
          .join('\n');

        const fmt = (v: string) => {
          const n = Number(v.replace(/,/g, ''));
          return isNaN(n) || n === 0 ? '—' : `₩${n.toLocaleString('ko-KR')}`;
        };

        const title = `[${input.branch}] ${input.date} 매출 보고`;

        const body = [
          `💰 현금: ${fmt(input.cash)} / 카드: ${fmt(input.card)}`,
          `📊 합계: ${fmt(input.dailyTotal)}`,
          ...(expenseLines ? [`🧾 지출 있음`] : []),
        ].join(' | ');

        const content = [
          `📍 지점: ${input.branch}`,
          `📅 날짜: ${input.date}`,
          ``,
          `💰 오늘 매출`,
          `  현금: ${fmt(input.cash)}`,
          `  카드: ${fmt(input.card)}`,
          `  합계: ${fmt(input.dailyTotal)}`,
          ``,
          `📊 누적 매출`,
          `  현금누적: ${fmt(input.cashTotal)}`,
          `  카드누적: ${fmt(input.cardTotal)}`,
          `  총누적: ${fmt(input.grandTotal)}`,
          ``,
          `🖥️ POS`,
          `  시작금: ${fmt(input.posStartAmount)}`,
          ...(input.cashDeposit && Number(input.cashDeposit) > 0 ? [`  시제 입금: ${fmt(input.cashDeposit)}`] : []),
          `  마감금: ${fmt(input.posEndAmount)}`,
          ...(expenseLines ? [``, `🧾 지출 내역`, expenseLines] : []),
          ...(input.paymentChangeNote ? [``, `📝 결제변경: ${input.paymentChangeNote}${input.paymentChangeAmount ? ` (${fmt(input.paymentChangeAmount)})` : ''}`] : []),
        ].join('\n');

        // Manus 내장 알림
        try {
          await notifyOwner({ title, content });
        } catch (error) {
          console.error('[Notify Error]', error);
        }

        // 웹 푸시 알림 (사장님 openId로 구독 조회)
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
                if (err.statusCode === 410) {
                  await deletePushSubscription(sub.endpoint);
                }
              }
            }
          } catch (error) {
            console.error('[Push Error]', error);
          }
        }

        return { success: true, pushSent };
      }),
  }),
});

export type AppRouter = typeof appRouter;
