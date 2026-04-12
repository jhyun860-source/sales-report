import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

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

        try {
          const result = await notifyOwner({ title, content });
          return { success: result };
        } catch (error) {
          console.error('[Notify Error]', error);
          return { success: false };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
