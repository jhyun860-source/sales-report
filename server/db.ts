import { eq, and, gte, lte, desc, lt, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, branches, branchManagers, dailySalesRecords, pushSubscriptions, storeAccounts, type Branch, type BranchManager, type DailySalesRecord, type InsertBranch, type InsertBranchManager, type InsertDailySalesRecord, type InsertPushSubscription, type PushSubscription, type StoreAccount, type InsertStoreAccount } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!_pool) {
        _pool = mysql.createPool({
          uri: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: true },
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      }
      _db = drizzle(_pool);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * 지점 관리 쿼리
 */

// 사용자가 소유한 모든 지점 조회
export async function getBranchesByOwner(ownerId: number): Promise<Branch[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).where(eq(branches.ownerId, ownerId));
}

// 지점 생성
export async function createBranch(data: InsertBranch): Promise<Branch | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(branches).values(data);
  const branchId = (result as any).insertId;
  if (!branchId) return null;
  const created = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  return created[0] || null;
}

// 지점 조회
export async function getBranchById(branchId: number): Promise<Branch | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  return result[0] || null;
}

/**
 * 매출 기록 쿼리
 */

// 특정 지점의 특정 날짜 매출 기록 조회
export async function getDailySalesRecord(branchId: number, date: string): Promise<DailySalesRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailySalesRecords)
    .where(and(eq(dailySalesRecords.branchId, branchId), eq(dailySalesRecords.date, date)))
    .limit(1);
  return result[0] || null;
}

// 특정 날짜 이전의 가장 최근 기록 조회 (현금누적/카드누적 계산용)
export async function getPrevDailySalesRecord(branchId: number, beforeDate: string): Promise<DailySalesRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailySalesRecords)
    .where(and(eq(dailySalesRecords.branchId, branchId), lt(dailySalesRecords.date, beforeDate)))
    .orderBy(desc(dailySalesRecords.date))
    .limit(1);
  return result[0] || null;
}


// 특정 날짜 이전의 가장 최근 POS 마감금이 0보다 큰 기록 조회
// 중간 날짜가 저장되지 않았거나 POS가 0으로 저장된 날이 있어도 마지막 유효 마감금을 다음 시작금으로 이월하기 위함
export async function getPrevDailySalesRecordWithPosEnd(branchId: number, beforeDate: string): Promise<DailySalesRecord | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(dailySalesRecords)
    .where(and(eq(dailySalesRecords.branchId, branchId), lt(dailySalesRecords.date, beforeDate)))
    .orderBy(desc(dailySalesRecords.date))
    .limit(120);

  return result.find((rec) => (parseInt(rec.posEndAmount || '0') || 0) > 0) || result[0] || null;
}

// 특정 지점의 기간별 매출 기록 조회
export async function getDailySalesRecordsByDateRange(
  branchId: number,
  startDate: string,
  endDate: string
): Promise<DailySalesRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dailySalesRecords)
    .where(
      and(
        eq(dailySalesRecords.branchId, branchId),
        gte(dailySalesRecords.date, startDate),
        lte(dailySalesRecords.date, endDate)
      )
    )
    .orderBy(desc(dailySalesRecords.date));
}

// 매출 기록 생성 또는 업데이트
export async function upsertDailySalesRecord(data: InsertDailySalesRecord): Promise<DailySalesRecord | null> {
  const db = await getDb();
  if (!db) return null;

  const existing = await getDailySalesRecord(data.branchId, data.date);

  if (existing) {
    await db
      .update(dailySalesRecords)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(dailySalesRecords.id, existing.id));

    const updated = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.id, existing.id)).limit(1);
    return updated[0] || null;
  } else {
    const result = await db.insert(dailySalesRecords).values(data);
    const recordId = (result as any).insertId;
    if (!recordId) return null;
    const created = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.id, recordId)).limit(1);
    return created[0] || null;
  }
}

