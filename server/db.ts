import { eq, and, gte, lte, desc, lt, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, branches, branchManagers, dailySalesRecords, pushSubscriptions, storeAccounts, type Branch, type BranchManager, type DailySalesRecord, type InsertBranch, type InsertBranchManager, type InsertDailySalesRecord, type InsertPushSubscription, type PushSubscription, type StoreAccount, type InsertStoreAccount } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
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
  let prevRecord = await getDailySalesRecord(branchId, fromDate);
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
 * 특정 날짜 저장 시 이전 레코드와의 사이 날짜들의 매출을 합산해서 올바른 누적금을 계산한다.
 * 예: 4월 6~7일 레코드가 있는 상태에서 4월 8일을 저장할 때,
 * getPrevDailySalesRecord가 4월 7일을 반환하면 정상이지만,
 * 4월 7일 레코드가 없으면 4월 4일을 반환 → 4월 6~7일 매출 누락 문제 발생.
 * 이 함수는 prevRecord.date ~ currentDate 사이의 모든 레코드를 합산해서 보정한다.
 */
export async function computeCumulativesForDate(
  branchId: number,
  date: string,
  prevRecord: DailySalesRecord | null,
  todayCash: number,
  todayCard: number
): Promise<{ cashTotal: number; cardTotal: number }> {
  const db = await getDb();
  const isFirstOfMonth = date.endsWith('-01');
  const dateObj = new Date(date + 'T12:00:00');
  const isSunday = dateObj.getDay() === 0;

  if (isFirstOfMonth) {
    return { cashTotal: todayCash, cardTotal: todayCard };
  }

  if (!prevRecord) {
    // 이전 레코드 없음 → 당일 매출이 곧 누적
    return { cashTotal: isSunday ? 0 : todayCash, cardTotal: isSunday ? 0 : todayCard };
  }

  let baseCashTotal = parseInt(prevRecord.cashTotal || '0') || 0;
  let baseCardTotal = parseInt(prevRecord.cardTotal || '0') || 0;

  // prevRecord.date와 date 사이에 저장되지 않은 날짜들의 매출을 합산
  if (db && prevRecord.date < date) {
    const betweenRecords = await db
      .select()
      .from(dailySalesRecords)
      .where(and(
        eq(dailySalesRecords.branchId, branchId),
        gt(dailySalesRecords.date, prevRecord.date),
        lt(dailySalesRecords.date, date)
      ))
      .orderBy(dailySalesRecords.date);

    for (const r of betweenRecords) {
      const rDateObj = new Date(r.date + 'T12:00:00');
      const rIsSunday = rDateObj.getDay() === 0;
      const rIsFirstOfMonth = r.date.endsWith('-01');
      if (rIsFirstOfMonth) {
        // 월 경계 리셋
        baseCashTotal = parseInt(r.cash || '0') || 0;
        baseCardTotal = parseInt(r.card || '0') || 0;
      } else if (!rIsSunday) {
        baseCashTotal += parseInt(r.cash || '0') || 0;
        baseCardTotal += parseInt(r.card || '0') || 0;
      }
      // 일요일은 이월만 (baseCashTotal/baseCardTotal 변경 없음)
    }
  }

  if (isSunday) {
    return { cashTotal: baseCashTotal, cardTotal: baseCardTotal };
  }
  return { cashTotal: baseCashTotal + todayCash, cardTotal: baseCardTotal + todayCard };
}

// 특정 날짜 이후의 동일 지점 기록들의 cashTotal/cardTotal을 연쇄 재계산
// 저장된 날짜의 cash/card가 바뀌면 이후 날짜들의 누적금도 연쇄 업데이트
export async function cascadeUpdateCumulativeAmounts(branchId: number, fromDate: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // fromDate 이후의 모든 기록을 날짜 오름차순으로 조회 (같은 달만 처리 — 월 경계는 1일에 리셋)
  const futureRecords = await db
    .select()
    .from(dailySalesRecords)
    .where(and(eq(dailySalesRecords.branchId, branchId), gt(dailySalesRecords.date, fromDate)))
    .orderBy(dailySalesRecords.date);

  if (futureRecords.length === 0) return;

  // fromDate 기록의 cashTotal/cardTotal을 기준으로 연쇄 계산
  let prevRecord = await getDailySalesRecord(branchId, fromDate);
  if (!prevRecord) return;

  for (const rec of futureRecords) {
    const recDateObj = new Date(rec.date + 'T12:00:00');
    const isSunday = recDateObj.getDay() === 0;
    const isFirstOfMonth = rec.date.endsWith('-01');

    const prevCashTotal: number = parseInt(prevRecord.cashTotal || '0') || 0;
    const prevCardTotal: number = parseInt(prevRecord.cardTotal || '0') || 0;
    const todayCash: number = parseInt(rec.cash || '0') || 0;
    const todayCard: number = parseInt(rec.card || '0') || 0;

    let newCashTotal: number;
    let newCardTotal: number;

    if (isFirstOfMonth) {
      // 매월 1일은 리셋: 이전 누적과 무관하게 당일 매출만
      newCashTotal = todayCash;
      newCardTotal = todayCard;
    } else if (isSunday) {
      // 일요일은 영업 없음: 이전 누적 그대로 이월
      newCashTotal = prevCashTotal;
      newCardTotal = prevCardTotal;
    } else {
      newCashTotal = prevCashTotal + todayCash;
      newCardTotal = prevCardTotal + todayCard;
    }

    // 값이 달라진 경우에만 업데이트
    if (String(newCashTotal) !== rec.cashTotal || String(newCardTotal) !== rec.cardTotal) {
      await db
        .update(dailySalesRecords)
        .set({ cashTotal: String(newCashTotal), cardTotal: String(newCardTotal), updatedAt: new Date() })
        .where(eq(dailySalesRecords.id, rec.id));
      prevRecord = { ...rec, cashTotal: String(newCashTotal), cardTotal: String(newCardTotal) };
    } else {
      prevRecord = rec;
    }

    // 월 경계(1일)에서 이전 누적 연산이 끊기므로, 1일 이후는 그 1일 기록을 기준으로 계속 진행
  }
}
