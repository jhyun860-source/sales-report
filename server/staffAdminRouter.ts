import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { router, publicProcedure } from './_core/trpc';
import { getDb, getStoreAccountById } from './db';
import { branchStaff } from '../drizzle/schema';
import { TRPCError } from '@trpc/server';
import { jwtVerify } from 'jose';
import { ENV } from './_core/env';

const COOKIE_NAME = 'app_session_id';

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

async function requireEffectiveBranchId(ctx: any, inputBranchId?: number) {
  const payload = await parseStoreCookie(
    ctx.req.headers.cookie,
    ctx.req.headers.authorization as string | undefined
  );
  if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
  const account = await getStoreAccountById(payload.accountId);
  if (!account) throw new TRPCError({ code: 'FORBIDDEN', message: '지점 계정이 필요합니다' });
  const effectiveBranchId = account.branchId ?? inputBranchId;
  if (!effectiveBranchId) throw new TRPCError({ code: 'BAD_REQUEST', message: '지점을 선택해주세요' });
  return effectiveBranchId;
}

export const staffAdminRouter = router({
  // 지점 직원 목록 (재직중만)
  list: publicProcedure
    .input(z.object({ branchId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const effectiveBranchId = await requireEffectiveBranchId(ctx, input.branchId);
      const rows = await db.select().from(branchStaff)
        .where(and(eq(branchStaff.branchId, effectiveBranchId), eq(branchStaff.active, 1)));
      return rows;
    }),

  // 직원 등록
  create: publicProcedure
    .input(z.object({
      branchId: z.number().optional(),
      realName: z.string().min(1),
      alias: z.string().min(1),
      staffType: z.enum(['staff', 'parttime', 'manager', 'deputy']),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const effectiveBranchId = await requireEffectiveBranchId(ctx, input.branchId);
      await db.insert(branchStaff).values({
        branchId: effectiveBranchId,
        realName: input.realName,
        alias: input.alias,
        staffType: input.staffType,
        active: 1,
      });
      return { ok: true };
    }),

  // 직원 삭제 (실제 삭제 대신 active=0으로 목록에서만 숨김 - 과거 인센티브 기록과의 연결 보존)
  remove: publicProcedure
    .input(z.object({ id: z.number(), branchId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const effectiveBranchId = await requireEffectiveBranchId(ctx, input.branchId);
      await db.update(branchStaff)
        .set({ active: 0 })
        .where(and(eq(branchStaff.id, input.id), eq(branchStaff.branchId, effectiveBranchId)));
      return { ok: true };
    }),
});