// 특정 지점의 모든 기록 조회 (최신순)
export async function getAllDailySalesRecords(branchId: number, limit: number = 100): Promise<DailySalesRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dailySalesRecords)
    .where(eq(dailySalesRecords.branchId, branchId))
    .orderBy(desc(dailySalesRecords.date))
    .limit(limit);
}

// 여러 지점의 특정 날짜 매출 합계
export async function getTotalSalesByDate(branchIds: number[], date: string) {
  const db = await getDb();
  if (!db) return null;

  const records = await db
    .select()
    .from(dailySalesRecords)
    .where(eq(dailySalesRecords.date, date));

  const filtered = records.filter(r => branchIds.includes(r.branchId));

  let totalCash = 0;
  let totalCard = 0;
  let totalExpense = 0;

  filtered.forEach(record => {
    totalCash += Number(record.cash || 0);
    totalCard += Number(record.card || 0);
    record.expenses?.forEach((exp: any) => {
      totalExpense += Number(exp.amount || 0);
    });
  });

  return {
    date,
    totalCash,
    totalCard,
    totalExpense,
    total: totalCash + totalCard,
    recordCount: filtered.length,
  };
}

// 여러 지점의 기간별 매출 합계
export async function getTotalSalesByDateRange(branchIds: number[], startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  const records = await db
    .select()
    .from(dailySalesRecords)
    .where(
      and(
        gte(dailySalesRecords.date, startDate),
        lte(dailySalesRecords.date, endDate)
      )
    );

  const filtered = records.filter(r => branchIds.includes(r.branchId));

  const grouped: Record<string, { totalCash: number; totalCard: number; totalExpense: number; recordCount: number }> = {};

  filtered.forEach(record => {
    if (!grouped[record.date]) {
      grouped[record.date] = { totalCash: 0, totalCard: 0, totalExpense: 0, recordCount: 0 };
    }
    grouped[record.date].totalCash += Number(record.cash || 0);
    grouped[record.date].totalCard += Number(record.card || 0);
    record.expenses?.forEach((exp: any) => {
      grouped[record.date].totalExpense += Number(exp.amount || 0);
    });
    grouped[record.date].recordCount += 1;
  });

  return Object.entries(grouped).map(([date, data]) => ({
    date,
    ...data,
    total: data.totalCash + data.totalCard,
  }));
}

/**
 * 웹 푸시 구독 쿼리
 */

// 구독 저장 (이미 있으면 업데이트)
export async function savePushSubscription(data: InsertPushSubscription): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // 같은 userId + endpoint 조합이 있으면 삭제 후 재삽입
  await db.delete(pushSubscriptions).where(
    and(eq(pushSubscriptions.userId, data.userId), eq(pushSubscriptions.endpoint, data.endpoint))
  );
  await db.insert(pushSubscriptions).values(data);
}

// 특정 사용자의 모든 구독 조회
export async function getPushSubscriptionsByUserId(userId: number): Promise<PushSubscription[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

// 구독 삭제
export async function deletePushSubscription(endpoint: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

// 특정 openId를 가진 사용자의 모든 구독 조회
export async function getPushSubscriptionsByOpenId(openId: string): Promise<PushSubscription[]> {
  const db = await getDb();
  if (!db) return [];
  const user = await getUserByOpenId(openId);
  if (!user) return [];
  return getPushSubscriptionsByUserId(user.id);
}

/**
 * storeAccounts (자체 아이디/비밀번호 계정) 쿼리
 */

// loginId로 계정 조회
export async function getStoreAccountByLoginId(loginId: string): Promise<StoreAccount | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeAccounts).where(eq(storeAccounts.loginId, loginId)).limit(1);
  return result[0] || null;
}

// id로 계정 조회
export async function getStoreAccountById(id: number): Promise<StoreAccount | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeAccounts).where(eq(storeAccounts.id, id)).limit(1);
  return result[0] || null;
}

// 계정 생성
export async function createStoreAccount(data: InsertStoreAccount): Promise<StoreAccount | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(storeAccounts).values(data);
  const accountId = (result as any).insertId;
  if (!accountId) return null;
  return getStoreAccountById(accountId);
}

