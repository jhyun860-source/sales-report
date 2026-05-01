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
 * 특정 날짜 저장 시 해당 달 1일부터 현재 날짜 직전까지 모든 레코드를 스캔해
 * 정확한 cashTotal/cardTotal을 계산한다.
 * prevRecord 파라미터는 폀지되었지만 폀이하지 않도록 선택적 유지.
 */
export async function computeCumulativesForDate(
  branchId: number,
  date: string,
  _prevRecord: DailySalesRecord | null,  // 사용하지 않음 - 전체 스캔 방식으로 대체
  todayCash: number,
  todayCard: number
): Promise<{ cashTotal: number; cardTotal: number }> {
  const db = await getDb();
  const isFirstOfMonth = date.endsWith('-01');
  const dateObj = new Date(date + 'T12:00:00');
  const isSunday = dateObj.getDay() === 0;

  // 매월 1일은 당일 매출만
  if (isFirstOfMonth) {
    return { cashTotal: isSunday ? 0 : todayCash, cardTotal: isSunday ? 0 : todayCard };
  }

  if (!db) {
    return { cashTotal: isSunday ? 0 : todayCash, cardTotal: isSunday ? 0 : todayCard };
  }

  // 해당 달 1일부터 현재 날짜 직전까지 모든 레코드 스캔
  const [year, month] = date.split('-');
  const monthStart = `${year}-${month}-01`;

  const allPrevRecords = await db
    .select()
    .from(dailySalesRecords)
    .where(and(
      eq(dailySalesRecords.branchId, branchId),
      gte(dailySalesRecords.date, monthStart),
      lt(dailySalesRecords.date, date)
    ))
    .orderBy(dailySalesRecords.date);

  let baseCashTotal = 0;
  let baseCardTotal = 0;

  for (const r of allPrevRecords) {
    const rDateObj = new Date(r.date + 'T12:00:00');
    const rIsSunday = rDateObj.getDay() === 0;
    if (r.date === monthStart) {
      // 1일은 리셋: 당일 매출만
      baseCashTotal = rIsSunday ? 0 : (parseInt(r.cash || '0') || 0);
      baseCardTotal = rIsSunday ? 0 : (parseInt(r.card || '0') || 0);
    } else if (!rIsSunday) {
      baseCashTotal += parseInt(r.cash || '0') || 0;
      baseCardTotal += parseInt(r.card || '0') || 0;
    }
    // 일요일은 이월만
  }

  if (isSunday) {
    return { cashTotal: baseCashTotal, cardTotal: baseCardTotal };
  }
  return { cashTotal: baseCashTotal + todayCash, cardTotal: baseCardTotal + todayCard };
}

/**
 * 매월 1일 자동 리셋 체크
 * 서버 시작 시 호출되어 오늘이 매월 1일이면 모든 지점의 누적금액을 리셋
 */
export async function checkAndResetMonthlyAmounts(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const today = new Date();
  const isFirstOfMonth = today.getDate() === 1;

  if (!isFirstOfMonth) return;

  console.log('[DB] 매월 1일 누적금액 리셋 시작...');

  try {
    // 모든 지점 조회
    const allBranches = await db.select().from(branches);

    for (const branch of allBranches) {
      // 해당 지점의 모든 기록 조회
      const allRecords = await db
        .select()
        .from(dailySalesRecords)
        .where(eq(dailySalesRecords.branchId, branch.id))
        .orderBy(dailySalesRecords.date);

      // 각 레코드의 누적금 재계산
      for (const rec of allRecords) {
        const todayCash = parseInt(rec.cash || '0') || 0;
        const todayCard = parseInt(rec.card || '0') || 0;

        const { cashTotal: newCashTotal, cardTotal: newCardTotal } = await computeCumulativesForDate(
          branch.id, rec.date, null, todayCash, todayCard
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

    console.log('[DB] 매월 1일 누적금액 리셋 완료');
  } catch (error) {
    console.error('[DB] 매월 1일 누적금액 리셋 오류:', error);
  }
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

    // 현재 월의 1일 날짜 계산 (YYYY-MM-01 형식)
    const now = new Date();
    const currentMonthFirstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    for (const branch of branchesToReset) {
      // 현재 월의 1일 이후의 기록만 리셋 (전달 기록은 보존)
      const allRecords = await db
        .select()
        .from(dailySalesRecords)
        .where(and(eq(dailySalesRecords.branchId, branch.id), gte(dailySalesRecords.date, currentMonthFirstDay)))
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
      ? `지점 ID ${branchId} 누적금액 리셋 완료 (${currentMonthFirstDay} 이후만 리셋)`
      : `모든 지점 누적금액 리셋 완료 (${currentMonthFirstDay} 이후만 리셋)`;
    
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
