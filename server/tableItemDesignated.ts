/**
 * 테이블 기록 "지명" 직원 선택 저장용 도우미.
 *
 * - tableItems 테이블에 designatedStaff(글자 칸) 하나를 추가해 직원 이름 목록(JSON)을 저장한다.
 * - 이 칸은 drizzle 스키마에 넣지 않고 별도 SQL로만 읽고 쓴다.
 *   (스키마에 넣으면 칸이 아직 없는 DB에서 기존 테이블 조회가 전부 실패할 수 있어서,
 *    칸이 없거나 오류가 나도 기존 기능은 그대로 동작하도록 분리함)
 * - 모든 함수는 오류가 나도 예외를 던지지 않는다.
 */
import { sql } from "drizzle-orm";

const rowsOf = (res: any): any[] => {
  const raw = Array.isArray(res) ? (Array.isArray(res[0]) ? res[0] : res) : (res?.rows ?? []);
  return Array.isArray(raw) ? raw : [];
};

/** 서버 시작 시 1회: designatedStaff 칸이 없으면 추가한다. */
export async function ensureDesignatedStaffColumn(db: any): Promise<void> {
  try {
    const res: any = await db.execute(
      sql`SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tableItems' AND COLUMN_NAME = 'designatedStaff'`
    );
    const first: any = rowsOf(res)[0];
    const count = Number(first?.c ?? first?.[0] ?? 0);
    if (count > 0) return;
    await db.execute(sql`ALTER TABLE tableItems ADD COLUMN designatedStaff TEXT NULL`);
    console.log("[designatedStaff] tableItems 칸 추가 완료");
  } catch (e) {
    console.error("[designatedStaff] 칸 확인/추가 실패 (지명 직원 저장 기능만 비활성)", e);
  }
}

/** 한 테이블 항목의 지명 직원 목록 저장 (빈 목록이면 비움) */
export async function saveDesignatedStaff(db: any, itemId: number, names: string[]): Promise<void> {
  try {
    const clean = Array.from(new Set((names ?? []).map((s) => String(s).trim()).filter(Boolean)));
    const json = clean.length > 0 ? JSON.stringify(clean) : null;
    await db.execute(sql`UPDATE tableItems SET designatedStaff = ${json} WHERE id = ${itemId}`);
  } catch (e) {
    console.error("[designatedStaff] 저장 실패", e);
  }
}

/** 한 보고서의 항목별 지명 직원 목록 조회 (itemId -> 직원 이름들) */
export async function loadDesignatedStaff(db: any, reportId: number): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  try {
    const res: any = await db.execute(
      sql`SELECT id, designatedStaff FROM tableItems WHERE tableReportId = ${reportId} AND designatedStaff IS NOT NULL`
    );
    for (const r of rowsOf(res)) {
      const id = Number(r?.id ?? r?.[0]);
      const raw = r?.designatedStaff ?? r?.[1];
      if (!id || !raw) continue;
      try {
        const arr = JSON.parse(String(raw));
        if (Array.isArray(arr)) map.set(id, arr.map((s) => String(s)));
      } catch {
        // 깨진 값은 무시
      }
    }
  } catch (e) {
    console.error("[designatedStaff] 조회 실패", e);
  }
  return map;
}

/** 월별 지명 팀수: 지명(named) 테이블에서 직원 이름이 선택된 횟수 (직원 이름 -> 팀수) */
export async function loadMonthlyDesignatedCounts(
  db: any,
  monthPrefix: string, // 예: '2026-10-%'
  branchId: number | null
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  try {
    const res: any = branchId !== null
      ? await db.execute(sql`SELECT ti.designatedStaff AS ds FROM tableItems ti INNER JOIN tableReports tr ON ti.tableReportId = tr.id WHERE tr.date LIKE ${monthPrefix} AND tr.branchId = ${branchId} AND ti.guestType = 'named' AND ti.designatedStaff IS NOT NULL`)
      : await db.execute(sql`SELECT ti.designatedStaff AS ds FROM tableItems ti INNER JOIN tableReports tr ON ti.tableReportId = tr.id WHERE tr.date LIKE ${monthPrefix} AND ti.guestType = 'named' AND ti.designatedStaff IS NOT NULL`);
    for (const r of rowsOf(res)) {
      const raw = r?.ds ?? r?.[0];
      if (!raw) continue;
      try {
        const arr = JSON.parse(String(raw));
        if (!Array.isArray(arr)) continue;
        for (const name of Array.from(new Set(arr.map((s: any) => String(s))))) {
          counts[name] = (counts[name] || 0) + 1;
        }
      } catch {
        // 깨진 값은 무시
      }
    }
  } catch (e) {
    console.error("[designatedStaff] 월별 팀수 조회 실패", e);
  }
  return counts;
}