// 계정 업데이트
export async function updateStoreAccount(id: number, data: Partial<InsertStoreAccount>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(storeAccounts).set({ ...data, updatedAt: new Date() }).where(eq(storeAccounts.id, id));
}

// 전체 계정 목록 조회
export async function getAllStoreAccounts(): Promise<StoreAccount[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeAccounts).orderBy(storeAccounts.loginId);
}

// 계정 삭제
export async function deleteStoreAccount(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(storeAccounts).where(eq(storeAccounts.id, id));
}

// 특정 날짜 이후의 동일 지점 기록들의 posStartAmount/posEndAmount를 연쇄 재계산
// 저장된 날짜의 posEndAmount가 바뀌면 이후 날짜들의 posStart/posEnd도 연쇄 업데이트
export async function cascadeUpdatePosAmounts(branchId: number, fromDate: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // fromDate 이후의 모든 기록을 날짜 오름차순으로 조회
  const futureRecords = await db
    .select()
    .from(dailySalesRecords)
    .where(and(eq(dailySalesRecords.branchId, branchId), gt(dailySalesRecords.date, fromDate)))
    .orderBy(dailySalesRecords.date);

  if (futureRecords.length === 0) return;

  // fromDate 기록의 posEndAmount를 기준으로 연쇄 계산
  // fromDate 자체가 POS 0으로 저장된 레코드면 이전 유효 마감금을 기준으로 보정
  let prevRecord = await getDailySalesRecord(branchId, fromDate);
  if (!prevRecord || (parseInt(prevRecord.posEndAmount || '0') || 0) <= 0) {
    const fallbackPrev = await getPrevDailySalesRecordWithPosEnd(branchId, fromDate);
    if (fallbackPrev) prevRecord = fallbackPrev;
  }
  if (!prevRecord) return;

  for (const rec of futureRecords) {
    const prevPosEnd: number = parseInt(prevRecord.posEndAmount || '0') || 0;
    const dateObj = new Date(rec.date + 'T12:00:00');
    const isSunday = dateObj.getDay() === 0;
    const expenses = Array.isArray(rec.expenses) ? rec.expenses : [];
    const expTotal = (expenses as Array<{ amount?: string }>).reduce((s, e) => s + (parseInt(e.amount || '0') || 0), 0);
    const cashDep = parseInt(rec.cashDeposit || '0') || 0;

    const newPosStart: number = prevPosEnd;
    const newPosEnd: number = isSunday ? newPosStart : newPosStart - expTotal + cashDep;

    // 값이 달라진 경우에만 업데이트
    if (String(newPosStart) !== rec.posStartAmount || String(newPosEnd) !== rec.posEndAmount) {
      await db
        .update(dailySalesRecords)
        .set({ posStartAmount: String(newPosStart), posEndAmount: String(newPosEnd), updatedAt: new Date() })
        .where(eq(dailySalesRecords.id, rec.id));
      prevRecord = { ...rec, posStartAmount: String(newPosStart), posEndAmount: String(newPosEnd) };
    } else {
      prevRecord = rec;
    }
  }
}

/**
 * 특정 날짜(selectedDate) 저장 시점 기준으로 누적 cashTotal/cardTotal을 계산한다.
 *
 * [최종 정책 - 2026-05, 일요일 분기 제거]
 *  운영상 일요일은 영업/입력 자체가 없고 DB에도 일요일 레코드가 존재하지 않으므로
 *  isSunday 관련 모든 분기는 제거하고 누적 계산을 단순화한다.
 *
 *  1) selectedDate가 매월 1일이면
 *       cashTotal = todayCash
 *       cardTotal = todayCard
 *  2) selectedDate가 1일이 아니면
 *       (selectedDate가 속한 월의 1일부터 selectedDate 직전까지의 cash/card 합산)
 *       + todayCash / todayCard
 *  3) 전달/다음달 데이터는 SQL 범위 + 행 단위 가드로 절대 포함하지 않는다.
 *
 * prevRecord 파라미터는 외부 호출 시그니처 호환을 위해 유지(미사용).
 */
