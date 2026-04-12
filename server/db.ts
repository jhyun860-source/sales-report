import { eq, and, gte, lte, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, branches, branchManagers, dailySalesRecords, type Branch, type BranchManager, type DailySalesRecord, type InsertBranch, type InsertBranchManager, type InsertDailySalesRecord } from "../drizzle/schema";
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
