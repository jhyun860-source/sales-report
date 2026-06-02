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
          commissionRate: String(input.commissionRate),
        });
      }
      return { success: true, managerDailyWage: computedDailyWage, deputyDailyWage: computedDeputyDailyWage };
    }),
});
