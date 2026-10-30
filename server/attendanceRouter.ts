/**
 * 월간 출근부
 * - 직원×일자별 근무시간 / 연장(부족)시간은 테이블 기록의 출근자 정보(staffIncentives)에서 자동 계산해 보여준다.
 * - "급여유무" 체크 표시는 별도 테이블(attendanceChecks)에만 저장한다. 정산/인건비 계산에는 영향이 없다.
 * - 이 파일은 기존 테이블을 읽기만 하고 수정하지 않는다.
 */
import { z } from 'zod';
import { and, eq, like } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { router, publicProcedure } from './_core/trpc';
import { getDb, getStoreAccountById } from './db';
import { branchStaff, staffIncentives, tableReports } from '../drizzle/schema';
import { TRPCError } from '@trpc/server';
import { jwtVerify } from 'jose';
import { ENV } from './_core/env';

const COOKIE_NAME = 'app_session_id';
const STANDARD_MINUTES = 420; // 직원 하루 기준 7시간 (직원 인센티브 통계와 동일)

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

async function requireBranchId(ctx: any, inputBranchId?: number): Promise<number> {
  const payload = await parseStoreCookie(
    ctx.req.headers.cookie,
    ctx.req.headers.authorization as string | undefined
  );
  if (!payload) throw new TRPCError({ code: 'UNAUTHORIZED', message: '로그인이 필요합니다' });
  const account = await getStoreAccountById(payload.accountId);
  if (!account) throw new TRPCError({ code: 'FORBIDDEN', message: '지점 계정이 필요합니다' });
  // 지점 계정은 자기 지점만, 관리자는 선택한 지점
  const branchId = account.branchId ?? inputBranchId;
  if (!branchId) throw new TRPCError({ code: 'BAD_REQUEST', message: '지점을 선택해주세요' });
  return branchId;
}

const rowsOf = (res: any): any[] => {
  const raw = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : (res?.rows ?? []);
  return Array.isArray(raw) ? raw : [];
};

let tableReady = false;
async function ensureChecksTable(db: any) {
  if (tableReady) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS attendanceChecks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branchId INT NOT NULL,
    date VARCHAR(10) NOT NULL,
    staffName VARCHAR(50) NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attendance (branchId, date, staffName)
  )`);
  tableReady = true;
}

function calcMinutes(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(n => isNaN(n))) return null;
  const s = sh * 60 + sm;
  let e = eh * 60 + em;
  if (e <= s) e += 24 * 60; // 자정 넘김
  return e - s;
}

const TYPE_ORDER: Record<string, number> = { manager: 0, deputy: 1, staff: 2, parttime: 3 };

export const attendanceRouter = router({
  // 월간 출근부 조회
  monthly: publicProcedure
    .input(z.object({
      yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
      branchId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const branchId = await requireBranchId(ctx, input.branchId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await ensureChecksTable(db);

      const prefix = `${input.yearMonth}-%`;
      const rows = await db
        .select({
          staffName: staffIncentives.staffName,
          staffType: staffIncentives.staffType,
          date: tableReports.date,
          workStart: staffIncentives.workStart,
          workEnd: staffIncentives.workEnd,
          wageExempt: staffIncentives.wageExempt,
        })
        .from(staffIncentives)
        .innerJoin(tableReports, eq(staffIncentives.tableReportId, tableReports.id))
        .where(and(like(tableReports.date, prefix), eq(tableReports.branchId, branchId)))
        .orderBy(tableReports.date);

      const registered = await db
        .select()
        .from(branchStaff)
        .where(and(eq(branchStaff.branchId, branchId), eq(branchStaff.active, 1)));

      const checkRes: any = await db.execute(
        sql`SELECT date, staffName FROM attendanceChecks WHERE branchId = ${branchId} AND date LIKE ${prefix}`
      );
      const checked = new Set<string>(rowsOf(checkRes).map((r: any) => `${r.staffName ?? r[1]}__${String(r.date ?? r[0]).slice(0, 10)}`));

      // 직원 목록: 직원관리 등록자 + 이번 달 출근 기록에 나온 이름
      type StaffInfo = { name: string; alias: string; staffType: string };
      const staffMap = new Map<string, StaffInfo>();
      for (const s of registered) {
        const name = `${s.alias}(${s.realName})`;
        staffMap.set(name, { name, alias: s.alias, staffType: s.staffType });
      }
      for (const r of rows) {
        if (!staffMap.has(r.staffName)) {
          staffMap.set(r.staffName, { name: r.staffName, alias: r.staffName.split('(')[0], staffType: r.staffType });
        }
      }

      // 일자×직원 칸
      type Cell = { minutes: number | null; diff: number | null; type: string; exempt: boolean };
      const cells: Record<string, Cell> = {}; // key: `${name}__${YYYY-MM-DD}`
      for (const r of rows) {
        const key = `${r.staffName}__${String(r.date).slice(0, 10)}`;
        const mins = calcMinutes(r.workStart, r.workEnd);
        const prev = cells[key];
        const sumMins = mins === null ? (prev?.minutes ?? null) : (prev?.minutes ?? 0) + mins;
        cells[key] = {
          minutes: sumMins,
          diff: null,
          type: r.staffType,
          exempt: !!r.wageExempt || !!prev?.exempt,
        };
      }
      // 연장(부족)시간: 직원(staff)만, 7시간 기준 (직원 인센티브 통계와 같은 기준)
      for (const c of Object.values(cells)) {
        if (c.type === 'staff' && c.minutes !== null) c.diff = c.minutes - STANDARD_MINUTES;
      }

      // 직원별 월 합계 (시급 미대상 칸은 통계와 같이 제외)
      const totals: Record<string, { days: number; minutes: number; diff: number }> = {};
      for (const [key, c] of Object.entries(cells)) {
        if (c.exempt || c.minutes === null) continue;
        const name = key.slice(0, key.lastIndexOf('__'));
        const t = (totals[name] ||= { days: 0, minutes: 0, diff: 0 });
        t.days += 1;
        t.minutes += c.minutes;
        if (c.diff !== null) t.diff += c.diff;
      }

      const staff = Array.from(staffMap.values()).sort((a, b) =>
        (TYPE_ORDER[a.staffType] ?? 9) - (TYPE_ORDER[b.staffType] ?? 9) || a.alias.localeCompare(b.alias, 'ko')
      );

      return {
        branchId,
        yearMonth: input.yearMonth,
        staff,
        cells,
        totals,
        checked: Array.from(checked),
      };
    }),

  // 급여유무 체크 표시 저장 (표시용 — 정산에는 영향 없음)
  setPaid: publicProcedure
    .input(z.object({
      branchId: z.number().optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      staffName: z.string().min(1).max(50),
      checked: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const branchId = await requireBranchId(ctx, input.branchId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await ensureChecksTable(db);
      if (input.checked) {
        await db.execute(
          sql`INSERT IGNORE INTO attendanceChecks (branchId, date, staffName) VALUES (${branchId}, ${input.date}, ${input.staffName})`
        );
      } else {
        await db.execute(
          sql`DELETE FROM attendanceChecks WHERE branchId = ${branchId} AND date = ${input.date} AND staffName = ${input.staffName}`
        );
      }
      return { success: true };
    }),
});