export async function computeCumulativesForDate(
  branchId: number,
  date: string,
  _prevRecord: DailySalesRecord | null,  // 사용하지 않음 - 전체 스캔 방식
  todayCash: number,
  todayCard: number
): Promise<{ cashTotal: number; cardTotal: number }> {
  const db = await getDb();
  const isFirstOfMonth = date.endsWith('-01');

  // [정책 1] 매월 1일은 당일 매출만 (이전 달 누적과 절대 섞이지 않음)
  if (isFirstOfMonth) {
    return { cashTotal: todayCash, cardTotal: todayCard };
  }

  if (!db) {
    // DB 없을 때는 안전하게 당일 매출만 반환
    return { cashTotal: todayCash, cardTotal: todayCard };
  }

  // selectedDate가 속한 월의 범위 산출
  const [year, month] = date.split('-');
  const monthStart = `${year}-${month}-01`;
  // 월말: 다음달 0일 = 이번달 말일
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

  // [방어 가드] 누적 합산 SQL 범위:
  //   monthStart  ≤  r.date  ≤  monthEnd   (selectedDate가 속한 달만)
  //   AND   r.date  <  date                 (selectedDate 직전까지만)
  // → 전달/다음달 기록이 절대 합산되지 않도록 monthStart/monthEnd 둘 다 명시.
  const allPrevRecords = await db
    .select()
    .from(dailySalesRecords)
    .where(and(
      eq(dailySalesRecords.branchId, branchId),
      gte(dailySalesRecords.date, monthStart),
      lte(dailySalesRecords.date, monthEnd),
      lt(dailySalesRecords.date, date),
    ))
    .orderBy(dailySalesRecords.date);

  let baseCashTotal = 0;
  let baseCardTotal = 0;

  for (const r of allPrevRecords) {
    // 추가 방어: 행 단위에서도 같은 달인지 한 번 더 확인
    if (!r.date.startsWith(`${year}-${month}-`)) continue;

    // 일요일 분기 없음 — DB에 일요일 레코드가 존재하지 않으므로 단순 합산.
    baseCashTotal += parseInt(r.cash || '0') || 0;
    baseCardTotal += parseInt(r.card || '0') || 0;
  }

  // [정책 2] 1일이 아닌 날의 누적 = 이전까지 합산 + 당일 매출
  return { cashTotal: baseCashTotal + todayCash, cardTotal: baseCardTotal + todayCard };
}

/**
 * [무력화됨] 매월 1일 자동 리셋 체크
 *
 * 기존 동작: 서버 시작 시 호출되어 오늘이 매월 1일이면 모든 지점의 누적금액을 일괄 재계산.
 *
 * 비활성화 사유:
 *   - 운영팀은 새벽에 "전날" 매출을 입력하므로, 5월 1일 03시에 서버가 켜지면
 *     "오늘이 1일이니 리셋!" 하고 4월 30일 매출이 아직 안 들어온 상태에서
 *     모든 지점 기록을 일괄 재계산해버려 마감 누적이 변형될 수 있다.
 *   - 또한 "현재시간" 기준 동작이라, 서버 부팅 시점에 따라 리셋이 되기도/안 되기도
 *     하여 비결정적 결과가 발생한다.
 *
 * 대체 정책:
 *   - 누적은 항상 selectedDate(reportDate) 기준으로 계산되며,
 *     computeCumulativesForDate()가 selectedDate가 속한 월의 1일~selectedDate
 *     직전까지의 기록을 SQL로 합산해 그 자리에서 정확한 cashTotal/cardTotal을 만들어낸다.
 *   - 매월 1일 매출 입력 시에는 자동으로 "당일 매출만" 으로 누적이 시작된다.
 *   - 전체 데이터 일괄 재계산이 정말 필요하면 관리자가 수동으로
 *     manualResetCumulativeAmounts() (systemRouter.manualResetCumulativeAmounts)를
 *     명시적으로 호출해야 한다.
 *
 * 호환성을 위해 함수 시그니처는 유지하지만, 본문은 즉시 return하는 no-op로 변경한다.
 */
