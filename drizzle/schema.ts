import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 지점 테이블 - 사업장 정보
 * 사장님(admin)이 여러 지점을 관리
 */
export const branches = mysqlTable("branches", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(), // admin 사용자 ID
  name: varchar("name", { length: 100 }).notNull(), // 지점명 (강남점, 홍대점 등)
  code: varchar("code", { length: 50 }).notNull().unique(), // 지점 코드
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = typeof branches.$inferInsert;

/**
 * 지점 관리자 테이블 - 점장 정보
 * 각 지점의 점장이 매출을 입력
 */
export const branchManagers = mysqlTable("branchManagers", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  userId: int("userId").notNull(), // 점장 사용자 ID
  role: mysqlEnum("role", ["manager", "staff"]).default("staff").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BranchManager = typeof branchManagers.$inferSelect;
export type InsertBranchManager = typeof branchManagers.$inferInsert;

/**
 * 일일 매출 기록 테이블
 * 각 지점의 점장이 매일 입력하는 매출 데이터
 */
export const dailySalesRecords = mysqlTable("dailySalesRecords", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  posStartAmount: decimal("posStartAmount", { precision: 15, scale: 0 }).default("0").notNull(),
  cash: decimal("cash", { precision: 15, scale: 0 }).default("0").notNull(),
  card: decimal("card", { precision: 15, scale: 0 }).default("0").notNull(),
  cashTotal: decimal("cashTotal", { precision: 15, scale: 0 }).default("0").notNull(),
  cardTotal: decimal("cardTotal", { precision: 15, scale: 0 }).default("0").notNull(),
  posEndAmount: decimal("posEndAmount", { precision: 15, scale: 0 }).default("0").notNull(),
  paymentChangeNote: text("paymentChangeNote"),
  paymentChangeDate: varchar("paymentChangeDate", { length: 10 }),
  paymentChangeAmount: decimal("paymentChangeAmount", { precision: 15, scale: 0 }).default("0").notNull(),
  expenses: json("expenses").$type<Array<{ id: string; description: string; amount: string }>>().default([]).notNull(),
  submittedBy: int("submittedBy"),
  submittedAt: timestamp("submittedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailySalesRecord = typeof dailySalesRecords.$inferSelect;
export type InsertDailySalesRecord = typeof dailySalesRecords.$inferInsert;

/**
 * 관계 정의
 */
export const usersRelations = relations(users, ({ many }) => ({
  ownedBranches: many(branches),
  managedBranches: many(branchManagers),
  submittedRecords: many(dailySalesRecords),
}));

export const branchesRelations = relations(branches, ({ one, many }) => ({
  owner: one(users, {
    fields: [branches.ownerId],
    references: [users.id],
  }),
  managers: many(branchManagers),
  salesRecords: many(dailySalesRecords),
}));

export const branchManagersRelations = relations(branchManagers, ({ one }) => ({
  branch: one(branches, {
    fields: [branchManagers.branchId],
    references: [branches.id],
  }),
  user: one(users, {
    fields: [branchManagers.userId],
    references: [users.id],
  }),
}));

/**
 * 웹 푸시 구독 테이블
 * 사장님 핸드폰의 푸시 알림 구독 정보 저장
 */
export const pushSubscriptions = mysqlTable("pushSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

export const dailySalesRecordsRelations = relations(dailySalesRecords, ({ one }) => ({
  branch: one(branches, {
    fields: [dailySalesRecords.branchId],
    references: [branches.id],
  }),
  submitter: one(users, {
    fields: [dailySalesRecords.submittedBy],
    references: [users.id],
  }),
}))