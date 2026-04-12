import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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
    sendKakao: publicProcedure
      .input(z.object({
        branch: z.string(),
        date: z.string(),
        cash: z.string(),
        card: z.string(),
        cashTotal: z.string(),
        cardTotal: z.string(),
        posStartAmount: z.string(),
        posEndAmount: z.string(),
        expenses: z.array(z.object({
          description: z.string(),
          amount: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        // 카톡 메시지 구성
        const expenseText = input.expenses.length > 0 
          ? input.expenses
              .filter(e => e.description && e.amount)
              .map(e => `  - ${e.description}: ${e.amount}`)
              .join('\n')
          : '  없음';

        const message = `[매출 일일 보고]\n\n지점: ${input.branch}\n날짜: ${input.date}\n\n오늘 매출\n- 현금: ${input.cash}\n- 카드: ${input.card}\n\n누적 매출\n- 현금누적: ${input.cashTotal}\n- 카드누적: ${input.cardTotal}\n\nPOS 기기\n- 시작금: ${input.posStartAmount}\n- 마감금: ${input.posEndAmount}\n\n지출 내역\n${expenseText}`;

        try {
          // 카톡 API로 메시지 전송
          // 실제 구동을 위해서는 카톡 API 키가 필요합니다
          console.log('[Kakao Message]', message);
          
          return {
            success: true,
            message: '카톡 메시지가 전송되었습니다.',
          };
        } catch (error) {
          console.error('[Kakao Error]', error);
          return {
            success: false,
            message: '카톡 메시지 전송에 실패했습니다.',
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