export async function checkAndResetMonthlyAmounts(): Promise<void> {
  // 의도적 no-op: 자동 월초 리셋은 운영방식과 맞지 않아 비활성화됨.
  // 누적 계산은 computeCumulativesForDate()가 selectedDate 기준으로 책임진다.
  return;
}

/**
 * 수동 누적금액 리셋 (관리자 기능)
 * 특정 지점 또는 모든 지점의 누적금액을 즉시 리셋
 */
export async function manualResetCumulativeAmounts(branchId?: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: '데이터베이스 연결 실패' };

  try {
    let branchesToReset = [];

    if (branchId) {
      const branch = await db.select().from(branches).where(eq(branches.id, branchId));
      if (branch.length === 0) {
        return { success: false, message: '지점을 찾을 수 없습니다' };
      }
      branchesToReset = branch;
    } else {
      branchesToReset = await db.select().from(branches);
    }

    for (const branch of branchesToReset) {
      const allRecords = await db
        .select()
        .from(dailySalesRecords)
        .where(eq(dailySalesRecords.branchId, branch.id))
        .orderBy(dailySalesRecords.date);

      for (const rec of allRecords) {
        const todayCash = parseInt(rec.cash || '0') || 0;
        const todayCard = parseInt(rec.card || '0') || 0;

        const { cashTotal: newCashTotal, cardTotal: newCardTotal } = await computeCumulativesForDate(
          branch.id, rec.date, null, todayCash, todayCard
        );

        if (String(newCashTotal) !== rec.cashTotal || String(newCardTotal) !== rec.cardTotal) {
          await db
            .update(dailySalesRecords)
            .set({ cashTotal: String(newCashTotal), cardTotal: String(newCardTotal), updatedAt: new Date() })
            .where(eq(dailySalesRecords.id, rec.id));
        }
      }
    }

    const message = branchId 
      ? `지점 ID ${branchId} 누적금액 리셋 완료`
      : `모든 지점 누적금액 리셋 완료`;
    
    console.log(`[DB] ${message}`);
    return { success: true, message };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[DB] 수동 리셋 오류:', error);
    return { success: false, message: `리셋 실패: ${errorMsg}` };
  }
}

// 특정 날짜 이후의 동일 지점 기록들의 cashTotal/cardTotal을 연쇄 재계산
// computeCumulativesForDate(전체 스캔 방식)를 각 레코드에 적용해 항상 정확한 값을 보장
export async function cascadeUpdateCumulativeAmounts(branchId: number, fromDate: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // fromDate 이후의 모든 기록을 날짜 오름차순으로 조회
  const futureRecords = await db
    .select()
    .from(dailySalesRecords)
    .where(and(eq(dailySalesRecords.branchId, branchId), gt(dailySalesRecords.date, fromDate)))
    .orderBy(dailySalesRecords.date);

  if (futureRecords.length === 0) return;

  // 각 레코드에 대해 computeCumulativesForDate로 정확한 누적금 재계산
  for (const rec of futureRecords) {
    const todayCash = parseInt(rec.cash || '0') || 0;
    const todayCard = parseInt(rec.card || '0') || 0;

    const { cashTotal: newCashTotal, cardTotal: newCardTotal } = await computeCumulativesForDate(
      branchId, rec.date, null, todayCash, todayCard
    );

    // 값이 달라진 경우에만 업데이트
    if (String(newCashTotal) !== rec.cashTotal || String(newCardTotal) !== rec.cardTotal) {
      await db
        .update(dailySalesRecords)
        .set({ cashTotal: String(newCashTotal), cardTotal: String(newCardTotal), updatedAt: new Date() })
        .where(eq(dailySalesRecords.id, rec.id));
    }
  }
}
