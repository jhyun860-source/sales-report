var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  branchManagers: () => branchManagers,
  branchManagersRelations: () => branchManagersRelations,
  branchSettings: () => branchSettings,
  branches: () => branches,
  branchesRelations: () => branchesRelations,
  dailySalesRecords: () => dailySalesRecords,
  dailySalesRecordsRelations: () => dailySalesRecordsRelations,
  liquorHiddenItems: () => liquorHiddenItems,
  liquorInventories: () => liquorInventories,
  liquorInventoriesRelations: () => liquorInventoriesRelations,
  liquorItems: () => liquorItems,
  liquorItemsRelations: () => liquorItemsRelations,
  liquorStockMovements: () => liquorStockMovements,
  liquorStockMovementsRelations: () => liquorStockMovementsRelations,
  pushSubscriptions: () => pushSubscriptions,
  staffIncentives: () => staffIncentives,
  staffIncentivesRelations: () => staffIncentivesRelations,
  storeAccounts: () => storeAccounts,
  storeAccountsRelations: () => storeAccountsRelations,
  tableItems: () => tableItems,
  tableItemsRelations: () => tableItemsRelations,
  tableReports: () => tableReports,
  tableReportsRelations: () => tableReportsRelations,
  users: () => users,
  usersRelations: () => usersRelations
});
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
var users, branches, branchManagers, dailySalesRecords, usersRelations, branchesRelations, branchManagersRelations, pushSubscriptions, storeAccounts, storeAccountsRelations, branchSettings, dailySalesRecordsRelations, tableReports, tableItems, staffIncentives, tableReportsRelations, tableItemsRelations, staffIncentivesRelations, liquorItems, liquorInventories, liquorStockMovements, liquorItemsRelations, liquorInventoriesRelations, liquorStockMovementsRelations, liquorHiddenItems;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
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
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    branches = mysqlTable("branches", {
      id: int("id").autoincrement().primaryKey(),
      ownerId: int("ownerId").notNull(),
      // admin 사용자 ID
      name: varchar("name", { length: 100 }).notNull(),
      // 지점명 (강남점, 홍대점 등)
      code: varchar("code", { length: 50 }).notNull().unique(),
      // 지점 코드
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    branchManagers = mysqlTable("branchManagers", {
      id: int("id").autoincrement().primaryKey(),
      branchId: int("branchId").notNull(),
      userId: int("userId").notNull(),
      // 점장 사용자 ID
      role: mysqlEnum("role", ["manager", "staff"]).default("staff").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    dailySalesRecords = mysqlTable("dailySalesRecords", {
      id: int("id").autoincrement().primaryKey(),
      branchId: int("branchId").notNull(),
      date: varchar("date", { length: 10 }).notNull(),
      // YYYY-MM-DD
      posStartAmount: decimal("posStartAmount", { precision: 15, scale: 0 }).default("0").notNull(),
      cash: decimal("cash", { precision: 15, scale: 0 }).default("0").notNull(),
      card: decimal("card", { precision: 15, scale: 0 }).default("0").notNull(),
      cashTotal: decimal("cashTotal", { precision: 15, scale: 0 }).default("0").notNull(),
      cardTotal: decimal("cardTotal", { precision: 15, scale: 0 }).default("0").notNull(),
      posEndAmount: decimal("posEndAmount", { precision: 15, scale: 0 }).default("0").notNull(),
      cashDeposit: decimal("cashDeposit", { precision: 15, scale: 0 }).default("0").notNull(),
      // 시제 입금
      paymentChangeNote: text("paymentChangeNote"),
      paymentChangeDate: varchar("paymentChangeDate", { length: 10 }),
      paymentChangeAmount: decimal("paymentChangeAmount", { precision: 15, scale: 0 }).default("0").notNull(),
      expenses: json("expenses").$type().default([]).notNull(),
      submittedBy: int("submittedBy"),
      submittedAt: timestamp("submittedAt"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      // 정산 컬럼 (매출 저장 시 자동 계산)
      totalRevenue: decimal("totalRevenue", { precision: 15, scale: 0 }).default("0").notNull(),
      commissionExpense: decimal("commissionExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      rentExpense: decimal("rentExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      managementFeeExpense: decimal("managementFeeExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      staffWageExpense: decimal("staffWageExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      managerWageExpense: decimal("managerWageExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      partTimeWageExpense: decimal("partTimeWageExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      liquorCostExpense: decimal("liquorCostExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      staffDrinkExpense: decimal("staffDrinkExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      salesIncentiveExpense: decimal("salesIncentiveExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      otherExpense: decimal("otherExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      totalExpenses: decimal("totalExpenses", { precision: 15, scale: 0 }).default("0").notNull(),
      netProfit: decimal("netProfit", { precision: 15, scale: 0 }).default("0").notNull(),
      staffCount: int("staffCount").default(0).notNull(),
      partTimeCount: int("partTimeCount").default(0).notNull()
    });
    usersRelations = relations(users, ({ many }) => ({
      ownedBranches: many(branches),
      managedBranches: many(branchManagers),
      submittedRecords: many(dailySalesRecords)
    }));
    branchesRelations = relations(branches, ({ one, many }) => ({
      owner: one(users, {
        fields: [branches.ownerId],
        references: [users.id]
      }),
      managers: many(branchManagers),
      salesRecords: many(dailySalesRecords)
    }));
    branchManagersRelations = relations(branchManagers, ({ one }) => ({
      branch: one(branches, {
        fields: [branchManagers.branchId],
        references: [branches.id]
      }),
      user: one(users, {
        fields: [branchManagers.userId],
        references: [users.id]
      })
    }));
    pushSubscriptions = mysqlTable("pushSubscriptions", {
      id: int("id").autoincrement().primaryKey(),
      userId: int("userId").notNull(),
      endpoint: text("endpoint").notNull(),
      p256dh: text("p256dh").notNull(),
      auth: text("auth").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    storeAccounts = mysqlTable("storeAccounts", {
      id: int("id").autoincrement().primaryKey(),
      loginId: varchar("loginId", { length: 50 }).notNull().unique(),
      // 로그인 아이디
      passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
      // bcrypt 해시
      branchId: int("branchId"),
      // 배정된 지점 (null이면 미배정)
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      displayName: varchar("displayName", { length: 100 }),
      // 표시 이름
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    storeAccountsRelations = relations(storeAccounts, ({ one }) => ({
      branch: one(branches, {
        fields: [storeAccounts.branchId],
        references: [branches.id]
      })
    }));
    branchSettings = mysqlTable("branchSettings", {
      id: int("id").autoincrement().primaryKey(),
      branchId: int("branchId").notNull(),
      monthlyRent: decimal("monthlyRent", { precision: 15, scale: 0 }).default("0").notNull(),
      dailyRentExpense: decimal("dailyRentExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      // 사용자 설정 일일 임대료
      managerMonthlySalary: decimal("managerMonthlySalary", { precision: 15, scale: 0 }).default("0").notNull(),
      managerDailyWage: decimal("managerDailyWage", { precision: 15, scale: 0 }).default("0").notNull(),
      staffMonthlySalary: decimal("staffMonthlySalary", { precision: 15, scale: 0 }).default("0").notNull(),
      staffDailyWage: decimal("staffDailyWage", { precision: 15, scale: 0 }).default("0").notNull(),
      partTimeHourlyWage: decimal("partTimeHourlyWage", { precision: 15, scale: 0 }).default("0").notNull(),
      deputyMonthlySalary: decimal("deputyMonthlySalary", { precision: 15, scale: 0 }).default("0").notNull(),
      deputyDailyWage: decimal("deputyDailyWage", { precision: 15, scale: 0 }).default("0").notNull(),
      monthlyFixedExpense: decimal("monthlyFixedExpense", { precision: 15, scale: 0 }).default("0").notNull(),
      commissionRate: decimal("commissionRate", { precision: 5, scale: 4 }).default("0.1700").notNull(),
      workType: mysqlEnum("workType", ["MON_FRI", "MON_SAT"]).default("MON_FRI").notNull(),
      // 근무 형태: 월~금 또는 월~토
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    dailySalesRecordsRelations = relations(dailySalesRecords, ({ one }) => ({
      branch: one(branches, {
        fields: [dailySalesRecords.branchId],
        references: [branches.id]
      }),
      submitter: one(users, {
        fields: [dailySalesRecords.submittedBy],
        references: [users.id]
      })
    }));
    tableReports = mysqlTable("tableReports", {
      id: int("id").autoincrement().primaryKey(),
      branchId: int("branchId").notNull(),
      date: varchar("date", { length: 10 }).notNull(),
      // YYYY-MM-DD
      teamCount: int("teamCount").default(0).notNull(),
      // 팀수
      cashAmount: decimal("cashAmount", { precision: 15, scale: 0 }).default("0").notNull(),
      // 현금 금액
      cardAmount: decimal("cardAmount", { precision: 15, scale: 0 }).default("0").notNull(),
      // 카드 금액
      notes: text("notes"),
      // 기타사항
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    tableItems = mysqlTable("tableItems", {
      id: int("id").autoincrement().primaryKey(),
      tableReportId: int("tableReportId").notNull(),
      tableNumber: varchar("tableNumber", { length: 20 }).notNull(),
      // 테이블 번호 (1T, 2T 등)
      guestType: mysqlEnum("guestType", ["walking", "regular", "named"]).default("walking").notNull(),
      // 워킹/기존/지명
      guestName: varchar("guestName", { length: 100 }),
      // 손님 이름 (지명 시)
      amount: decimal("amount", { precision: 15, scale: 0 }).default("0").notNull(),
      // 금액
      paymentMethod: mysqlEnum("paymentMethod", ["card", "cash"]).default("card").notNull(),
      // 결제수단
      memo: text("memo"),
      // 주문 메모
      sortOrder: int("sortOrder").default(0).notNull(),
      // 정렬 순서
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    staffIncentives = mysqlTable("staffIncentives", {
      id: int("id").autoincrement().primaryKey(),
      tableReportId: int("tableReportId").notNull(),
      staffName: varchar("staffName", { length: 50 }).notNull(),
      // 직원명
      glassCount: int("glassCount").default(0).notNull(),
      // 잔추가 수
      bottleCount: int("bottleCount").default(0).notNull(),
      // 병추가 수
      beerBottleCount: int("beerBottleCount").default(0).notNull(),
      // 맥주 병추가 수
      salesIncentive: decimal("salesIncentive", { precision: 15, scale: 0 }).default("0").notNull(),
      // 영업 인센티브 금액
      staffType: mysqlEnum("staffType", ["staff", "parttime", "manager", "deputy"]).default("staff").notNull(),
      // 직원/아르바이트/점장
      workStart: varchar("workStart", { length: 5 }),
      // 근무 시작 시간 (HH:mm)
      workEnd: varchar("workEnd", { length: 5 }),
      // 근무 종료 시간 (HH:mm)
      sortOrder: int("sortOrder").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    tableReportsRelations = relations(tableReports, ({ one, many }) => ({
      branch: one(branches, {
        fields: [tableReports.branchId],
        references: [branches.id]
      }),
      items: many(tableItems),
      staffIncentives: many(staffIncentives)
    }));
    tableItemsRelations = relations(tableItems, ({ one }) => ({
      tableReport: one(tableReports, {
        fields: [tableItems.tableReportId],
        references: [tableReports.id]
      })
    }));
    staffIncentivesRelations = relations(staffIncentives, ({ one }) => ({
      tableReport: one(tableReports, {
        fields: [staffIncentives.tableReportId],
        references: [tableReports.id]
      })
    }));
    liquorItems = mysqlTable("liquorItems", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 150 }).notNull(),
      category: varchar("category", { length: 50 }).default("\uAE30\uD0C0").notNull(),
      unitCost: decimal("unitCost", { precision: 15, scale: 0 }).default("0").notNull(),
      isActive: int("isActive").default(1).notNull(),
      sortOrder: int("sortOrder").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    liquorInventories = mysqlTable("liquorInventories", {
      id: int("id").autoincrement().primaryKey(),
      branchId: int("branchId").notNull(),
      liquorItemId: int("liquorItemId").notNull(),
      currentStock: decimal("currentStock", { precision: 12, scale: 2 }).default("0").notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    liquorStockMovements = mysqlTable("liquorStockMovements", {
      id: int("id").autoincrement().primaryKey(),
      branchId: int("branchId").notNull(),
      liquorItemId: int("liquorItemId").notNull(),
      date: varchar("date", { length: 10 }).notNull(),
      type: mysqlEnum("type", ["IN", "OUT", "ADJUST"]).notNull(),
      quantity: decimal("quantity", { precision: 12, scale: 2 }).default("0").notNull(),
      unitCost: decimal("unitCost", { precision: 15, scale: 0 }).default("0").notNull(),
      totalCost: decimal("totalCost", { precision: 15, scale: 0 }).default("0").notNull(),
      memo: text("memo"),
      createdBy: int("createdBy"),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    liquorItemsRelations = relations(liquorItems, ({ many }) => ({
      inventories: many(liquorInventories),
      movements: many(liquorStockMovements)
    }));
    liquorInventoriesRelations = relations(liquorInventories, ({ one }) => ({
      branch: one(branches, { fields: [liquorInventories.branchId], references: [branches.id] }),
      item: one(liquorItems, { fields: [liquorInventories.liquorItemId], references: [liquorItems.id] })
    }));
    liquorStockMovementsRelations = relations(liquorStockMovements, ({ one }) => ({
      branch: one(branches, { fields: [liquorStockMovements.branchId], references: [branches.id] }),
      item: one(liquorItems, { fields: [liquorStockMovements.liquorItemId], references: [liquorItems.id] })
    }));
    liquorHiddenItems = mysqlTable("liquorHiddenItems", {
      id: int("id").autoincrement().primaryKey(),
      branchId: int("branchId").notNull(),
      liquorItemId: int("liquorItemId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
  }
});

// server/_core/env.ts
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      openaiApiKey: process.env.OPENAI_API_KEY ?? "",
      geminiApiKey: process.env.GEMINI_API_KEY ?? "",
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? "",
      vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? "",
      settlementApiKey: process.env.SETTLEMENT_API_KEY ?? "default-api-key-change-me",
      githubBackupToken: process.env.GITHUB_BACKUP_TOKEN ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  cascadeUpdateCumulativeAmounts: () => cascadeUpdateCumulativeAmounts,
  cascadeUpdatePosAmounts: () => cascadeUpdatePosAmounts,
  checkAndResetMonthlyAmounts: () => checkAndResetMonthlyAmounts,
  computeCumulativesForDate: () => computeCumulativesForDate,
  createBranch: () => createBranch,
  createStoreAccount: () => createStoreAccount,
  deletePushSubscription: () => deletePushSubscription,
  deleteStoreAccount: () => deleteStoreAccount,
  getAllDailySalesRecords: () => getAllDailySalesRecords,
  getAllStoreAccounts: () => getAllStoreAccounts,
  getBranchById: () => getBranchById,
  getBranchesByOwner: () => getBranchesByOwner,
  getDailySalesRecord: () => getDailySalesRecord,
  getDailySalesRecordsByDateRange: () => getDailySalesRecordsByDateRange,
  getDb: () => getDb,
  getPrevDailySalesRecord: () => getPrevDailySalesRecord,
  getPrevDailySalesRecordWithPosEnd: () => getPrevDailySalesRecordWithPosEnd,
  getPushSubscriptionsByOpenId: () => getPushSubscriptionsByOpenId,
  getPushSubscriptionsByUserId: () => getPushSubscriptionsByUserId,
  getStoreAccountById: () => getStoreAccountById,
  getStoreAccountByLoginId: () => getStoreAccountByLoginId,
  getTotalSalesByDate: () => getTotalSalesByDate,
  getTotalSalesByDateRange: () => getTotalSalesByDateRange,
  getUserByOpenId: () => getUserByOpenId,
  manualResetCumulativeAmounts: () => manualResetCumulativeAmounts,
  savePushSubscription: () => savePushSubscription,
  updateStoreAccount: () => updateStoreAccount,
  upsertDailySalesRecord: () => upsertDailySalesRecord,
  upsertUser: () => upsertUser
});
import { eq, and, gte, lte, desc, lt, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!_pool) {
        const needsTls = (process.env.DATABASE_URL || "").includes("tidbcloud");
        _pool = mysql.createPool({
          uri: process.env.DATABASE_URL,
          ...needsTls ? { ssl: { rejectUnauthorized: true } } : {},
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getBranchesByOwner(ownerId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(branches).where(eq(branches.ownerId, ownerId));
}
async function createBranch(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(branches).values(data);
  const branchId = result.insertId;
  if (!branchId) return null;
  const created = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  return created[0] || null;
}
async function getBranchById(branchId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(branches).where(eq(branches.id, branchId)).limit(1);
  return result[0] || null;
}
async function getDailySalesRecord(branchId, date) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(dailySalesRecords).where(and(eq(dailySalesRecords.branchId, branchId), eq(dailySalesRecords.date, date))).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[getDailySalesRecord ERROR]", {
      branchId,
      date,
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : void 0,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      fullError: JSON.stringify(error, null, 2)
    });
    throw error;
  }
}
async function getPrevDailySalesRecord(branchId, beforeDate) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(dailySalesRecords).where(and(eq(dailySalesRecords.branchId, branchId), lt(dailySalesRecords.date, beforeDate))).orderBy(desc(dailySalesRecords.date)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("[getPrevDailySalesRecord ERROR]", {
      branchId,
      beforeDate,
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : void 0,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      fullError: JSON.stringify(error, null, 2)
    });
    throw error;
  }
}
async function getPrevDailySalesRecordWithPosEnd(branchId, beforeDate) {
  const db = await getDb();
  if (!db) return null;
  try {
    const result = await db.select().from(dailySalesRecords).where(and(eq(dailySalesRecords.branchId, branchId), lt(dailySalesRecords.date, beforeDate))).orderBy(desc(dailySalesRecords.date)).limit(120);
    return result.find((rec) => (parseInt(rec.posEndAmount || "0") || 0) > 0) || result[0] || null;
  } catch (error) {
    console.error("[getPrevDailySalesRecordWithPosEnd ERROR]", {
      branchId,
      beforeDate,
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : void 0,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      fullError: JSON.stringify(error, null, 2)
    });
    throw error;
  }
}
async function getDailySalesRecordsByDateRange(branchId, startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  try {
    return db.select().from(dailySalesRecords).where(
      and(
        eq(dailySalesRecords.branchId, branchId),
        gte(dailySalesRecords.date, startDate),
        lte(dailySalesRecords.date, endDate)
      )
    ).orderBy(desc(dailySalesRecords.date));
  } catch (error) {
    console.error("[getDailySalesRecordsByDateRange ERROR]", {
      branchId,
      startDate,
      endDate,
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : void 0,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      fullError: JSON.stringify(error, null, 2)
    });
    throw error;
  }
}
async function upsertDailySalesRecord(data) {
  const db = await getDb();
  if (!db) return null;
  const existing = await getDailySalesRecord(data.branchId, data.date);
  if (existing) {
    await db.update(dailySalesRecords).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(dailySalesRecords.id, existing.id));
    const updated = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.id, existing.id)).limit(1);
    return updated[0] || null;
  } else {
    const result = await db.insert(dailySalesRecords).values(data);
    const recordId = result.insertId;
    if (!recordId) return null;
    const created = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.id, recordId)).limit(1);
    return created[0] || null;
  }
}
async function getAllDailySalesRecords(branchId, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dailySalesRecords).where(eq(dailySalesRecords.branchId, branchId)).orderBy(desc(dailySalesRecords.date)).limit(limit);
}
async function getTotalSalesByDate(branchIds, date) {
  const db = await getDb();
  if (!db) return null;
  const records = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.date, date));
  const filtered = records.filter((r) => branchIds.includes(r.branchId));
  let totalCash = 0;
  let totalCard = 0;
  let totalExpense = 0;
  filtered.forEach((record) => {
    totalCash += Number(record.cash || 0);
    totalCard += Number(record.card || 0);
    record.expenses?.forEach((exp) => {
      totalExpense += Number(exp.amount || 0);
    });
  });
  return {
    date,
    totalCash,
    totalCard,
    totalExpense,
    total: totalCash + totalCard,
    recordCount: filtered.length
  };
}
async function getTotalSalesByDateRange(branchIds, startDate, endDate) {
  const db = await getDb();
  if (!db) return [];
  const records = await db.select().from(dailySalesRecords).where(
    and(
      gte(dailySalesRecords.date, startDate),
      lte(dailySalesRecords.date, endDate)
    )
  );
  const filtered = records.filter((r) => branchIds.includes(r.branchId));
  const grouped = {};
  filtered.forEach((record) => {
    if (!grouped[record.date]) {
      grouped[record.date] = { totalCash: 0, totalCard: 0, totalExpense: 0, recordCount: 0 };
    }
    grouped[record.date].totalCash += Number(record.cash || 0);
    grouped[record.date].totalCard += Number(record.card || 0);
    record.expenses?.forEach((exp) => {
      grouped[record.date].totalExpense += Number(exp.amount || 0);
    });
    grouped[record.date].recordCount += 1;
  });
  return Object.entries(grouped).map(([date, data]) => ({
    date,
    ...data,
    total: data.totalCash + data.totalCard
  }));
}
async function savePushSubscription(data) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(
    and(eq(pushSubscriptions.userId, data.userId), eq(pushSubscriptions.endpoint, data.endpoint))
  );
  await db.insert(pushSubscriptions).values(data);
}
async function getPushSubscriptionsByUserId(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}
async function deletePushSubscription(endpoint) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}
async function getPushSubscriptionsByOpenId(openId) {
  const db = await getDb();
  if (!db) return [];
  const user = await getUserByOpenId(openId);
  if (!user) return [];
  return getPushSubscriptionsByUserId(user.id);
}
async function getStoreAccountByLoginId(loginId) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeAccounts).where(eq(storeAccounts.loginId, loginId)).limit(1);
  return result[0] || null;
}
async function getStoreAccountById(id) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(storeAccounts).where(eq(storeAccounts.id, id)).limit(1);
  return result[0] || null;
}
async function createStoreAccount(data) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(storeAccounts).values(data);
  const accountId = result.insertId;
  if (!accountId) return null;
  return getStoreAccountById(accountId);
}
async function updateStoreAccount(id, data) {
  const db = await getDb();
  if (!db) return;
  await db.update(storeAccounts).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(storeAccounts.id, id));
}
async function getAllStoreAccounts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storeAccounts).orderBy(storeAccounts.loginId);
}
async function deleteStoreAccount(id) {
  const db = await getDb();
  if (!db) return;
  await db.delete(storeAccounts).where(eq(storeAccounts.id, id));
}
async function cascadeUpdatePosAmounts(branchId, fromDate) {
  const db = await getDb();
  if (!db) return;
  const futureRecords = await db.select().from(dailySalesRecords).where(and(eq(dailySalesRecords.branchId, branchId), gt(dailySalesRecords.date, fromDate))).orderBy(dailySalesRecords.date);
  if (futureRecords.length === 0) return;
  let prevRecord = await getDailySalesRecord(branchId, fromDate);
  if (!prevRecord || (parseInt(prevRecord.posEndAmount || "0") || 0) <= 0) {
    const fallbackPrev = await getPrevDailySalesRecordWithPosEnd(branchId, fromDate);
    if (fallbackPrev) prevRecord = fallbackPrev;
  }
  if (!prevRecord) return;
  for (const rec of futureRecords) {
    const prevPosEnd = parseInt(prevRecord.posEndAmount || "0") || 0;
    const newPosStart = prevPosEnd;
    if (String(newPosStart) !== rec.posStartAmount) {
      await db.update(dailySalesRecords).set({ posStartAmount: String(newPosStart), updatedAt: /* @__PURE__ */ new Date() }).where(eq(dailySalesRecords.id, rec.id));
      prevRecord = { ...rec, posStartAmount: String(newPosStart) };
    } else {
      prevRecord = rec;
    }
  }
}
async function computeCumulativesForDate(branchId, date, _prevRecord, todayCash, todayCard) {
  const db = await getDb();
  const isFirstOfMonth = date.endsWith("-01");
  if (isFirstOfMonth) {
    return { cashTotal: todayCash, cardTotal: todayCard };
  }
  if (!db) {
    return { cashTotal: todayCash, cardTotal: todayCard };
  }
  const [year, month] = date.split("-");
  const monthStart = `${year}-${month}-01`;
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const monthEnd = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
  const allPrevRecords = await db.select().from(dailySalesRecords).where(and(
    eq(dailySalesRecords.branchId, branchId),
    gte(dailySalesRecords.date, monthStart),
    lte(dailySalesRecords.date, monthEnd),
    lt(dailySalesRecords.date, date)
  )).orderBy(dailySalesRecords.date);
  let baseCashTotal = 0;
  let baseCardTotal = 0;
  for (const r of allPrevRecords) {
    if (!r.date.startsWith(`${year}-${month}-`)) continue;
    baseCashTotal += parseInt(r.cash || "0") || 0;
    baseCardTotal += parseInt(r.card || "0") || 0;
  }
  return { cashTotal: baseCashTotal + todayCash, cardTotal: baseCardTotal + todayCard };
}
async function checkAndResetMonthlyAmounts() {
  return;
}
async function manualResetCumulativeAmounts(branchId) {
  const db = await getDb();
  if (!db) return { success: false, message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328" };
  try {
    let branchesToReset = [];
    if (branchId) {
      const branch = await db.select().from(branches).where(eq(branches.id, branchId));
      if (branch.length === 0) {
        return { success: false, message: "\uC9C0\uC810\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" };
      }
      branchesToReset = branch;
    } else {
      branchesToReset = await db.select().from(branches);
    }
    for (const branch of branchesToReset) {
      const allRecords = await db.select().from(dailySalesRecords).where(eq(dailySalesRecords.branchId, branch.id)).orderBy(dailySalesRecords.date);
      for (const rec of allRecords) {
        const todayCash = parseInt(rec.cash || "0") || 0;
        const todayCard = parseInt(rec.card || "0") || 0;
        const { cashTotal: newCashTotal, cardTotal: newCardTotal } = await computeCumulativesForDate(
          branch.id,
          rec.date,
          null,
          todayCash,
          todayCard
        );
        if (String(newCashTotal) !== rec.cashTotal || String(newCardTotal) !== rec.cardTotal) {
          await db.update(dailySalesRecords).set({ cashTotal: String(newCashTotal), cardTotal: String(newCardTotal), updatedAt: /* @__PURE__ */ new Date() }).where(eq(dailySalesRecords.id, rec.id));
        }
      }
    }
    const message = branchId ? `\uC9C0\uC810 ID ${branchId} \uB204\uC801\uAE08\uC561 \uB9AC\uC14B \uC644\uB8CC` : `\uBAA8\uB4E0 \uC9C0\uC810 \uB204\uC801\uAE08\uC561 \uB9AC\uC14B \uC644\uB8CC`;
    console.log(`[DB] ${message}`);
    return { success: true, message };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "\uC54C \uC218 \uC5C6\uB294 \uC624\uB958";
    console.error("[DB] \uC218\uB3D9 \uB9AC\uC14B \uC624\uB958:", error);
    return { success: false, message: `\uB9AC\uC14B \uC2E4\uD328: ${errorMsg}` };
  }
}
async function cascadeUpdateCumulativeAmounts(branchId, fromDate) {
  const db = await getDb();
  if (!db) return;
  const futureRecords = await db.select().from(dailySalesRecords).where(and(eq(dailySalesRecords.branchId, branchId), gt(dailySalesRecords.date, fromDate))).orderBy(dailySalesRecords.date);
  if (futureRecords.length === 0) return;
  for (const rec of futureRecords) {
    const todayCash = parseInt(rec.cash || "0") || 0;
    const todayCard = parseInt(rec.card || "0") || 0;
    const { cashTotal: newCashTotal, cardTotal: newCardTotal } = await computeCumulativesForDate(
      branchId,
      rec.date,
      null,
      todayCash,
      todayCard
    );
    if (String(newCashTotal) !== rec.cashTotal || String(newCardTotal) !== rec.cardTotal) {
      await db.update(dailySalesRecords).set({ cashTotal: String(newCashTotal), cardTotal: String(newCardTotal), updatedAt: /* @__PURE__ */ new Date() }).where(eq(dailySalesRecords.id, rec.id));
    }
  }
}
var _db, _pool;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    _db = null;
    _pool = null;
  }
});

// server/_core/llm.ts
var llm_exports = {};
__export(llm_exports, {
  invokeLLM: () => invokeLLM
});
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format
  } = params;
  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  const providers = availableProviders();
  const attempts = [];
  for (const provider of providers) {
    for (const model of providerModels(provider)) {
      attempts.push({ provider, model });
    }
  }
  let lastError = null;
  for (let i = 0; i < attempts.length; i++) {
    const { provider, model } = attempts[i];
    const isLast = i === attempts.length - 1;
    const payload = {
      model,
      messages: messages.map(normalizeMessage)
    };
    if (tools && tools.length > 0) payload.tools = tools;
    if (normalizedToolChoice) payload.tool_choice = normalizedToolChoice;
    if (normalizedResponseFormat) payload.response_format = normalizedResponseFormat;
    payload.max_tokens = provider === "openai" ? 16384 : 32768;
    if (provider === "forge") {
      payload.thinking = { budget_tokens: 128 };
    }
    try {
      const response = await fetch(providerUrl(provider), {
        method: "POST",
        signal: AbortSignal.timeout(45e3),
        // 45초 응답 없으면 중단 (무한 로딩 방지)
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${providerKey(provider)}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        const isRetryable = response.status === 429 || response.status === 400;
        if (isRetryable && !isLast) {
          lastError = new Error(
            `[${provider}/${model}] \uC2E4\uD328, \uB2E4\uC74C\uC73C\uB85C \uC804\uD658: ${errorText.slice(0, 200)}`
          );
          continue;
        }
        throw new Error(
          `LLM invoke failed (${provider}/${model}): ${response.status} ${response.statusText} \u2013 ${errorText}`
        );
      }
      return await response.json();
    } catch (e) {
      lastError = e;
      if (isLast) throw e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
var ensureArray, normalizeContentPart, normalizeMessage, normalizeToolChoice, availableProviders, providerUrl, providerModels, providerKey, assertApiKey, normalizeResponseFormat;
var init_llm = __esm({
  "server/_core/llm.ts"() {
    "use strict";
    init_env();
    ensureArray = (value) => Array.isArray(value) ? value : [value];
    normalizeContentPart = (part) => {
      if (typeof part === "string") {
        return { type: "text", text: part };
      }
      if (part.type === "text") {
        return part;
      }
      if (part.type === "image_url") {
        return part;
      }
      if (part.type === "file_url") {
        return part;
      }
      throw new Error("Unsupported message content part");
    };
    normalizeMessage = (message) => {
      const { role, name, tool_call_id } = message;
      if (role === "tool" || role === "function") {
        const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
        return {
          role,
          name,
          tool_call_id,
          content
        };
      }
      const contentParts = ensureArray(message.content).map(normalizeContentPart);
      if (contentParts.length === 1 && contentParts[0].type === "text") {
        return {
          role,
          name,
          content: contentParts[0].text
        };
      }
      return {
        role,
        name,
        content: contentParts
      };
    };
    normalizeToolChoice = (toolChoice, tools) => {
      if (!toolChoice) return void 0;
      if (toolChoice === "none" || toolChoice === "auto") {
        return toolChoice;
      }
      if (toolChoice === "required") {
        if (!tools || tools.length === 0) {
          throw new Error(
            "tool_choice 'required' was provided but no tools were configured"
          );
        }
        if (tools.length > 1) {
          throw new Error(
            "tool_choice 'required' needs a single tool or specify the tool name explicitly"
          );
        }
        return {
          type: "function",
          function: { name: tools[0].function.name }
        };
      }
      if ("name" in toolChoice) {
        return {
          type: "function",
          function: { name: toolChoice.name }
        };
      }
      return toolChoice;
    };
    availableProviders = () => {
      const list = [];
      if (ENV.forgeApiKey) list.push("forge");
      if (ENV.geminiApiKey) list.push("gemini");
      if (ENV.openaiApiKey) list.push("openai");
      return list;
    };
    providerUrl = (p) => {
      if (p === "gemini")
        return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      if (p === "openai") return "https://api.openai.com/v1/chat/completions";
      return ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
    };
    providerModels = (p) => p === "openai" ? ["gpt-4o"] : p === "gemini" ? ["gemini-2.5-flash", "gemini-3.5-flash"] : ["gemini-2.5-flash"];
    providerKey = (p) => p === "gemini" ? ENV.geminiApiKey : p === "openai" ? ENV.openaiApiKey : ENV.forgeApiKey;
    assertApiKey = () => {
      if (availableProviders().length === 0) {
        throw new Error("OPENAI_API_KEY is not configured");
      }
    };
    normalizeResponseFormat = ({
      responseFormat,
      response_format,
      outputSchema,
      output_schema
    }) => {
      const explicitFormat = responseFormat || response_format;
      if (explicitFormat) {
        if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
          throw new Error(
            "responseFormat json_schema requires a defined schema object"
          );
        }
        return explicitFormat;
      }
      const schema = outputSchema || output_schema;
      if (!schema) return void 0;
      if (!schema.name || !schema.schema) {
        throw new Error("outputSchema requires both name and schema");
      }
      return {
        type: "json_schema",
        json_schema: {
          name: schema.name,
          schema: schema.schema,
          ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
        }
      };
    };
  }
});

// server/_core/settlementCalculations.ts
var settlementCalculations_exports = {};
__export(settlementCalculations_exports, {
  calculateDailyRent: () => calculateDailyRent,
  calculateDailySettlement: () => calculateDailySettlement,
  calculateLiquorCostExpense: () => calculateLiquorCostExpense,
  calculateMonthlySummary: () => calculateMonthlySummary,
  calculateOtherExpenses: () => calculateOtherExpenses,
  calculateStaffDrinkExpense: () => calculateStaffDrinkExpense,
  getBusinessDaysInMonth: () => getBusinessDaysInMonth,
  getStaffCounts: () => getStaffCounts,
  saveDailySettlementRecord: () => saveDailySettlementRecord
});
import { eq as eq3, and as and3, gte as gte2, lte as lte2 } from "drizzle-orm";
function getBusinessDaysInMonth(year, month, workType = "MON_FRI") {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  let businessDays = 0;
  for (let date = new Date(firstDay); date <= lastDay; date.setDate(date.getDate() + 1)) {
    const dayOfWeek = date.getDay();
    if (workType === "MON_FRI") {
      if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDays++;
    } else if (workType === "MON_SAT") {
      if (dayOfWeek !== 0) businessDays++;
    }
  }
  return businessDays;
}
function calculateDailyRent(monthlyRent, year, month, workType = "MON_FRI") {
  const businessDays = getBusinessDaysInMonth(year, month, workType);
  if (businessDays === 0) return 0;
  return Math.round(monthlyRent / businessDays);
}
async function getStaffCounts(tableReportId) {
  const db = await getDb();
  if (!db) return { staffCount: 0, partTimeCount: 0, managerCount: 0, partTimeTotalHours: 0 };
  const incentives = await db.select().from(staffIncentives).where(eq3(staffIncentives.tableReportId, tableReportId));
  const staffCount = incentives.filter((i) => i.staffType === "staff").length;
  const partTimeCount = incentives.filter((i) => i.staffType === "parttime").length;
  const managerCount = incentives.filter((i) => i.staffType === "manager" || i.staffType === "deputy").length;
  let partTimeTotalHours = 0;
  for (const inc of incentives.filter((i) => i.staffType === "parttime")) {
    if (inc.workStart && inc.workEnd) {
      try {
        const [sh, sm] = inc.workStart.split(":").map(Number);
        const [eh, em] = inc.workEnd.split(":").map(Number);
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin <= startMin) endMin += 24 * 60;
        partTimeTotalHours += (endMin - startMin) / 60;
      } catch {
      }
    }
  }
  return { staffCount, partTimeCount, managerCount, partTimeTotalHours };
}
async function calculateStaffDrinkExpense(tableReportId, branchName) {
  const db = await getDb();
  if (!db) return 0;
  const config = BRANCH_CONFIG[branchName];
  const glassPrice = config?.glassUnitPrice ?? 5e3;
  const bottlePrice = config?.bottleUnitPrice ?? 1e4;
  const beerBottlePrice = config?.beerBottleUnitPrice ?? 3e3;
  const incentives = await db.select().from(staffIncentives).where(eq3(staffIncentives.tableReportId, tableReportId));
  let total = 0;
  incentives.forEach((inc) => {
    total += Number(inc.glassCount || 0) * glassPrice;
    total += Number(inc.bottleCount || 0) * bottlePrice;
    total += Number(inc.beerBottleCount || 0) * beerBottlePrice;
  });
  return total;
}
async function calculateLiquorCostExpense(branchId, date) {
  const db = await getDb();
  if (!db) return 0;
  const movements = await db.select().from(liquorStockMovements).where(
    and3(
      eq3(liquorStockMovements.branchId, branchId),
      eq3(liquorStockMovements.date, date),
      eq3(liquorStockMovements.type, "OUT")
    )
  );
  return movements.reduce((sum, m) => sum + Number(m.totalCost || 0), 0);
}
function calculateOtherExpenses(expenses) {
  if (!Array.isArray(expenses)) return 0;
  return expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
}
async function calculateDailySettlement(branchId, date, cash, card, staffCount, partTimeCount, expenses, tableReportId, managerCount = 0, partTimeTotalHours = 0, externalDb, deputyCount = 0) {
  const zero = {
    totalRevenue: 0,
    commissionExpense: 0,
    rentExpense: 0,
    managementFeeExpense: 0,
    staffWageExpense: 0,
    managerWageExpense: 0,
    partTimeWageExpense: 0,
    liquorCostExpense: 0,
    staffDrinkExpense: 0,
    otherExpense: 0,
    totalExpenses: 0,
    netProfit: 0
  };
  const db = externalDb ?? await getDb();
  if (!db) {
    console.log("[\uC815\uC0B0\uACC4\uC0B0] DB \uC5F0\uACB0 \uC2E4\uD328");
    return zero;
  }
  const branchData = await db.select().from(branches).where(eq3(branches.id, branchId)).limit(1);
  if (!branchData || branchData.length === 0) {
    console.log("[\uC815\uC0B0\uACC4\uC0B0] \uC9C0\uC810 \uC5C6\uC74C branchId:", branchId);
    return zero;
  }
  console.log("[\uC815\uC0B0\uACC4\uC0B0] \uC2DC\uC791 branchId:", branchId, "date:", date, "cash:", cash, "card:", card, "managerCount:", managerCount);
  const [bsData] = await db.select().from(branchSettings).where(eq3(branchSettings.branchId, branchId)).limit(1);
  const branchName = branchData[0].name;
  const hardConfig = BRANCH_CONFIG[branchName];
  const [year, month] = date.split("-").map(Number);
  const totalRevenue = cash + card;
  const commissionRate = bsData ? Number(bsData.commissionRate || 0.17) : hardConfig?.commissionRate ?? 0.17;
  const commissionExpense = Math.round(totalRevenue * commissionRate);
  const workType = bsData?.workType || "MON_SAT";
  const monthlyRent = bsData ? Number(bsData.monthlyRent || 0) : hardConfig?.monthlyRent ?? 0;
  const rentExpense = calculateDailyRent(monthlyRent, year, month, "MON_SAT");
  const managementFeeExpense = 0;
  const staffMonthlySalary = bsData ? Number(bsData.staffMonthlySalary || 0) : 0;
  const staffDailyWage = staffMonthlySalary > 0 ? Math.round(staffMonthlySalary / 22) : bsData ? Number(bsData.staffDailyWage || 0) : hardConfig?.staffDailyWage ?? 0;
  const staffWageExpense = staffCount * staffDailyWage;
  const managerMonthlySalary = bsData ? Number(bsData.managerMonthlySalary || 0) : hardConfig?.monthlyRent ?? 0;
  const deputyMonthlySalary = bsData ? Number(bsData.deputyMonthlySalary || 0) : managerMonthlySalary;
  const managerBusinessDays = getBusinessDaysInMonth(year, month, workType);
  console.log("[\uC815\uC0B0\uACC4\uC0B0] managerBusinessDays:", managerBusinessDays, "managerMonthlySalary:", managerMonthlySalary);
  const managerDailyWage = managerBusinessDays > 0 ? Math.round(managerMonthlySalary / managerBusinessDays) : 0;
  const deputyDailyWage = managerBusinessDays > 0 ? Math.round(deputyMonthlySalary / managerBusinessDays) : 0;
  const managerWageExpense = managerCount * managerDailyWage + deputyCount * deputyDailyWage;
  const partTimeHourlyWage = bsData ? Number(bsData.partTimeHourlyWage || 0) : hardConfig?.partTimeDailyWage ?? 9860;
  const partTimeWageExpense = partTimeTotalHours > 0 ? Math.round(partTimeHourlyWage * partTimeTotalHours) : partTimeCount * partTimeHourlyWage * 8;
  const liquorCostExpense = await calculateLiquorCostExpense(branchId, date);
  const staffDrinkExpense = tableReportId ? await calculateStaffDrinkExpense(tableReportId, branchName) : 0;
  const monthlyFixedExpense = bsData ? Number(bsData.monthlyFixedExpense || 0) : 0;
  const dailyFixedExpense = monthlyFixedExpense > 0 ? calculateDailyRent(monthlyFixedExpense, year, month) : 0;
  const webExpense = calculateOtherExpenses(expenses);
  const otherExpense = dailyFixedExpense + webExpense;
  const totalExpenses = commissionExpense + rentExpense + managementFeeExpense + staffWageExpense + managerWageExpense + partTimeWageExpense + liquorCostExpense + staffDrinkExpense + otherExpense;
  const netProfit = totalRevenue - totalExpenses;
  return {
    totalRevenue,
    commissionExpense,
    rentExpense,
    managementFeeExpense,
    staffWageExpense,
    managerWageExpense,
    partTimeWageExpense,
    liquorCostExpense,
    staffDrinkExpense,
    otherExpense,
    totalExpenses,
    netProfit
  };
}
async function calculateMonthlySummary(branchId, year, month) {
  const db = await getDb();
  const zero = {
    totalRevenue: 0,
    commissionExpense: 0,
    rentExpense: 0,
    managementFeeExpense: 0,
    staffWageExpense: 0,
    managerWageExpense: 0,
    partTimeWageExpense: 0,
    liquorCostExpense: 0,
    staffDrinkExpense: 0,
    salesIncentiveExpense: 0,
    otherExpense: 0,
    totalExpenses: 0,
    netProfit: 0,
    ratios: {}
  };
  if (!db) return zero;
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
  const records = await db.select().from(dailySalesRecords).where(
    and3(
      eq3(dailySalesRecords.branchId, branchId),
      gte2(dailySalesRecords.date, startDate),
      lte2(dailySalesRecords.date, endDate)
    )
  );
  let totalRevenue = 0, commissionExpense = 0, rentExpense = 0;
  let managementFeeExpense = 0, staffWageExpense = 0, managerWageExpense = 0, partTimeWageExpense = 0;
  let liquorCostExpense = 0, staffDrinkExpense = 0, salesIncentiveExpense = 0, otherExpense = 0;
  let totalExpenses = 0, netProfit = 0;
  records.forEach((record) => {
    totalRevenue += Number(record.totalRevenue || 0);
    commissionExpense += Number(record.commissionExpense || 0);
    rentExpense += Number(record.rentExpense || 0);
    managementFeeExpense += Number(record.managementFeeExpense || 0);
    staffWageExpense += Number(record.staffWageExpense || 0);
    managerWageExpense += Number(record.managerWageExpense || 0);
    partTimeWageExpense += Number(record.partTimeWageExpense || 0);
    liquorCostExpense += Number(record.liquorCostExpense || 0);
    staffDrinkExpense += Number(record.staffDrinkExpense || 0);
    salesIncentiveExpense += Number(record.salesIncentiveExpense || 0);
    otherExpense += Number(record.otherExpense || 0);
    totalExpenses += Number(record.totalExpenses || 0);
    netProfit += Number(record.netProfit || 0);
  });
  const ratios = {};
  if (totalRevenue > 0) {
    ratios.commission = Math.round(commissionExpense / totalRevenue * 100);
    ratios.rent = Math.round(rentExpense / totalRevenue * 100);
    ratios.managementFee = Math.round(managementFeeExpense / totalRevenue * 100);
    ratios.staffWage = Math.round(staffWageExpense / totalRevenue * 100);
    ratios.managerWage = Math.round(managerWageExpense / totalRevenue * 100);
    ratios.partTimeWage = Math.round(partTimeWageExpense / totalRevenue * 100);
    ratios.liquorCost = Math.round(liquorCostExpense / totalRevenue * 100);
    ratios.staffDrink = Math.round(staffDrinkExpense / totalRevenue * 100);
    ratios.salesIncentive = Math.round(salesIncentiveExpense / totalRevenue * 100);
    ratios.otherExpense = Math.round(otherExpense / totalRevenue * 100);
    ratios.netProfit = Math.round(netProfit / totalRevenue * 100);
  }
  return {
    totalRevenue,
    commissionExpense,
    rentExpense,
    managementFeeExpense,
    staffWageExpense,
    managerWageExpense,
    partTimeWageExpense,
    liquorCostExpense,
    staffDrinkExpense,
    otherExpense,
    totalExpenses,
    netProfit,
    ratios
  };
}
async function saveDailySettlementRecord(branchId, date, settlement) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(dailySalesRecords).where(and3(eq3(dailySalesRecords.branchId, branchId), eq3(dailySalesRecords.date, date))).limit(1);
  const fields = {
    totalRevenue: String(settlement.totalRevenue),
    commissionExpense: String(settlement.commissionExpense),
    rentExpense: String(settlement.rentExpense),
    managementFeeExpense: String(settlement.managementFeeExpense),
    staffWageExpense: String(settlement.staffWageExpense),
    managerWageExpense: String(settlement.managerWageExpense ?? 0),
    partTimeWageExpense: String(settlement.partTimeWageExpense),
    liquorCostExpense: String(settlement.liquorCostExpense),
    staffDrinkExpense: String(settlement.staffDrinkExpense),
    otherExpense: String(settlement.otherExpense),
    totalExpenses: String(settlement.totalExpenses),
    netProfit: String(settlement.netProfit),
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (existing && existing.length > 0) {
    await db.update(dailySalesRecords).set(fields).where(eq3(dailySalesRecords.id, existing[0].id));
  }
}
var BRANCH_CONFIG;
var init_settlementCalculations = __esm({
  "server/_core/settlementCalculations.ts"() {
    "use strict";
    init_db();
    init_schema();
    BRANCH_CONFIG = {
      "\uB300\uCE58\uC810": {
        monthlyRent: 9e6,
        managementFee: 0,
        staffDailyWage: 136363,
        partTimeDailyWage: 2e4,
        commissionRate: 0.17,
        hasManager: true,
        managerDailyWage: 272727,
        glassUnitPrice: 5e3,
        bottleUnitPrice: 1e4,
        beerBottleUnitPrice: 3e3
      },
      "\uC120\uB989\uC810": {
        monthlyRent: 65e5,
        managementFee: 0,
        staffDailyWage: 136363,
        partTimeDailyWage: 2e4,
        commissionRate: 0.17,
        hasManager: true,
        managerDailyWage: 25e4,
        glassUnitPrice: 5e3,
        bottleUnitPrice: 1e4,
        beerBottleUnitPrice: 3e3
      },
      "\uC0BC\uC131\uC810": {
        monthlyRent: 65e5,
        managementFee: 0,
        staffDailyWage: 159090,
        partTimeDailyWage: 2e4,
        commissionRate: 0.17,
        hasManager: true,
        managerDailyWage: 181818,
        glassUnitPrice: 5e3,
        bottleUnitPrice: 1e4,
        beerBottleUnitPrice: 3e3
      },
      "\uBB38\uC8151\uD638\uC810": {
        monthlyRent: 45e5,
        managementFee: 0,
        staffDailyWage: 136363,
        partTimeDailyWage: 2e4,
        commissionRate: 0.17,
        hasManager: true,
        managerDailyWage: 204545,
        glassUnitPrice: 5e3,
        bottleUnitPrice: 1e4,
        beerBottleUnitPrice: 3e3
      },
      "\uBB38\uC8152\uD638\uC810": {
        monthlyRent: 45e5,
        managementFee: 0,
        staffDailyWage: 136363,
        partTimeDailyWage: 2e4,
        commissionRate: 0.17,
        hasManager: true,
        managerDailyWage: 181818,
        glassUnitPrice: 5e3,
        bottleUnitPrice: 1e4,
        beerBottleUnitPrice: 3e3
      }
    };
  }
});

// server/restoreRouter.ts
var restoreRouter_exports = {};
__export(restoreRouter_exports, {
  registerRestoreRoutes: () => registerRestoreRoutes
});
import fs3 from "node:fs";
import path3 from "node:path";
import mysql2 from "mysql2/promise";
function toMysqlValue(v) {
  if (v === null || v === void 0) return null;
  if (typeof v === "string") {
    const m = v.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d+)?Z?$/);
    if (m) return `${m[1]} ${m[2]}`;
    return v;
  }
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}
async function getConn() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return mysql2.createConnection({ uri: url, multipleStatements: true });
}
function registerRestoreRoutes(app) {
  app.get("/admin/restore-db", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.query.key !== RESTORE_KEY) {
      return res.status(403).json({ error: "invalid key" });
    }
    const mode = String(req.query.mode || "status");
    let conn = null;
    try {
      conn = await getConn();
      if (mode === "schema" || mode === "data") {
        return res.status(410).json({
          error: "\uC774 \uAE30\uB2A5\uC740 \uC548\uC804\uC744 \uC704\uD574 \uBE44\uD65C\uC131\uD654\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB370\uC774\uD130\uB97C \uB2E4\uC2DC \uBCF5\uC6D0\uD574\uC57C \uD558\uBA74 \uCF54\uB4DC\uB85C \uC9C1\uC811 \uC694\uCCAD\uD558\uC138\uC694."
        });
      }
      if (mode === "verify") {
        const [rows] = await conn.query(`
          SELECT b.name,
            (SELECT COUNT(*) FROM dailySalesRecords s WHERE s.branchId = b.id) AS sales,
            (SELECT MAX(s.date) FROM dailySalesRecords s WHERE s.branchId = b.id) AS latestSale,
            (SELECT COUNT(*) FROM liquorInventories li WHERE li.branchId = b.id) AS inventories,
            (SELECT COUNT(*) FROM tableReports tr WHERE tr.branchId = b.id) AS reports
          FROM branches b ORDER BY b.id`);
        return res.json({ mode, branches: rows });
      }
      if (mode === "status") {
        const [rows] = await conn.query(
          "SELECT TABLE_NAME, TABLE_ROWS FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()"
        );
        return res.json({ mode, tables: rows });
      }
      if (mode === "schema") {
        const sqlPath = path3.resolve(process.cwd(), SCHEMA_FILE);
        const raw = fs3.readFileSync(sqlPath, "utf-8");
        const statements = raw.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
        const results = [];
        await conn.query("SET FOREIGN_KEY_CHECKS=0");
        for (const stmt of statements) {
          try {
            await conn.query(stmt);
            const name = stmt.match(/`([^`]+)`/)?.[1] ?? "?";
            results.push(`ok: ${name}`);
          } catch (e) {
            results.push(`skip: ${(e?.message || "").slice(0, 120)}`);
          }
        }
        for (const ddl of EXTRA_DDL) {
          try {
            await conn.query(ddl);
            results.push("ok: extra");
          } catch (e) {
            results.push(`skip extra: ${(e?.message || "").slice(0, 120)}`);
          }
        }
        await conn.query("SET FOREIGN_KEY_CHECKS=1");
        return res.json({ mode, results });
      }
      if (mode === "data") {
        const backupPath = path3.resolve(process.cwd(), BACKUP_FILE);
        const backup = JSON.parse(fs3.readFileSync(backupPath, "utf-8"));
        const report = {};
        await conn.query("SET FOREIGN_KEY_CHECKS=0");
        for (const [table, rows] of Object.entries(backup)) {
          if (table === "__drizzle_migrations") continue;
          if (!Array.isArray(rows) || rows.length === 0) {
            report[table] = "0\uD589 (\uAC74\uB108\uB700)";
            continue;
          }
          try {
            await conn.query(`TRUNCATE TABLE \`${table}\``);
            const [colRows] = await conn.query(
              "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
              [table]
            );
            const tableCols = new Set(
              colRows.map((r) => r.COLUMN_NAME)
            );
            const cols = Object.keys(rows[0]).filter(
              (c) => tableCols.has(c)
            );
            if (cols.length === 0) {
              report[table] = "\uC2E4\uD328: \uC77C\uCE58\uD558\uB294 \uCEEC\uB7FC \uC5C6\uC74C";
              continue;
            }
            const colSql = cols.map((c) => `\`${c}\``).join(",");
            const CHUNK = 300;
            let inserted = 0;
            for (let i = 0; i < rows.length; i += CHUNK) {
              const chunk = rows.slice(i, i + CHUNK);
              const values = chunk.map(
                (r) => cols.map((c) => toMysqlValue(r[c]))
              );
              const [result] = await conn.query(
                `INSERT IGNORE INTO \`${table}\` (${colSql}) VALUES ?`,
                [values]
              );
              inserted += result?.affectedRows ?? chunk.length;
            }
            report[table] = `${inserted}\uD589 \uBCF5\uC6D0 (\uC6D0\uBCF8 ${rows.length}\uD589)`;
          } catch (e) {
            report[table] = `\uC2E4\uD328: ${(e?.message || "").slice(0, 150)}`;
          }
        }
        await conn.query("SET FOREIGN_KEY_CHECKS=1");
        return res.json({ mode, report });
      }
      if (mode === "bangicheck") {
        const [rows] = await conn.query(
          `SELECT si.staffName, si.staffType, si.workStart, si.workEnd, tr.date
           FROM staffIncentives si
           JOIN tableReports tr ON tr.id = si.tableReportId
           WHERE tr.branchId = 6 AND tr.date >= '2026-06-29'
           ORDER BY si.staffName, tr.date`
        );
        return res.json({ mode, rows });
      }
      if (mode === "datecoverage") {
        const [rows] = await conn.query(
          `SELECT date, branchId, b.name AS branchName, COUNT(*) AS cnt
           FROM tableReports tr
           LEFT JOIN branches b ON b.id = tr.branchId
           WHERE date >= '2026-07-05'
           GROUP BY date, branchId
           ORDER BY date, branchId`
        );
        return res.json({ mode, rows });
      }
      if (mode === "checkreport") {
        const branchIdParam = req.query.branchId;
        const dates = String(req.query.dates || "2026-07-11,2026-07-13").split(",");
        const results = [];
        for (const date of dates) {
          const [reports] = branchIdParam ? await conn.query(
            `SELECT id, branchId, date, teamCount, notes, cashAmount, cardAmount, createdAt, updatedAt FROM tableReports WHERE branchId=? AND date=?`,
            [Number(branchIdParam), date]
          ) : await conn.query(
            `SELECT id, branchId, date, teamCount, notes, cashAmount, cardAmount, createdAt, updatedAt FROM tableReports WHERE date=?`,
            [date]
          );
          const reportsArr = Array.isArray(reports) ? reports : [];
          const perReport = [];
          for (const r of reportsArr) {
            const [it] = await conn.query(`SELECT id, tableNumber, amount, memo FROM tableItems WHERE tableReportId=?`, [r.id]);
            perReport.push({ ...r, itemsCount: it.length });
          }
          results.push({ date, reportsFound: reportsArr.length, reports: perReport });
        }
        return res.json({ mode, branchIdParam: branchIdParam ?? "ALL", results });
      }
      if (mode === "liquorcostcheck") {
        try {
          const branchId = Number(req.query.branchId) || 6;
          const date = String(req.query.date || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
          const { calculateLiquorCostExpense: calculateLiquorCostExpense2 } = await Promise.resolve().then(() => (init_settlementCalculations(), settlementCalculations_exports));
          const cost = await calculateLiquorCostExpense2(branchId, date);
          const [rec] = await conn.query(
            `SELECT liquorCostExpense, totalExpenses, netProfit, totalRevenue FROM dailySalesRecords WHERE branchId=? AND date=?`,
            [branchId, date]
          );
          return res.json({ mode, branchId, date, calculatedCost: cost, dbRecord: rec?.[0] ?? null });
        } catch (e) {
          return res.json({ mode, ok: false, error: (e?.message ?? String(e)).slice(0, 500) });
        }
      }
      if (mode === "geminicheck") {
        try {
          const { invokeLLM: invokeLLM2 } = await Promise.resolve().then(() => (init_llm(), llm_exports));
          const start = Date.now();
          const resp = await invokeLLM2({
            messages: [{ role: "user", content: "hi, reply with just OK" }]
          });
          return res.json({
            mode,
            ok: true,
            elapsedMs: Date.now() - start,
            reply: resp.choices?.[0]?.message?.content ?? null
          });
        } catch (e) {
          return res.json({
            mode,
            ok: false,
            error: (e?.message ?? String(e)).slice(0, 500)
          });
        }
      }
      if (mode === "accountscheck") {
        const [rows] = await conn.query(
          `SELECT id, loginId, role, branchId FROM storeAccounts ORDER BY loginId`
        );
        return res.json({ mode, rows });
      }
      if (mode === "recentmoves") {
        const [rows] = await conn.query(
          `SELECT m.id, m.branchId, b.name AS branchName, m.liquorItemId, li.name AS itemName,
                  m.type, m.quantity, m.createdAt,
                  inv.currentStock AS currentStockNow
           FROM liquorStockMovements m
           LEFT JOIN branches b ON b.id = m.branchId
           LEFT JOIN liquorItems li ON li.id = m.liquorItemId
           LEFT JOIN liquorInventories inv ON inv.branchId = m.branchId AND inv.liquorItemId = m.liquorItemId
           ORDER BY m.createdAt DESC
           LIMIT 15`
        );
        return res.json({ mode, rows });
      }
      if (mode === "invcheck") {
        const [dupes] = await conn.query(
          `SELECT branchId, liquorItemId, COUNT(*) as cnt, GROUP_CONCAT(id) as ids, GROUP_CONCAT(currentStock) as stocks
           FROM liquorInventories
           GROUP BY branchId, liquorItemId
           HAVING cnt > 1
           ORDER BY branchId`
        );
        const [branch1Count] = await conn.query(
          `SELECT COUNT(*) as c FROM liquorInventories WHERE branchId = 1`
        );
        return res.json({ mode, duplicates: dupes, branch1TotalRows: branch1Count?.[0]?.c });
      }
      if (mode === "aicheck") {
        const key = process.env.OPENAI_API_KEY || "";
        const gkey = process.env.GEMINI_API_KEY || "";
        return res.json({
          mode,
          openaiKeySet: !!key,
          openaiKeyPrefix: key ? key.slice(0, 8) + "..." : null,
          geminiKeySet: !!gkey,
          geminiKeyPrefix: gkey ? gkey.slice(0, 8) + "..." : null,
          activeProvider: gkey ? "gemini" : key ? "openai" : "none"
        });
      }
      if (mode === "staffcheck") {
        const [rows] = await conn.query(
          `SELECT si.id, si.staffName, si.staffType, si.workStart, si.workEnd,
                  tr.date, tr.branchId
           FROM staffIncentives si
           JOIN tableReports tr ON tr.id = si.tableReportId
           WHERE tr.branchId = 2 AND tr.date BETWEEN '2026-06-29' AND '2026-07-05'
             AND si.staffName IN ('\uC720\uC8FC','\uAC00\uC744')
           ORDER BY tr.date, si.staffName`
        );
        return res.json({ mode, rows });
      }
      return res.status(400).json({ error: "mode must be schema|data|status|verify|staffcheck" });
    } catch (e) {
      return res.status(500).json({ error: (e?.message || String(e)).slice(0, 300) });
    } finally {
      if (conn) await conn.end().catch(() => {
      });
    }
  });
}
var RESTORE_KEY, BACKUP_FILE, SCHEMA_FILE, EXTRA_DDL;
var init_restoreRouter = __esm({
  "server/restoreRouter.ts"() {
    "use strict";
    RESTORE_KEY = "mwt-restore-20260711-xK4";
    BACKUP_FILE = "backups/backup-2026-06-05-before-manager-wage.json";
    SCHEMA_FILE = "drizzle-full/0000_zippy_carlie_cooper.sql";
    EXTRA_DDL = [
      `CREATE TABLE IF NOT EXISTS \`liquorSeedMeta\` (
    \`seedKey\` varchar(191) NOT NULL,
    \`appliedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`seedKey\`)
  )`,
      `CREATE TABLE IF NOT EXISTS \`liquorStockAudit\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`branchId\` int NOT NULL,
    \`liquorItemId\` int NOT NULL,
    \`prevStock\` decimal(10,2),
    \`nextStock\` decimal(10,2),
    \`source\` varchar(100),
    \`accountId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  )`
    ];
  }
});

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      console.log("[Auth] Verifying token:", { tokenLength: cookieValue.length, tokenStart: cookieValue.substring(0, 50) });
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      console.log("[Auth] JWT verified, payload:", payload);
      const tokenType = payload.type;
      if (tokenType === "store") {
        console.log("[Auth] Store Account token detected");
        const accountId = payload.accountId;
        const loginId = payload.loginId;
        if (typeof accountId === "number" && typeof loginId === "string") {
          return {
            openId: String(accountId),
            appId: "store-account",
            name: loginId
          };
        }
      }
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields", { openId, appId, name });
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    let sessionCookie;
    console.log("[Auth] Request received:", {
      authHeaderExists: !!req.headers.authorization,
      authHeaderValue: req.headers.authorization ? req.headers.authorization.substring(0, 100) : "NOT SET",
      cookieExists: !!req.headers.cookie,
      url: req.url
    });
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      console.log("[Auth] Authorization header found:", { headerStart: authHeader.substring(0, 50) });
      if (authHeader.startsWith("Bearer ")) {
        sessionCookie = authHeader.substring(7);
        console.log("[Auth] \u2705 Using token from Authorization header", { tokenLength: sessionCookie.length, tokenStart: sessionCookie.substring(0, 100) });
      } else {
        console.log("[Auth] \u274C Authorization header does NOT start with Bearer:", { header: authHeader.substring(0, 50) });
      }
    } else {
      console.log("[Auth] \u274C NO Authorization header found");
    }
    if (!sessionCookie) {
      const cookies = this.parseCookies(req.headers.cookie);
      sessionCookie = cookies.get(COOKIE_NAME);
      if (sessionCookie) {
        console.log("[Auth] Using token from session cookie");
      }
    }
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (session.appId === "store-account") {
      console.log("[Auth] Store Account authentication, creating synthetic user");
      const storeAccount = await getStoreAccountById(parseInt(sessionUserId, 10));
      console.log("[Auth] Store Account fetched:", { id: storeAccount?.id, loginId: storeAccount?.loginId, role: storeAccount?.role });
      if (!storeAccount) {
        throw ForbiddenError("Store account not found");
      }
      const finalRole = storeAccount.role || "user";
      console.log("[Auth] Store Account role:", finalRole);
      if (!user) {
        user = {
          id: parseInt(sessionUserId, 10),
          openId: sessionUserId,
          name: storeAccount.displayName || storeAccount.loginId,
          email: null,
          role: finalRole,
          loginMethod: "store-account",
          lastSignedIn: signedInAt,
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
      } else {
        user.role = finalRole;
        user.name = storeAccount.displayName || storeAccount.loginId;
      }
    } else {
      if (!user) {
        try {
          const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
          await upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: signedInAt
          });
          user = await getUserByOpenId(userInfo.openId);
        } catch (error) {
          console.error("[Auth] Failed to sync user from OAuth:", error);
          throw ForbiddenError("Failed to sync user info");
        }
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/settlements.ts
init_db();
init_schema();
init_env();
import { eq as eq2, and as and2 } from "drizzle-orm";
function validateApiKey(req, res) {
  const apiKey = req.headers["x-api-key"];
  const validApiKey = ENV.settlementApiKey;
  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({ error: "Unauthorized: Invalid API key" });
    return false;
  }
  return true;
}
async function getBranchIdByName(branchName) {
  const db = await getDb();
  if (!db) return null;
  const branchMap = {
    "\uB300\uCE58\uC810": "daechi",
    "\uC0BC\uC131\uC810": "samsung",
    "\uC120\uB989\uC810": "seolleung",
    "\uBB38\uC8151\uD638\uC810": "munjeong1",
    "\uBB38\uC8152\uD638\uC810": "munjeong2"
  };
  const branchCode = branchMap[branchName];
  if (!branchCode) return null;
  try {
    const result = await db.select().from(branches).where(eq2(branches.code, branchCode)).limit(1);
    return result.length > 0 ? result[0].id : null;
  } catch (error) {
    console.error("[Settlements] Failed to get branch:", error);
    return null;
  }
}
async function getSettlementByDate(branchId, date) {
  const db = await getDb();
  if (!db) return null;
  try {
    const branchResult = await db.select().from(branches).where(eq2(branches.id, branchId)).limit(1);
    if (branchResult.length === 0) return null;
    const branchName = branchResult[0].name;
    const salesResult = await db.select().from(dailySalesRecords).where(and2(eq2(dailySalesRecords.branchId, branchId), eq2(dailySalesRecords.date, date))).limit(1);
    const salesRecord = salesResult.length > 0 ? salesResult[0] : null;
    const cash = salesRecord ? Number(salesRecord.cashTotal || 0) : 0;
    const card = salesRecord ? Number(salesRecord.cardTotal || 0) : 0;
    const totalSales = cash + card;
    const tableResult = await db.select().from(tableReports).where(and2(eq2(tableReports.branchId, branchId), eq2(tableReports.date, date))).limit(1);
    const tableReport = tableResult.length > 0 ? tableResult[0] : null;
    const tableReportId = tableReport?.id || 0;
    let staffWages = 0;
    let parttimeWages = 0;
    if (tableReportId > 0) {
      const incentives = await db.select().from(staffIncentives).where(eq2(staffIncentives.tableReportId, tableReportId));
      for (const incentive of incentives) {
        const amount = Number(incentive.salesIncentive || 0);
        if (incentive.staffType === "staff") {
          staffWages += amount;
        } else if (incentive.staffType === "parttime") {
          parttimeWages += amount;
        }
      }
    }
    const liquorResult = await db.select().from(liquorStockMovements).where(
      and2(
        eq2(liquorStockMovements.branchId, branchId),
        eq2(liquorStockMovements.date, date),
        eq2(liquorStockMovements.type, "OUT")
      )
    );
    let liquorOutAmount = 0;
    for (const movement of liquorResult) {
      liquorOutAmount += Number(movement.totalCost || 0);
    }
    const staffDrinkAmount = 0;
    return {
      date,
      branchName,
      totalSales,
      cash,
      card,
      liquorOutAmount,
      staffWages,
      parttimeWages,
      staffDrinkAmount
    };
  } catch (error) {
    console.error("[Settlements] Failed to get settlement by date:", error);
    return null;
  }
}
async function getLatestSettlement(branchId) {
  const db = await getDb();
  if (!db) return null;
  try {
    const salesResult = await db.select().from(dailySalesRecords).where(eq2(dailySalesRecords.branchId, branchId)).orderBy((t2) => [t2.date]).limit(1);
    if (salesResult.length === 0) return null;
    const latestDate = salesResult[0].date;
    return await getSettlementByDate(branchId, latestDate);
  } catch (error) {
    console.error("[Settlements] Failed to get latest settlement:", error);
    return null;
  }
}
function registerSettlementsRoutes(app) {
  app.get("/api/settlements/:branchName/latest", async (req, res) => {
    if (!validateApiKey(req, res)) return;
    const { branchName } = req.params;
    try {
      const branchId = await getBranchIdByName(branchName);
      if (!branchId) {
        res.status(404).json({ error: `Branch not found: ${branchName}` });
        return;
      }
      const settlement = await getLatestSettlement(branchId);
      if (!settlement) {
        res.status(404).json({ error: `No settlement data found for ${branchName}` });
        return;
      }
      res.json(settlement);
    } catch (error) {
      console.error("[Settlements] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app.get("/api/settlements/:branchName/:date", async (req, res) => {
    if (!validateApiKey(req, res)) return;
    const { branchName, date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD" });
      return;
    }
    try {
      const branchId = await getBranchIdByName(branchName);
      if (!branchId) {
        res.status(404).json({ error: `Branch not found: ${branchName}` });
        return;
      }
      const settlement = await getSettlementByDate(branchId, date);
      if (!settlement) {
        res.status(404).json({ error: `Settlement data not found for ${branchName} on ${date}` });
        return;
      }
      res.json(settlement);
    } catch (error) {
      console.error("[Settlements] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    console.log("[DEBUG-ADMIN-CHECK]", {
      user: ctx.user,
      role: ctx.user?.role,
      userId: ctx.user?.id
    });
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
init_db();
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  }),
  resetCumulativeAmounts: adminProcedure.input(
    z.object({
      branchId: z.number().optional()
    }).optional()
  ).mutation(async ({ input }) => {
    const result = await manualResetCumulativeAmounts(input?.branchId);
    return result;
  })
});

// server/routers.ts
init_env();
init_db();
init_schema();
init_llm();
init_settlementCalculations();
import { z as z4 } from "zod";
import webpush from "web-push";
import bcrypt from "bcryptjs";
import { SignJWT as SignJWT2, jwtVerify as jwtVerify4 } from "jose";
import { eq as eq6, and as and5, desc as desc3, asc, like, sql, inArray, gte as gte4, lte as lte4, not } from "drizzle-orm";
import { TRPCError as TRPCError5 } from "@trpc/server";

// server/settlementRouter.ts
init_db();
init_schema();
init_settlementCalculations();
init_db();
import { z as z2 } from "zod";
import { TRPCError as TRPCError3 } from "@trpc/server";
import { eq as eq4, and as and4, gte as gte3, lte as lte3, desc as desc2 } from "drizzle-orm";
init_env();
import { jwtVerify as jwtVerify2 } from "jose";
async function parseStoreCookie(cookieHeader, authHeader) {
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  if (!token && cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k.trim(), v.join("=")];
      })
    );
    token = cookies[COOKIE_NAME];
  }
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify2(token, secret, { algorithms: ["HS256"] });
    if (payload.type !== "store") return null;
    return payload;
  } catch {
    return null;
  }
}
var settlementRouter = router({
  /**
   * 지점 설정 조회
   */
  getBranchSettings: publicProcedure.input(z2.object({ branchId: z2.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328" });
    const branch = await db.select().from(branches).where(eq4(branches.id, input.branchId)).limit(1);
    if (!branch || branch.length === 0) {
      throw new TRPCError3({ code: "NOT_FOUND", message: "\uC9C0\uC810\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    return branch[0];
  }),
  /**
   * 지점 설정 업데이트
   */
  updateBranchSettings: publicProcedure.input(
    z2.object({
      branchId: z2.number(),
      monthlyRent: z2.string().optional(),
      managementFee: z2.string().optional(),
      staffDailyWage: z2.string().optional(),
      partTimeHourlyWage: z2.string().optional(),
      commissionRate: z2.string().optional(),
      hasManager: z2.number().optional(),
      glassUnitPrice: z2.string().optional(),
      bottleUnitPrice: z2.string().optional(),
      beerBottleUnitPrice: z2.string().optional()
    })
  ).mutation(async ({ ctx, input }) => {
    const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization);
    if (!payload) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    const account = await getStoreAccountById(payload.accountId);
    if (!account) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    if (account.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC124\uC815\uC744 \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328" });
    const updateData = { updatedAt: /* @__PURE__ */ new Date() };
    if (input.monthlyRent !== void 0) updateData.monthlyRent = input.monthlyRent;
    if (input.managementFee !== void 0) updateData.managementFee = input.managementFee;
    if (input.staffDailyWage !== void 0) updateData.staffDailyWage = input.staffDailyWage;
    if (input.partTimeHourlyWage !== void 0) updateData.partTimeHourlyWage = input.partTimeHourlyWage;
    if (input.commissionRate !== void 0) updateData.commissionRate = input.commissionRate;
    if (input.hasManager !== void 0) updateData.hasManager = input.hasManager;
    if (input.glassUnitPrice !== void 0) updateData.glassUnitPrice = input.glassUnitPrice;
    if (input.bottleUnitPrice !== void 0) updateData.bottleUnitPrice = input.bottleUnitPrice;
    if (input.beerBottleUnitPrice !== void 0) updateData.beerBottleUnitPrice = input.beerBottleUnitPrice;
    await db.update(branches).set(updateData).where(eq4(branches.id, input.branchId));
    const updated = await db.select().from(branches).where(eq4(branches.id, input.branchId)).limit(1);
    return updated[0] || null;
  }),
  /**
   * 일별 정산 조회 및 계산
   */
  getDailySettlement: publicProcedure.input(z2.object({ branchId: z2.number(), date: z2.string() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328" });
    const record = await db.select().from(dailySalesRecords).where(and4(eq4(dailySalesRecords.branchId, input.branchId), eq4(dailySalesRecords.date, input.date))).limit(1);
    if (!record || record.length === 0) {
      return null;
    }
    return record[0];
  }),
  /**
   * 일별 정산 저장 (정산 계산 포함)
   */
  saveDailySettlement: publicProcedure.input(
    z2.object({
      branchId: z2.number(),
      date: z2.string(),
      cash: z2.string().default("0"),
      card: z2.string().default("0"),
      expenses: z2.array(z2.object({ id: z2.string(), description: z2.string(), amount: z2.string() })).default([])
    })
  ).mutation(async ({ ctx, input }) => {
    const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization);
    if (!payload) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    const account = await getStoreAccountById(payload.accountId);
    if (!account) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    if (account.role !== "admin" && account.branchId !== input.branchId) {
      throw new TRPCError3({ code: "FORBIDDEN", message: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328" });
    const tableReport = await db.select().from(tableReports).where(and4(eq4(tableReports.branchId, input.branchId), eq4(tableReports.date, input.date))).limit(1);
    const tableReportId = tableReport && tableReport.length > 0 ? tableReport[0].id : null;
    const { staffCount, partTimeCount, managerCount, partTimeTotalHours } = tableReportId ? await getStaffCounts(tableReportId) : { staffCount: 0, partTimeCount: 0, managerCount: 0, partTimeTotalHours: 0 };
    const cash = Number(input.cash || 0);
    const card = Number(input.card || 0);
    const [year, month] = input.date.split("-").map(Number);
    const settlement = await calculateDailySettlement(
      input.branchId,
      input.date,
      cash,
      card,
      staffCount,
      partTimeCount,
      input.expenses,
      tableReportId,
      managerCount,
      partTimeTotalHours
    );
    const existing = await db.select().from(dailySalesRecords).where(and4(eq4(dailySalesRecords.branchId, input.branchId), eq4(dailySalesRecords.date, input.date))).limit(1);
    let result;
    if (existing && existing.length > 0) {
      await db.update(dailySalesRecords).set({
        cash: String(cash),
        card: String(card),
        expenses: input.expenses,
        totalRevenue: String(settlement.totalRevenue),
        commissionExpense: String(settlement.commissionExpense),
        rentExpense: String(settlement.rentExpense),
        managementFeeExpense: String(settlement.managementFeeExpense),
        staffWageExpense: String(settlement.staffWageExpense),
        partTimeWageExpense: String(settlement.partTimeWageExpense),
        liquorCostExpense: String(settlement.liquorCostExpense),
        staffDrinkExpense: String(settlement.staffDrinkExpense),
        otherExpense: String(settlement.otherExpense),
        totalExpenses: String(settlement.totalExpenses),
        netProfit: String(settlement.netProfit),
        staffCount,
        partTimeCount,
        submittedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq4(dailySalesRecords.id, existing[0].id));
      const updated = await db.select().from(dailySalesRecords).where(eq4(dailySalesRecords.id, existing[0].id)).limit(1);
      result = updated[0];
    } else {
      const insertResult = await db.insert(dailySalesRecords).values({
        branchId: input.branchId,
        date: input.date,
        cash: String(cash),
        card: String(card),
        expenses: input.expenses,
        totalRevenue: String(settlement.totalRevenue),
        commissionExpense: String(settlement.commissionExpense),
        rentExpense: String(settlement.rentExpense),
        managementFeeExpense: String(settlement.managementFeeExpense),
        staffWageExpense: String(settlement.staffWageExpense),
        partTimeWageExpense: String(settlement.partTimeWageExpense),
        liquorCostExpense: String(settlement.liquorCostExpense),
        staffDrinkExpense: String(settlement.staffDrinkExpense),
        otherExpense: String(settlement.otherExpense),
        totalExpenses: String(settlement.totalExpenses),
        netProfit: String(settlement.netProfit),
        staffCount,
        partTimeCount,
        submittedAt: /* @__PURE__ */ new Date()
      });
      const recordId = insertResult.insertId;
      const created = await db.select().from(dailySalesRecords).where(eq4(dailySalesRecords.id, recordId)).limit(1);
      result = created[0];
    }
    return result;
  }),
  /**
   * 월 누적 현황 조회
   */
  getMonthlySummary: publicProcedure.input(z2.object({ branchId: z2.number(), year: z2.number(), month: z2.number() })).query(async ({ ctx, input }) => {
    const summary = await calculateMonthlySummary(input.branchId, input.year, input.month);
    return summary;
  }),
  /**
   * 기간별 정산 조회
   */
  getSettlementsByDateRange: publicProcedure.input(z2.object({ branchId: z2.number(), startDate: z2.string(), endDate: z2.string() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328" });
    const records = await db.select().from(dailySalesRecords).where(
      and4(
        eq4(dailySalesRecords.branchId, input.branchId),
        gte3(dailySalesRecords.date, input.startDate),
        lte3(dailySalesRecords.date, input.endDate)
      )
    ).orderBy(desc2(dailySalesRecords.date));
    return records;
  }),
  /**
   * 오늘 순수익 조회
   */
  getTodayNetProfit: publicProcedure.input(z2.object({ branchId: z2.number() })).query(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328" });
    const today = /* @__PURE__ */ new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const record = await db.select().from(dailySalesRecords).where(and4(eq4(dailySalesRecords.branchId, input.branchId), eq4(dailySalesRecords.date, todayStr))).limit(1);
    if (!record || record.length === 0) {
      return { netProfit: 0, totalRevenue: 0 };
    }
    return {
      netProfit: Number(record[0].netProfit || 0),
      totalRevenue: Number(record[0].totalRevenue || 0)
    };
  }),
  /**
   * 이번 달 누적 순수익 조회
   */
  getMonthlyNetProfit: publicProcedure.input(z2.object({ branchId: z2.number() })).query(async ({ ctx, input }) => {
    const today = /* @__PURE__ */ new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const summary = await calculateMonthlySummary(input.branchId, year, month);
    return {
      netProfit: summary.netProfit,
      totalRevenue: summary.totalRevenue
    };
  }),
  /**
   * 모든 지점의 오늘 순수익 조회
   */
  getAllBranchesTodayNetProfit: publicProcedure.query(async ({ ctx }) => {
    const payload = await parseStoreCookie(ctx.req.headers.cookie, ctx.req.headers.authorization);
    if (!payload) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
    const account = await getStoreAccountById(payload.accountId);
    if (!account) throw new TRPCError3({ code: "UNAUTHORIZED", message: "\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
    if (account.role !== "admin") {
      throw new TRPCError3({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "\uB370\uC774\uD130\uBCA0\uC774\uC2A4 \uC5F0\uACB0 \uC2E4\uD328" });
    const allBranches = await db.select().from(branches).orderBy(branches.name);
    const today = /* @__PURE__ */ new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const records = await db.select().from(dailySalesRecords).where(eq4(dailySalesRecords.date, todayStr));
    return allBranches.map((branch) => ({
      branchId: branch.id,
      branchName: branch.name,
      netProfit: Number(records.find((r) => r.branchId === branch.id)?.netProfit || 0),
      totalRevenue: Number(records.find((r) => r.branchId === branch.id)?.totalRevenue || 0)
    }));
  }),
  // 정산 계산 디버그
  debugCalculate: publicProcedure.input(z2.object({ branchId: z2.number(), date: z2.string(), managerCount: z2.number().default(0) })).query(async ({ input }) => {
    const db = await getDb();
    const dbExists = !!db;
    const dbUrl = !!process.env.DATABASE_URL;
    const { branchSettings: branchSettings2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
    const branchData = db ? await db.select().from(branches).where(eq4(branches.id, input.branchId)).limit(1) : [];
    const bsData = db ? await db.select().from(branchSettings2).where(eq4(branchSettings2.branchId, input.branchId)).limit(1) : [];
    const result = await calculateDailySettlement(input.branchId, input.date, 0, 0, 0, 0, [], null, input.managerCount, 0);
    return {
      dbExists,
      dbUrl,
      managerCount: input.managerCount,
      managerWageExpense: result.managerWageExpense,
      rentExpense: result.rentExpense,
      branchFound: branchData.length > 0,
      branchName: branchData.length > 0 ? branchData[0].name : null,
      bsFound: bsData.length > 0,
      bsManagerDailyWage: bsData.length > 0 ? String(bsData[0].managerDailyWage) : null
    };
  })
});

// server/branchSettingsRouter.ts
import { z as z3 } from "zod";
import { eq as eq5 } from "drizzle-orm";
init_db();
init_schema();
init_env();
import { TRPCError as TRPCError4 } from "@trpc/server";
import { jwtVerify as jwtVerify3 } from "jose";
var COOKIE_NAME2 = "app_session_id";
async function parseStoreCookie2(cookieHeader, authHeader) {
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  if (!token && cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k.trim(), v.join("=")];
      })
    );
    token = cookies[COOKIE_NAME2];
  }
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify3(token, secret, { algorithms: ["HS256"] });
    if (payload.type !== "store") return null;
    return payload;
  } catch {
    return null;
  }
}
var branchSettingsRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const storePayload = await parseStoreCookie2(
      ctx.req.headers.cookie,
      ctx.req.headers.authorization
    );
    const isStoreAdmin = storePayload?.role === "admin";
    const isOAuthAdmin = ctx.user?.role === "admin";
    if (!isStoreAdmin && !isOAuthAdmin) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "Admin access required" });
    }
    console.log("[branchSettings.getAll] Admin user accessing:", {
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      storeLoginId: storePayload?.loginId,
      storeRole: storePayload?.role
    });
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db.select().from(branchSettings).orderBy(branchSettings.branchId);
    console.log("[branchSettings.getAll] Query success, returning", result.length, "records");
    return result;
  }),
  getByBranch: publicProcedure.input(z3.object({ branchId: z3.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const [setting] = await db.select().from(branchSettings).where(eq5(branchSettings.branchId, input.branchId)).limit(1);
    return setting ?? null;
  }),
  upsert: publicProcedure.input(z3.object({
    branchId: z3.number(),
    monthlyRent: z3.number().min(0),
    managerMonthlySalary: z3.number().min(0),
    managerDailyWage: z3.number().min(0),
    deputyMonthlySalary: z3.number().min(0).default(0),
    deputyDailyWage: z3.number().min(0).default(0),
    staffMonthlySalary: z3.number().min(0).default(0),
    staffDailyWage: z3.number().min(0),
    partTimeHourlyWage: z3.number().min(0),
    monthlyFixedExpense: z3.number().min(0).default(0),
    commissionRate: z3.number().min(0).max(1).default(0.17),
    workType: z3.enum(["MON_FRI", "MON_SAT"]).default("MON_FRI")
  })).mutation(async ({ ctx, input }) => {
    const storePayload = await parseStoreCookie2(
      ctx.req.headers.cookie,
      ctx.req.headers.authorization
    );
    const isStoreAdmin = storePayload?.role === "admin";
    const isOAuthAdmin = ctx.user?.role === "admin";
    if (!isStoreAdmin && !isOAuthAdmin) {
      throw new TRPCError4({ code: "FORBIDDEN", message: "Admin access required" });
    }
    console.log("[branchSettings.upsert] Admin user updating:", {
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      storeLoginId: storePayload?.loginId,
      storeRole: storePayload?.role,
      branchId: input.branchId
    });
    const db = await getDb();
    if (!db) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR" });
    const computedDailyWage = input.managerMonthlySalary > 0 ? Math.round(input.managerMonthlySalary / 22) : input.managerDailyWage;
    const computedDeputyDailyWage = input.deputyMonthlySalary > 0 ? Math.round(input.deputyMonthlySalary / 22) : input.deputyDailyWage;
    const computedStaffDailyWage = input.staffMonthlySalary > 0 ? Math.round(input.staffMonthlySalary / 22) : input.staffDailyWage;
    const [existing] = await db.select().from(branchSettings).where(eq5(branchSettings.branchId, input.branchId)).limit(1);
    if (existing) {
      const result = await db.update(branchSettings).set({
        monthlyRent: String(input.monthlyRent),
        managerMonthlySalary: String(input.managerMonthlySalary),
        managerDailyWage: String(computedDailyWage),
        deputyMonthlySalary: String(input.deputyMonthlySalary),
        deputyDailyWage: String(computedDeputyDailyWage),
        staffMonthlySalary: String(input.staffMonthlySalary),
        staffDailyWage: String(computedStaffDailyWage),
        partTimeHourlyWage: String(input.partTimeHourlyWage),
        monthlyFixedExpense: String(input.monthlyFixedExpense ?? 0),
        commissionRate: String(input.commissionRate),
        workType: input.workType
      }).where(eq5(branchSettings.branchId, input.branchId));
      if (!result) throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: "Failed to update branch settings" });
    } else {
      await db.insert(branchSettings).values({
        branchId: input.branchId,
        monthlyRent: String(input.monthlyRent),
        managerMonthlySalary: String(input.managerMonthlySalary),
        managerDailyWage: String(computedDailyWage),
        deputyMonthlySalary: String(input.deputyMonthlySalary),
        deputyDailyWage: String(computedDeputyDailyWage),
        staffMonthlySalary: String(input.staffMonthlySalary),
        staffDailyWage: String(computedStaffDailyWage),
        partTimeHourlyWage: String(input.partTimeHourlyWage),
        monthlyFixedExpense: String(input.monthlyFixedExpense ?? 0),
        commissionRate: String(input.commissionRate),
        workType: input.workType
      });
    }
    try {
      console.log("[\uB9E4\uCD9C \uC7AC\uACC4\uC0B0 \uC2DC\uC791] branchId:", input.branchId);
      const tableReportsResult = await db.execute(`
          SELECT id, date FROM tableReports WHERE branchId = ${input.branchId}
        `);
      const tableReportIds = tableReportsResult.map((tr) => tr.id);
      if (tableReportIds.length > 0) {
        const updateResult = await db.execute(`
            UPDATE dailySalesRecords d
            SET d.totalRevenue = (
              SELECT COALESCE(SUM(CAST(ti.amount AS SIGNED)), 0)
              FROM tableItems ti
              JOIN tableReports tr ON ti.tableReportId = tr.id
              WHERE tr.branchId = d.branchId AND tr.date = d.date
            )
            WHERE d.branchId = ${input.branchId}
          `);
        console.log("[dailySalesRecords \uC5C5\uB370\uC774\uD2B8] \uC644\uB8CC:", updateResult);
      }
      console.log("[\uB9E4\uCD9C \uC7AC\uACC4\uC0B0 \uC644\uB8CC] branchId:", input.branchId);
    } catch (e) {
      console.error("[\uB9E4\uCD9C \uC7AC\uACC4\uC0B0 \uC624\uB958]", e);
    }
    try {
      const now = /* @__PURE__ */ new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      console.log("[\uC124\uC815 \uC800\uC7A5] \uC7AC\uACC4\uC0B0 \uC2DC\uC791:", { branchId: input.branchId, startDate, endDate });
      const result = await db.execute(`
          UPDATE dailySalesRecords d
          SET
            d.staffWageExpense = d.staffCount * ${input.staffDailyWage},
            d.managerWageExpense = (
              SELECT COALESCE(SUM(CASE
                WHEN si.staffType = 'manager' THEN ${computedDailyWage}
                WHEN si.staffType = 'deputy' THEN ${computedDeputyDailyWage}
                ELSE 0 END), 0)
              FROM staffIncentives si
              JOIN tableReports tr ON si.tableReportId = tr.id
              WHERE tr.branchId = d.branchId AND tr.date = d.date
            ),
            d.commissionExpense = ROUND(d.totalRevenue * ${input.commissionRate}),
            d.rentExpense = ROUND(${input.monthlyRent} / (
              SELECT COUNT(*) FROM (
                SELECT date FROM dailySalesRecords
                WHERE branchId = ${input.branchId}
                AND date BETWEEN '${startDate}' AND '${endDate}'
                AND DAYOFWEEK(date) != 1
                AND totalRevenue > 0
              ) sub
            )),
            d.totalExpenses = d.commissionExpense + d.rentExpense + d.managementFeeExpense
              + (d.staffCount * ${input.staffDailyWage})
              + (SELECT COALESCE(SUM(CASE
                  WHEN si.staffType = 'manager' THEN ${computedDailyWage}
                  WHEN si.staffType = 'deputy' THEN ${computedDeputyDailyWage}
                  ELSE 0 END), 0)
                 FROM staffIncentives si JOIN tableReports tr ON si.tableReportId = tr.id
                 WHERE tr.branchId = d.branchId AND tr.date = d.date)
              + d.partTimeWageExpense + d.liquorCostExpense + d.staffDrinkExpense + d.otherExpense,
            d.netProfit = d.totalRevenue - (d.commissionExpense + d.rentExpense + d.managementFeeExpense
              + (d.staffCount * ${input.staffDailyWage})
              + (SELECT COALESCE(SUM(CASE
                  WHEN si.staffType = 'manager' THEN ${computedDailyWage}
                  WHEN si.staffType = 'deputy' THEN ${computedDeputyDailyWage}
                  ELSE 0 END), 0)
                 FROM staffIncentives si JOIN tableReports tr ON si.tableReportId = tr.id
                 WHERE tr.branchId = d.branchId AND tr.date = d.date)
              + d.partTimeWageExpense + d.liquorCostExpense + d.staffDrinkExpense + d.otherExpense)
          WHERE d.branchId = ${input.branchId}
          AND d.date BETWEEN '${startDate}' AND '${endDate}'
          AND d.totalRevenue > 0
        `);
      console.log("[\uC124\uC815 \uC800\uC7A5] \uC7AC\uACC4\uC0B0 \uC644\uB8CC:", result);
    } catch (e) {
      console.error("[\uC124\uC815 \uC800\uC7A5 \uD6C4 \uC7AC\uACC4\uC0B0 \uC624\uB958]", e);
      throw new TRPCError4({ code: "INTERNAL_SERVER_ERROR", message: `Failed to recalculate settlements: ${e instanceof Error ? e.message : String(e)}` });
    }
    return { success: true, managerDailyWage: computedDailyWage, deputyDailyWage: computedDeputyDailyWage };
  })
});

// server/routers.ts
function formatKstDateString(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1e3);
  return kst.toISOString().slice(0, 10);
}
function todayKstString() {
  return formatKstDateString(/* @__PURE__ */ new Date());
}
async function normalizeMonthlyCumulativeRecord(record) {
  if (!record) return record;
  try {
    const todayCash = parseInt(record.cash || "0") || 0;
    const todayCard = parseInt(record.card || "0") || 0;
    const computed = await computeCumulativesForDate(record.branchId, record.date, null, todayCash, todayCard);
    const nextCashTotal = String(computed.cashTotal);
    const nextCardTotal = String(computed.cardTotal);
    if (record.cashTotal !== nextCashTotal || record.cardTotal !== nextCardTotal) {
      const db = await getDb();
      if (db && record.id) {
        await db.update(dailySalesRecords).set({ cashTotal: nextCashTotal, cardTotal: nextCardTotal, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(dailySalesRecords.id, record.id));
      }
      return { ...record, cashTotal: nextCashTotal, cardTotal: nextCardTotal };
    }
  } catch (error) {
    console.error("[normalizeMonthlyCumulativeRecord \uC624\uB958]", error);
  }
  return record;
}
if (ENV.vapidPublicKey && ENV.vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@salesdash.app",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
}
async function createStoreSessionToken(accountId, loginId, role) {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  return new SignJWT2({ accountId, loginId, role, type: "store" }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(Math.floor((Date.now() + ONE_YEAR_MS) / 1e3)).sign(secret);
}
var CANONICAL_STORE_ACCOUNTS = [
  { loginId: "s1", password: "1234", displayName: "\uC120\uB989\uC810 \uB9E4\uB2C8\uC800", branchCode: "seolleung", branchNames: ["\uC120\uB989\uC810"], role: "user" },
  { loginId: "s3", password: "1234", displayName: "\uC120\uB989\uC810 \uC9C1\uC6D0", branchCode: "seolleung", branchNames: ["\uC120\uB989\uC810"], role: "user" },
  { loginId: "s2", password: "1234", displayName: "\uC0BC\uC131\uC810 \uB9E4\uB2C8\uC800", branchCode: "samsung", branchNames: ["\uC0BC\uC131\uC810"], role: "user" },
  { loginId: "s4", password: "1234", displayName: "\uC0BC\uC131\uC810 \uC9C1\uC6D0", branchCode: "samsung", branchNames: ["\uC0BC\uC131\uC810"], role: "user" },
  { loginId: "d1", password: "1234", displayName: "\uB300\uCE58\uC810 \uB9E4\uB2C8\uC800", branchCode: "daechi", branchNames: ["\uB300\uCE58\uC810"], role: "user" },
  { loginId: "d2", password: "1234", displayName: "\uB300\uCE58\uC810 \uC9C1\uC6D0", branchCode: "daechi", branchNames: ["\uB300\uCE58\uC810"], role: "user" },
  { loginId: "m1", password: "1234", displayName: "\uBB38\uC8151\uD638\uC810 \uB9E4\uB2C8\uC800", branchCode: "munjeong1", branchNames: ["\uBB38\uC8151\uD638\uC810", "\uBB38\uC815 1\uD638\uC810"], role: "user" },
  { loginId: "m3", password: "1234", displayName: "\uBB38\uC8151\uD638\uC810 \uC9C1\uC6D0", branchCode: "munjeong1", branchNames: ["\uBB38\uC8151\uD638\uC810", "\uBB38\uC815 1\uD638\uC810"], role: "user" },
  { loginId: "m2", password: "1234", displayName: "\uBB38\uC8152\uD638\uC810 \uB9E4\uB2C8\uC800", branchCode: "munjeong2", branchNames: ["\uBB38\uC8152\uD638\uC810"], role: "user" },
  { loginId: "m4", password: "1234", displayName: "\uBB38\uC8152\uD638\uC810 \uC9C1\uC6D0", branchCode: "munjeong2", branchNames: ["\uBB38\uC8152\uD638\uC810"], role: "user" }
];
var canonicalAccountsSynced = false;
async function ensureCanonicalStoreAccounts() {
  if (canonicalAccountsSynced) return;
  const db = await getDb();
  if (!db) return;
  const allBranches = await db.select().from(branches);
  const normalize = (value) => value.replace(/\s+/g, "").trim();
  const branchByCode = new Map(allBranches.map((branch) => [branch.code, branch]));
  for (const spec of CANONICAL_STORE_ACCOUNTS) {
    let branch = branchByCode.get(spec.branchCode);
    if (!branch) {
      branch = allBranches.find((row) => spec.branchNames.some((name) => normalize(row.name) === normalize(name)));
    }
    if (!branch) continue;
    const existing = await getStoreAccountByLoginId(spec.loginId);
    if (existing) {
      await updateStoreAccount(existing.id, {
        displayName: spec.displayName,
        branchId: branch.id,
        role: spec.role
      });
    } else {
      const passwordHash = await bcrypt.hash(spec.password, 10);
      await createStoreAccount({
        loginId: spec.loginId,
        passwordHash,
        displayName: spec.displayName,
        branchId: branch.id,
        role: spec.role
      });
    }
  }
  canonicalAccountsSynced = true;
}
var DEFAULT_LIQUOR_ITEMS = [
  { name: "\uBC1C\uB80C\uD0C0\uC778 17y (500ml)", unitCost: 114e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uBC1C\uB80C\uD0C0\uC778 21y (500ml)", unitCost: 18e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uBC1C\uB80C\uD0C0\uC778 \uB9C8\uC2A4\uD130\uC988", unitCost: 5e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uBC1C\uB80C\uD0C0\uC778 30y", unitCost: 934800, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB80C\uBC84\uAE30 12y (700ml)", unitCost: 92400, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB80C\uBC84\uAE30 15y (700ml)", unitCost: 13e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB80C\uB9AC\uBCB3 12y (700ml)", unitCost: 97e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB80C\uB9AC\uBCB3 15y (700ml)", unitCost: 14e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB79C\uD53C\uB515 12y (500ml)", unitCost: 7e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB79C\uD53C\uB515 15y (500ml)", unitCost: 98e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB79C\uD53C\uB515 12y (700ml)", unitCost: 9e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB79C\uD53C\uB515 15y (700ml)", unitCost: 125e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110", unitCost: 85e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uB77C\uC0B0\uD0C0 12y", unitCost: 106e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC2DC\uADF8\uB137", unitCost: 34e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uBC1C\uBCA0\uB2C8 12y (700ml)", unitCost: 11e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uBC1C\uBCA0\uB2C8 14y (700ml)", unitCost: 18e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (500ml)", unitCost: 18e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (700ml)", unitCost: 296e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB799 (500ml)", unitCost: 4e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (500ml)", unitCost: 21e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (700ml)", unitCost: 3e5, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uB9E5\uCF08\uB780 12y (700ml)", unitCost: 11e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uB9E5\uCF08\uB780 15y (700ml)", unitCost: 22e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uB9E5\uCF08\uB780 18y (700ml)", unitCost: 8e5, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uC62C\uB4DC\uCE90\uC2AC", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uCE7C\uB77C\uC77C (700ml)", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uCE94\uD130\uD0A4 (700ml)", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uC2A4\uD2F8\uBE0C\uB8E9 \uB514\uB7ED\uC2A4", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uC874\uBC14 \uD30C\uC774\uB2C8\uC2A4\uD2B8", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uD0C8\uB9AC\uC2A4\uB9CC", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uAE00\uB80C\uB77C\uC528", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uC5E0\uD398\uB77C\uB3C4\uB974", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uCF54\uCFE4\uC704\uC2A4\uD0A4 (2.7L)", unitCost: 4e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134 \uBC84\uBC88 1L", unitCost: 2e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9", unitCost: 71e3, category: "\uC0F4\uD398\uC778" },
  { name: "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9 \uB85C\uC81C", unitCost: 92e3, category: "\uC0F4\uD398\uC778" },
  { name: "\uBAA8\uC5E3\uC0F9\uB3D9", unitCost: 74e3, category: "\uC0F4\uD398\uC778" },
  { name: "\uBAA8\uC5E3\uC0F9\uB3D9 \uB85C\uC81C", unitCost: 92e3, category: "\uC0F4\uD398\uC778" },
  { name: "\uB3D4\uD398\uB9AC\uB1FD", unitCost: 36e4, category: "\uC0F4\uD398\uC778" },
  { name: "\uB3D4\uD398\uB9AC\uB1FD \uBE48\uD2F0\uC9C0", unitCost: 45e4, category: "\uC0F4\uD398\uC778" },
  { name: "\uC544\uB974\uB9DD\uB514", unitCost: 1e6, category: "\uC0F4\uD398\uC778" },
  { name: "\uD5E4\uB124\uC2DC x.o", unitCost: 36e4, category: "\uAF2C\uB0D1" },
  { name: "\uD5E4\uB124\uC2DC v.s.o.p (500ml)", unitCost: 9e4, category: "\uAF2C\uB0D1" },
  { name: "\uB808\uBBF8\uB9C8\uD2F4 v.s.o.p", unitCost: 11e4, category: "\uAF2C\uB0D1" },
  { name: "\uC2DC\uBC14\uC2A4\uB9AC\uAC08 12y", unitCost: 53e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uACE8\uB4E0\uBE14\uB8E8", unitCost: 3e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "1800 \uC544\uB124\uD638", unitCost: 9e4, category: "\uB370\uD0AC\uB77C" },
  { name: "\uC544\uB4DC\uBC31 10y", unitCost: 12e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uD0C8\uB9AC\uC2A4\uCEE4 10y", unitCost: 9e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uB2EC\uBAA8\uC5B4 12y", unitCost: 12e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uB2EC\uBAA8\uC5B4 \uD0B9", unitCost: 5e5, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uCE74\uBC1C\uB780", unitCost: 99e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uB9E5\uCF54\uB12C\uC2A4", unitCost: 85e3, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uC5BC\uB9AC\uD0C0\uC784\uC988", unitCost: 3e4, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uD788\uBE44\uD0A4 \uD558\uBAA8\uB2C8", unitCost: 3e5, category: "\uC704\uC2A4\uD0A4" },
  { name: "\uBC14\uD1A4 \uBCF4\uB4DC\uCE74", unitCost: 7e3, category: "\uBCF4\uB4DC\uCE74/\uC9C4/\uB7FC" },
  { name: "\uBC14\uD1A4 \uC9C4", unitCost: 7e3, category: "\uBCF4\uB4DC\uCE74/\uC9C4/\uB7FC" },
  { name: "\uB7FC", unitCost: 8e3, category: "\uBCF4\uB4DC\uCE74/\uC9C4/\uB7FC" },
  { name: "\uBA54\uB860 \uB9AC\uD050\uB974", unitCost: 21e3, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uD53C\uCE58 \uB9AC\uD050\uB974", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uC544\uB9C8\uB808\uD1A0", unitCost: 24800, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uC5BC\uADF8\uB808\uC774 \uC2DC\uB7FD", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uADF8\uB808\uB098\uB518", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uBAA8\uD788\uD1A0 \uC2DC\uB7FD", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uC790\uBABD\uC2DC\uB7FD", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uCCAD\uD3EC\uB3C4\uC2DC\uB7FD", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uC218\uBC15\uC2DC\uB7FD", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uC559\uACE0\uC2A4\uD22C\uB77C", unitCost: 6e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uB9C8\uD2F0\uB2C8 \uB4DC\uB77C\uC774", unitCost: 19e3, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uB4DC\uB7FC\uBD80\uC774", unitCost: 42800, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uB9D0\uB9AC\uBD80", unitCost: 28e3, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uBAAC\uD14C\uC8FC\uB9C8 (\uB370\uD0AC\uB77C)", unitCost: 18e3, category: "\uB370\uD0AC\uB77C" },
  { name: "\uAE54\uB8E8\uC544", unitCost: 3e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uBCA0\uC77C\uB9AC\uC2A4", unitCost: 4e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uD2B8\uB9AC\uD50C\uC139", unitCost: 22e3, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uBC14\uB098\uB098 \uB9AC\uD050\uB974", unitCost: 22e3, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uBE14\uB8E8\uD050\uB77C\uC18C", unitCost: 22e3, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uB77C\uC784\uC8FC\uC2A4", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uD53C\uB098\uBBF9\uC2A4", unitCost: 2e4, category: "\uB9AC\uD050\uB974/\uC2DC\uB7FD" },
  { name: "\uCE74\uD504\uB9AC", unitCost: 1700, category: "\uB9E5\uC8FC" },
  { name: "\uD638\uAC00\uB4E0", unitCost: 2200, category: "\uB9E5\uC8FC" },
  { name: "\uD558\uC774\uB124\uCF04", unitCost: 3300, category: "\uB9E5\uC8FC" },
  { name: "\uCF54\uB85C\uB098", unitCost: 2450, category: "\uB9E5\uC8FC" },
  { name: "\uAE30\uB124\uC2A4", unitCost: 4300, category: "\uB9E5\uC8FC" },
  { name: "\uC0DD\uB9E5\uC8FC 1\uD1B5", unitCost: 1e5, category: "\uB9E5\uC8FC" }
];
var BOXHERO_STOCK_SEED_VERSION = "boxhero-stock-2026-05-03-v2";
var BOXHERO_BRANCH_STOCKS = {
  "\uB300\uCE58\uC810": [
    {
      "name": "1800 \uC544\uB124\uD638",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uACE8\uB4E0\uBE14\uB8E8",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uADF8\uB808\uB098\uB518",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uAE00\uB79C\uB77C\uC528",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uB9AC\uBCB3 12y (700ml)",
      "quantity": 8,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uB9AC\uBCB3 15y (700ml)",
      "quantity": 7,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uB77C\uC0B0\uD0C0 12y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC2DC\uADF8\uB137",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBC84\uAE30 12y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBC84\uAE30 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 12y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 15y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE30\uB124\uC2A4",
      "quantity": 48,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uB2EC\uBAA8\uC5B4",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB2EC\uBAA8\uC5B4\uD0B9 \uC54C\uB809\uC0B0\uB354 3\uC138",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB3D4\uD398\uB9AC\uB1FD",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB4DC\uB7FC\uBD80\uC774",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB77C\uC784\uC8FC\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB7FC",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB808\uBBF8\uB9C8\uD2F4 v.s.o.p",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB860 \uB514\uC544\uC988151",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9C8\uD2F0\uB2C8 \uB4DC\uB77C\uC774",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9D0\uB9AC\uBD80",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9E5\uCF08\uB780 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 18y (700ml)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF54\uB12C\uC2A4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9 \uB85C\uC81C",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA54\uB860 \uB9AC\uD050\uB974",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9 \uB85C\uC81C",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uD788\uD1A0 \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAAC\uD14C\uC8FC\uB9C8 (\uB370\uD0AC\uB77C)",
      "quantity": 4,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134 \uBC84\uBC88",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC14\uB098\uB098 \uB9AC\uD050\uB974",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uB2D0\uB77C \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 17y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 21y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 30y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 \uB9C8\uC2A4\uD130\uC988",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 12y (700ml)",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 14y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC84\uB4DC\uC640\uC774\uC800 \uC0DD\uB9E5",
      "quantity": 2,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uBCA0\uC77C\uB9AC\uC2A4",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBCA8\uC988 (\uBB34\uC81C\uD55C)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBCF4\uB4DC\uCE74",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBE14\uB8E8\uD050\uB77C\uC18C",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC218\uBC15\uC2DC\uB7FD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC2A4\uD154\uB77C \uBCD1\uB9E5",
      "quantity": 0,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uC2A4\uD2F8\uBE0C\uB8E9\uB514\uB7ED\uC2A4",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB4DC\uBC31",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB974\uB9DD\uB514",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB9C8\uB808\uD1A0",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC559\uACE0\uC2A4\uD22C\uB77C",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC57C\uB9C8\uC790\uD0A4",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC5BC\uADF8\uB808\uC774 \uC2DC\uB7FD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC5BC\uB9AC\uD0C0\uC784\uC988",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC5E0\uD398\uB77C\uB3C4\uB974\uB514\uB7ED\uC2A4\uC2A4\uD398\uC15C\uB9AC\uC800\uBE0C",
      "quantity": 5,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC62C\uB4DC\uCE90\uC2AC",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC790\uBABD \uC2DC\uB7FD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB799",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC874\uBC14 \uD30C\uC774\uB2C8\uC2A4\uD2B8",
      "quantity": 5,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC9C4",
      "quantity": 5,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCCAD\uD3EC\uB3C4 \uC2DC\uB7FD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCE74\uBC1C\uB780",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE74\uC2A4 \uB17C\uC54C\uCF5C\uB9E5\uC8FC",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE74\uD504\uB9AC",
      "quantity": 34,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uCE7C\uB77C\uC77C",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE7C\uB8E8\uC544",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCE94\uD130\uD0A4",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCF54\uCFE4 (\uBB34\uC81C\uD55C)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD06C\uB818 \uB4DC \uBBFC\uD2B8",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD06C\uB818 \uB4DC \uCE74\uCE74\uC624",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD074\uB77C\uC138 \uC544\uC904 \uB808\uD3EC\uC0AC\uB3C4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uB9CC (\uBB34\uC81C\uD55C)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uCEE4",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD2B8\uB9AC\uD50C\uC139",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uB098\uBBF9\uC2A4",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uCE58 \uB9AC\uD050\uB974",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD558\uC774\uB124\uCF04",
      "quantity": 25,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD55C\uB9E5 \uC0DD\uB9E5",
      "quantity": 2,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD5E4\uB124\uC2DC v.s.o.p",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD5E4\uB124\uC2DC x.o",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD638\uAC00\uB4E0",
      "quantity": 28,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD788\uBE44\uD0A4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    }
  ],
  "\uBB38\uC8151\uD638\uC810": [
    {
      "name": "1800 \uC544\uB124\uD638",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uACE8\uB4E0\uBE14\uB791",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uACE8\uB4E0\uBE14\uB791 \uB85C\uC81C",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uACE8\uB4E0\uBE14\uB8E8",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uADF8\uB808\uB098\uB518",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uB77C\uC0B0\uD0C0 12y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC2DC\uADF8\uB137",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 12y (500ml)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 15y (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB77C\uC528",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB9AC\uBCB3 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB9AC\uBCB3 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBC84\uAE30 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBC84\uAE30 15y (700ml)",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE30\uB124\uC2A4",
      "quantity": 27,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uAE54\uB8E8\uC544",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB2EC\uBAA8\uC5B4 12y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB2EC\uBAA8\uC5B4 \uD0B9",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB3D4\uD398\uB9AC\uB1FD",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB4DC\uB7FC\uBD80\uC774",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB77C\uC784\uC8FC\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB7FC",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB808\uBBF8\uB9C8\uD2F4 v.s.o.p",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uD06C\uB85C\uBAAC\uB4DC \uC624\uB9AC\uC9C0\uB110",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9C8\uD2F0\uB2C8 \uB4DC\uB77C\uC774",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9D0\uB9AC\uBD80",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9E5\uCF08\uB780 12y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 15y (700ml)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 18y (700ml)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF54\uB12C\uC2A4",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9 \uB85C\uC81C",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA54\uB860 \uB9AC\uD050\uB974",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9 \uB85C\uC81C",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uD788\uD1A0 \uC2DC\uB7FD",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAAC\uD14C\uC8FC\uB9C8 (\uB370\uD0AC\uB77C)",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBBF8\uC2A4\uD130 \uBCF4\uC2A4\uD134 \uBC84\uBC88",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC14\uB098\uB098 \uB9AC\uD050\uB974",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uB2D0\uB77C \uC2DC\uB7FD",
      "quantity": 0,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uD1A4 \uBCF4\uB4DC\uCE74",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uD1A4 \uC9C4",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 17y (500ml)",
      "quantity": 5,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 21y (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 30y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 \uB9C8\uC2A4\uD130\uC988 (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 12y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 14y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC84\uB4DC\uC640\uC774\uC800 \uC0DD",
      "quantity": 2,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uBCA0\uC77C\uB9AC\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBCA8\uC988 (\uBB34\uC81C\uD55C)",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBE14\uB8E8\uD050\uB77C\uC18C",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC218\uBC15\uC2DC\uB7FD",
      "quantity": 4,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC2A4\uD2F8\uBE0C\uB8E9 \uB514\uB7ED\uC2A4",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC2DC\uBC14\uC2A4\uB9AC\uAC08 12y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC2F1\uAE00\uD1A4 12y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB4DC\uBC31 10y",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB974\uB9DD\uB514",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB9C8\uB808\uD1A0",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC559\uACE0\uC2A4\uD22C\uB77C",
      "quantity": 4,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC5BC\uADF8\uB808\uC774 \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC5BC\uB9AC\uD0C0\uC784\uC988",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC5E0\uD398\uB77C\uB3C4\uB974",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC62C\uB4DC\uCE90\uC2AC",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC790\uBABD \uC2DC\uB7FD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB799 (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC874\uBC14 \uD30C\uC774\uB2C8\uC2A4\uD2B8",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCCAD\uD3EC\uB3C4 \uC2DC\uB7FD",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCE74\uBC1C\uB780",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE74\uD504\uB9AC",
      "quantity": 32,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uCE7C\uB77C\uC77C",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE94\uD130\uD0A4",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCF54\uB85C\uB098",
      "quantity": 0,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uCF54\uCFE4 (\uBB34\uC81C\uD55C)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uB9CC (\uBB34\uC81C\uD55C)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uCEE4 10y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD2B8\uB9AC\uD50C\uC139",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uB098\uBBF9\uC2A4",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uCE58 \uB9AC\uD050\uB974",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD558\uC774\uB124\uCF04",
      "quantity": 28,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD55C\uB9E5",
      "quantity": 1,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD5E4\uB124\uC2DC v.s.o.p",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD5E4\uB124\uC2DC x.o",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD638\uAC00\uB4E0",
      "quantity": 25,
      "category": "\uB9E5\uC8FC"
    }
  ],
  "\uBB38\uC8152\uD638\uC810": [
    {
      "name": "\uACE8\uB4E0\uBE14\uB791",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uACE8\uB4E0\uBE14\uB791 \uB85C\uC81C",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uACE8\uB4E0\uBE14\uB8E8",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uADF8\uB808\uB098\uB518",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uB77C\uC0B0\uD0C0 12y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC2DC\uADF8\uB137",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 12y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 15y (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB77C\uC528",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB9AC\uBCB3 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB9AC\uBCB3 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBC84\uAE30 12y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBC84\uAE30 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE30\uB124\uC2A4",
      "quantity": 0,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uAE54\uB8E8\uC544",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB2EC\uBAA8\uC5B4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB3D4\uD398\uB9AC\uB1FD",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB4DC\uB7FC\uBD80\uC774",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB77C\uC784\uC8FC\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB7FC",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB808\uBBF8\uB9C8\uD2F4 v.s.o.p",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uD06C\uB85C\uBAAC\uB4DC \uC624\uB9AC\uC9C0\uB110",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB860\uB514\uC544\uC988",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9C8\uD2F0\uB2C8 \uB4DC\uB77C\uC774",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9D0\uB9AC\uBD80",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9E5\uCF08\uB780 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 15y (700ml)",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 18y (700ml)",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9 \uB85C\uC81C",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA54\uB860 \uB9AC\uD050\uB974",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9 \uB85C\uC81C",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uD788\uD1A0 \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAAC\uD14C\uC8FC\uB9C8 (\uB370\uD0AC\uB77C)",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC14\uB098\uB098 \uB9AC\uD050\uB974",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uB2D0\uB77C \uC2DC\uB7FD",
      "quantity": 0,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uD1A4 \uBCF4\uB4DC\uCE74",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uD1A4 \uC9C4",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 17y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 21y (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 30y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 14y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC84\uB4DC\uC640\uC774\uC800",
      "quantity": 61,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uBCA0\uC77C\uB9AC\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBCA8\uC988",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBCA8\uC988 (\uBB34\uC81C\uD55C)",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBE14\uB791 1664",
      "quantity": 16,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uBE14\uB8E8\uD050\uB77C\uC18C",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC218\uBC15\uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC2A4\uD2F8\uBE0C\uB8E9",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC2DC\uBC14\uC2A4\uB9AC\uAC08 12y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC2F1\uAE00\uD1A4 12y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB124\uD638 1800",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB4DC\uBC31",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB974\uB9DD\uB514",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB9C8\uB808\uD1A0",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC559\uACE0\uC2A4\uD22C\uB77C",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC5BC\uADF8\uB808\uC774 \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC5BC\uB9AC\uD0C0\uC784\uC988",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC5E0\uD398\uB77C\uB3C4\uB974",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC62C\uB4DC\uCE90\uC2AC",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC790\uBABD \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC874\uBC14 \uD30C\uC774\uB2C8\uC2A4\uD2B8",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCCAD\uD3EC\uB3C4 \uC2DC\uB7FD",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCE74\uBC1C\uB780",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE7C\uB77C\uC77C",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE94\uD130\uD0A4",
      "quantity": 5,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCF08\uB9AC",
      "quantity": 2,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uCF54\uB85C\uB098",
      "quantity": 20,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uCF54\uCFE4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C0\uC774\uAC70",
      "quantity": 14,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uB9CC",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uCEE4",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD2B8\uB9AC\uD50C\uC139",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uB098\uBBF9\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uCE58 \uB9AC\uD050\uB974",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD558\uC774\uB124\uCF04",
      "quantity": 29,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD5E4\uB124\uC2DC v.s.o.p",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD5E4\uB124\uC2DC x.o",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD638\uAC00\uB4E0",
      "quantity": 0,
      "category": "\uB9E5\uC8FC"
    }
  ],
  "\uC0BC\uC131\uC810": [
    {
      "name": "\uACE8\uB4E0\uBE14\uB8E8",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uADF8\uB808\uB098\uB518 \uC2DC\uB7FD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uAE00\uB80C\uB77C\uC528",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB9AC\uBCB3 12y",
      "quantity": 6,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB9AC\uBCB3 15y",
      "quantity": 9,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBAA8\uB80C\uC9C0 \uC2DC\uADF8\uB137",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB1101L",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBAA8\uB80C\uC9C012y \uB77C\uC0B0\uD0C0",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBAA8\uB80C\uC9C012y \uC624\uB9AC\uC9C0\uB110",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBC84\uAE30 15y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBC84\uAE3012y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uD53C\uB515 12y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uD53C\uB515 12y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uD53C\uB515 15y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uD53C\uB515 15y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE30\uB124\uC2A4",
      "quantity": 17,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uB2EC\uBAA8\uC5B4 12y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB2EC\uBAA8\uC5B4\uD0B9",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB370\uD0AC\uB77C",
      "quantity": 5,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB3D4\uD398\uB9AC\uB1FD",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB3D4\uD398\uB9AC\uB1FD \uBE48\uD2F0\uC9C0",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB4DC\uB77C\uC774 \uB9C8\uD2F0\uB2C8",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB4DC\uB7FC\uBD80\uC774",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB77C\uC784\uC8FC\uC2A4",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB7FC",
      "quantity": 5,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB808\uBBF8\uB9C8\uD2F4 vsop",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584 21y (500ml)",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584 21y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB860\uB514\uC544\uC988",
      "quantity": 0,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9D0\uB9AC\uBD80",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9E5\uCF08\uB780 12y \uB354\uBE14\uCE90\uC2A4\uD06C",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 15y",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 18y",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB78012y\uD2B8\uB9AC\uD50C\uCE90\uC2A4\uD06C",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF54\uB12C\uC2A4",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48\uB85C\uC81C",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA54\uB860",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9 \uB85C\uC81C",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uD788\uD1A0 \uC2DC\uB7FD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134 \uBC84\uBC88",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC14\uB098\uB098 \uB9AC\uD050\uB974",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uB2D0\uB77C",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 17y",
      "quantity": 9,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 21y",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 30y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 \uB9C8\uC2A4\uD130\uC988",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 12y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 14y",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 21y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC84\uB4DC\uC640\uC774\uC800 \uC0DD\uB9E5\uC8FC",
      "quantity": 1,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uBCA0\uC77C\uB9AC\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBCA8\uC988 \uC704\uC2A4\uD0A4",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBCF4\uB4DC\uCE74",
      "quantity": 5,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBE14\uB791",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBE14\uB791 \uB85C\uC81C",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBE14\uB8E8 \uD050\uB77C\uC18C",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC218\uBC15\uC2DC\uB7FD",
      "quantity": 4,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC2A4\uD154\uB77C",
      "quantity": 0,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uC2A4\uD2F8\uBE0C\uB8E9 \uB514\uB7ED\uC2A4",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC2DC\uBC14\uC2A4\uB9AC\uAC08 12y (700ml)",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC2F1\uAE00\uD1A4",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB4DC\uBC31 10y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB974\uB9DD\uB514",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB9C8\uB808\uD1A0 \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC559\uACE0\uC2A4\uD22C\uB77C \uBE44\uD130\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC57C\uB9C8\uC790\uD0A4",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC5BC\uADF8\uB808\uC774",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC5E0\uD398\uB77C\uB3C4\uB974 \uB514\uB7ED\uC2A4 \uC2A4\uD398\uC15C \uB9AC\uC800\uBE0C",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC62C\uB4DC\uCE90\uC2AC",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC790\uBABD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC870\uB2C8\uBE14\uB8E8 (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uBE14\uB8E8 (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB799",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC874\uBC14 \uD30C\uC774\uB2C8\uC2A4\uD2B8",
      "quantity": 6,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC9C4",
      "quantity": 5,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCCAD\uD3EC\uB3C4",
      "quantity": 0,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCE74\uBC1C\uB780",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE74\uD504\uB9AC",
      "quantity": 33,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uCE7C\uB77C\uC77C",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE7C\uB8E8\uC544",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCE94\uD130\uD0A4",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCF54\uCFE4 \uC704\uC2A4\uD0A4",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD074\uB77C\uC138 \uC544\uC904 \uB808\uD3EC\uC0AC\uB3C4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uB9CC",
      "quantity": 4,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uCEE4 10y",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD2B8\uB9AC\uD50C\uC139",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD398\uB9AC\uC5D0\uC96C\uC5D0",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD53C\uB098\uBBF9\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uCE58",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD558\uC774\uB124\uCE94",
      "quantity": 19,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD55C\uB9E5 \uC0DD\uB9E5\uC8FC",
      "quantity": 2,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD5E4\uB124\uC2DC vsop",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD5E4\uB124\uC2DC xo",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD638\uAC00\uB4E0",
      "quantity": 12,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD638\uC138\uAFB8\uC5D8\uBCF4 1800 \uC544\uB124\uD638",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD788\uBE44\uD0A4 \uD558\uBAA8\uB2C8",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    }
  ],
  "\uC120\uB989\uC810": [
    {
      "name": "1800\uC544\uB124\uD638\uB370\uD0AC\uB77C",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uACE8\uB4E0\uBE14\uB8E8",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uADF8\uB808\uB098\uB518",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uB77C\uC0B0\uD0C0 12y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC2DC\uADF8\uB137",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110 1L",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 12y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 15y (500ml)",
      "quantity": 5,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB79C\uD53C\uB515 15y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB9AC\uBCB3 12y (700ml)",
      "quantity": 6,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uB9AC\uBCB3 15y (700ml)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBC84\uAE30 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE00\uB80C\uBC84\uAE30 15y (700ml)",
      "quantity": 10,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uAE30\uB124\uC2A4",
      "quantity": 45,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uAE54\uB8E8\uC544",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB2EC\uBAA8\uC5B4 12y",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB3D4\uD398\uB9AC\uB1FD",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB4DC\uB7FC\uBD80\uC774",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB77C\uC784\uC8FC\uC2A4",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB7FC",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB808\uBBF8\uB9C8\uD2F4 v.s.o.p",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB808\uBBF8\uB9C8\uD2F4 xo",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (500ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB860\uB514\uC544\uC988 \uB7FC",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9C8\uD2F0\uB2C8 \uB4DC\uB77C\uC774",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9D0\uB9AC\uBD80",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uB9E5\uCF08\uB780 12y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 15y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 18y (700ml)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF08\uB780 \uD2B8\uB9AC\uD50C\uCE90\uC2A4\uD06C12\uB144700ml",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uB9E5\uCF54\uB12C\uC2A4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9 \uB85C\uC81C",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBA54\uB860 \uB9AC\uD050\uB974",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uC5E3\uC0F9\uB3D9 \uB85C\uC81C",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBAA8\uD788\uD1A0 \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBAAC\uD14C\uC8FC\uB9C8 (\uB370\uD0AC\uB77C)",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uB098\uB098 \uB9AC\uD050\uB974",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uD1A4 \uBCF4\uB4DC\uCE74",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC14\uD1A4 \uC9C4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 17y (500ml)",
      "quantity": 6,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 21y (500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778 30y",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uB80C\uD0C0\uC778\uB9C8\uC2A4\uD130\uC988(500ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 12y (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBC1C\uBCA0\uB2C8 14y (700ml)",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uBCA0\uC77C\uB9AC\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uBE14\uB8E8\uD050\uB77C\uC18C",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC218\uBC15\uC2DC\uB7FD",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC544\uB4DC\uBC3110\uB144",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB974\uB9DD\uB514",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC544\uB9C8\uB808\uD1A0",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC544\uC904 \uB370\uD0AC\uB77C",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC559\uACE0\uC2A4\uD22C\uB77C",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC57C\uB9C8\uC790\uD0A4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC57C\uB9C8\uC790\uD0A4 DR",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC5BC\uADF8\uB808\uC774 \uC2DC\uB7FD",
      "quantity": 3,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC790\uBABD \uC2DC\uB7FD",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB799",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (500ml)",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (700ml)",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC874\uBC14 \uD30C\uC774\uB2C8\uC2A4\uD2B8",
      "quantity": 10,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uC9D0\uBE54",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCCAD\uD3EC\uB3C4 \uC2DC\uB7FD",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uCE74\uBC1C\uB780",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uCE74\uD504\uB9AC",
      "quantity": 33,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uCE94\uD130\uD0A4",
      "quantity": 3,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD0C8\uB9AC\uC2A4\uCEE410\uB144",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD2B8\uB9AC\uD50C\uC139",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uB098\uBBF9\uC2A4",
      "quantity": 2,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD53C\uCE58 \uB9AC\uD050\uB974",
      "quantity": 1,
      "category": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
    },
    {
      "name": "\uD558\uC774\uB124\uCF04",
      "quantity": 14,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD5E4\uB124\uC2DC v.s.o.p",
      "quantity": 2,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD5E4\uB124\uC2DC x.o",
      "quantity": 0,
      "category": "\uC704\uC2A4\uD0A4"
    },
    {
      "name": "\uD638\uAC00\uB4E0",
      "quantity": 21,
      "category": "\uB9E5\uC8FC"
    },
    {
      "name": "\uD788\uBE44\uD0A4",
      "quantity": 1,
      "category": "\uC704\uC2A4\uD0A4"
    }
  ]
};
var BOXHERO_CATEGORY_FALLBACK = {
  "\uC0F4\uD398\uC778": "\uC704\uC2A4\uD0A4",
  "\uAF2C\uB0D1": "\uC704\uC2A4\uD0A4",
  "\uB370\uD0AC\uB77C": "\uC704\uC2A4\uD0A4",
  "\uBCF4\uB4DC\uCE74/\uC9C4/\uB7FC": "\uB9AC\uD050\uB974/\uC2DC\uB7FD"
};
var BOXHERO_ITEM_ALIASES = {
  "1800\uC544\uB124\uD638\uB370\uD0AC\uB77C": "1800 \uC544\uB124\uD638",
  "\uC544\uB124\uD6381800": "1800 \uC544\uB124\uD638",
  "\uD638\uC138\uAFB8\uC5D8\uBCF41800\uC544\uB124\uD638": "1800 \uC544\uB124\uD638",
  "\uAE00\uB80C\uB9AC\uBCB312y": "\uAE00\uB80C\uB9AC\uBCB3 12y (700ml)",
  "\uAE00\uB79C\uB9AC\uBCB312y700ml": "\uAE00\uB80C\uB9AC\uBCB3 12y (700ml)",
  "\uAE00\uB80C\uB9AC\uBCB312y700ml": "\uAE00\uB80C\uB9AC\uBCB3 12y (700ml)",
  "\uAE00\uB80C\uB9AC\uBCB315y": "\uAE00\uB80C\uB9AC\uBCB3 15y (700ml)",
  "\uAE00\uB79C\uB9AC\uBCB315y700ml": "\uAE00\uB80C\uB9AC\uBCB3 15y (700ml)",
  "\uAE00\uB80C\uB9AC\uBCB315y700ml": "\uAE00\uB80C\uB9AC\uBCB3 15y (700ml)",
  "\uAE00\uB80C\uBC84\uAE3012y": "\uAE00\uB80C\uBC84\uAE30 12y (700ml)",
  "\uAE00\uB80C\uBC84\uAE3012y700ml": "\uAE00\uB80C\uBC84\uAE30 12y (700ml)",
  "\uAE00\uB79C\uBC84\uAE3012y700ml": "\uAE00\uB80C\uBC84\uAE30 12y (700ml)",
  "\uAE00\uB80C\uBC84\uAE3015y": "\uAE00\uB80C\uBC84\uAE30 15y (700ml)",
  "\uAE00\uB80C\uBC84\uAE3015y700ml": "\uAE00\uB80C\uBC84\uAE30 15y (700ml)",
  "\uAE00\uB79C\uBC84\uAE3015y700ml": "\uAE00\uB80C\uBC84\uAE30 15y (700ml)",
  "\uAE00\uB80C\uD53C\uB51512y500ml": "\uAE00\uB79C\uD53C\uB515 12y (500ml)",
  "\uAE00\uB79C\uD53C\uB51512y500ml": "\uAE00\uB79C\uD53C\uB515 12y (500ml)",
  "\uAE00\uB80C\uD53C\uB51512y700ml": "\uAE00\uB79C\uD53C\uB515 12y (700ml)",
  "\uAE00\uB79C\uD53C\uB51512y700ml": "\uAE00\uB79C\uD53C\uB515 12y (700ml)",
  "\uAE00\uB80C\uD53C\uB51515y500ml": "\uAE00\uB79C\uD53C\uB515 15y (500ml)",
  "\uAE00\uB79C\uD53C\uB51515y500ml": "\uAE00\uB79C\uD53C\uB515 15y (500ml)",
  "\uAE00\uB80C\uD53C\uB51515y700ml": "\uAE00\uB79C\uD53C\uB515 15y (700ml)",
  "\uAE00\uB79C\uD53C\uB51515y700ml": "\uAE00\uB79C\uD53C\uB515 15y (700ml)",
  "\uAE00\uB80C\uBAA8\uB80C\uC9C0\uC2DC\uADF8\uB137": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC2DC\uADF8\uB137",
  "\uAE00\uB79C\uBAA8\uB80C\uC9C0\uC2DC\uADF8\uB137": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC2DC\uADF8\uB137",
  "\uAE00\uB80C\uBAA8\uB80C\uC9C012y\uB77C\uC0B0\uD0C0": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uB77C\uC0B0\uD0C0 12y",
  "\uAE00\uB79C\uBAA8\uB80C\uC9C0\uB77C\uC0B0\uD0C012y": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uB77C\uC0B0\uD0C0 12y",
  "\uAE00\uB80C\uBAA8\uB80C\uC9C012y\uC624\uB9AC\uC9C0\uB110": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110",
  "\uAE00\uB79C\uBAA8\uB80C\uC9C0\uC624\uB9AC\uC9C0\uB110": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110",
  "\uAE00\uB79C\uBAA8\uB80C\uC9C0\uC624\uB9AC\uC9C0\uB1101l": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110 1L",
  "\uAE00\uB80C\uBAA8\uB80C\uC9C0\uC624\uB9AC\uC9C0\uB1101l": "\uAE00\uB79C\uBAA8\uB80C\uC9C0 \uC624\uB9AC\uC9C0\uB110 1L",
  "\uAE00\uB79C\uB77C\uC528": "\uAE00\uB80C\uB77C\uC528",
  "\uB85C\uC58421y500ml": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (500ml)",
  "\uB85C\uC584\uC0B4\uB8E8\uD2B821y500ml": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (500ml)",
  "\uB85C\uC58421y700ml": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (700ml)",
  "\uB85C\uC584\uC0B4\uB8E8\uD2B821y700ml": "\uB85C\uC584\uC0B4\uB8E8\uD2B8 21y (700ml)",
  "\uB9E5\uCF08\uB78012y\uB354\uBE14\uCE90\uC2A4\uD06C": "\uB9E5\uCF08\uB780 12y (700ml)",
  "\uB9E5\uCF08\uB78012y700ml": "\uB9E5\uCF08\uB780 12y (700ml)",
  "\uB9E5\uCF08\uB78015y": "\uB9E5\uCF08\uB780 15y (700ml)",
  "\uB9E5\uCF08\uB78015y700ml": "\uB9E5\uCF08\uB780 15y (700ml)",
  "\uB9E5\uCF08\uB78018y": "\uB9E5\uCF08\uB780 18y (700ml)",
  "\uB9E5\uCF08\uB78018y700ml": "\uB9E5\uCF08\uB780 18y (700ml)",
  "\uB9E5\uCF08\uB78012y\uD2B8\uB9AC\uD50C\uCE90\uC2A4\uD06C": "\uB9E5\uCF08\uB780 \uD2B8\uB9AC\uD50C\uCE90\uC2A4\uD06C12\uB144700ml",
  "\uB2EC\uBAA8\uC5B4": "\uB2EC\uBAA8\uC5B4 12y",
  "\uB2EC\uBAA8\uC5B4\uD0B9": "\uB2EC\uBAA8\uC5B4 \uD0B9",
  "\uB2EC\uBAA8\uC5B4\uD0B9\uC54C\uB809\uC0B0\uB3543\uC138": "\uB2EC\uBAA8\uC5B4 \uD0B9",
  "\uB808\uBBF8\uB9C8\uD2F4vsop": "\uB808\uBBF8\uB9C8\uD2F4 v.s.o.p",
  "\uB808\uBBF8\uB9C8\uD2F4xo": "\uB808\uBBF8\uB9C8\uD2F4 xo",
  "\uD5E4\uB124\uC2DCvsop": "\uD5E4\uB124\uC2DC v.s.o.p",
  "\uD5E4\uB124\uC2DCxo": "\uD5E4\uB124\uC2DC x.o",
  "\uBA48": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9",
  "\uBA48\uB85C\uC81C": "\uBA48 \uADF8\uB791\uAF2C\uB974\uB3D9 \uB85C\uC81C",
  "\uBC1C\uB80C\uD0C0\uC77817y": "\uBC1C\uB80C\uD0C0\uC778 17y (500ml)",
  "\uBC1C\uB80C\uD0C0\uC77821y": "\uBC1C\uB80C\uD0C0\uC778 21y (500ml)",
  "\uBC1C\uB80C\uD0C0\uC778\uB9C8\uC2A4\uD130\uC988500ml": "\uBC1C\uB80C\uD0C0\uC778 \uB9C8\uC2A4\uD130\uC988",
  "\uBC1C\uBCA0\uB2C812y": "\uBC1C\uBCA0\uB2C8 12y (700ml)",
  "\uBC1C\uBCA0\uB2C814y": "\uBC1C\uBCA0\uB2C8 14y (700ml)",
  "\uC870\uB2C8\uC6CC\uCEE4\uBE14\uB799": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB799 (500ml)",
  "\uC870\uB2C8\uBE14\uB8E8500ml": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (500ml)",
  "\uC870\uB2C8\uC6CC\uCEE4\uBE14\uB8E8500ml": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (500ml)",
  "\uC870\uB2C8\uBE14\uB8E8700ml": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (700ml)",
  "\uC870\uB2C8\uC6CC\uCEE4\uBE14\uB8E8700ml": "\uC870\uB2C8\uC6CC\uCEE4 \uBE14\uB8E8 (700ml)",
  "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134": "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134 \uBC84\uBC88 1L",
  "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134\uBC84\uBC88": "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134 \uBC84\uBC88 1L",
  "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134\uBC84\uBC881l": "\uBBF8\uC2A4\uD130\uBCF4\uC2A4\uD134 \uBC84\uBC88 1L",
  "\uC2A4\uD2F8\uBE0C\uB8E9": "\uC2A4\uD2F8\uBE0C\uB8E9 \uB514\uB7ED\uC2A4",
  "\uC2A4\uD2F8\uBE0C\uB8E9\uB514\uB7ED\uC2A4": "\uC2A4\uD2F8\uBE0C\uB8E9 \uB514\uB7ED\uC2A4",
  "\uC2DC\uBC14\uC2A4\uB9AC\uAC0812y700ml": "\uC2DC\uBC14\uC2A4\uB9AC\uAC08 12y",
  "\uC544\uB4DC\uBC31": "\uC544\uB4DC\uBC31 10y",
  "\uC544\uB4DC\uBC3110\uB144": "\uC544\uB4DC\uBC31 10y",
  "\uD0C8\uB9AC\uC2A4\uCEE4": "\uD0C8\uB9AC\uC2A4\uCEE4 10y",
  "\uD0C8\uB9AC\uC2A4\uCEE410\uB144": "\uD0C8\uB9AC\uC2A4\uCEE4 10y",
  "\uD788\uBE44\uD0A4": "\uD788\uBE44\uD0A4 \uD558\uBAA8\uB2C8",
  "\uCF54\uCFE4": "\uCF54\uCFE4\uC704\uC2A4\uD0A4 (2.7L)",
  "\uCF54\uCFE4\uC704\uC2A4\uD0A4": "\uCF54\uCFE4\uC704\uC2A4\uD0A4 (2.7L)",
  "\uCF54\uCFE4\uBB34\uC81C\uD55C": "\uCF54\uCFE4\uC704\uC2A4\uD0A4 (2.7L)",
  "\uD0C8\uB9AC\uC2A4\uB9CC\uBB34\uC81C\uD55C": "\uD0C8\uB9AC\uC2A4\uB9CC",
  "\uBCA8\uC988\uBB34\uC81C\uD55C": "\uBCA8\uC988",
  "\uADF8\uB808\uB098\uB518\uC2DC\uB7FD": "\uADF8\uB808\uB098\uB518",
  "\uBA54\uB860": "\uBA54\uB860 \uB9AC\uD050\uB974",
  "\uB4DC\uB77C\uC774\uB9C8\uD2F0\uB2C8": "\uB9C8\uD2F0\uB2C8 \uB4DC\uB77C\uC774",
  "\uBC14\uB2D0\uB77C": "\uBC14\uB2D0\uB77C \uC2DC\uB7FD",
  "\uBCF4\uB4DC\uCE74": "\uBC14\uD1A4 \uBCF4\uB4DC\uCE74",
  "\uC9C4": "\uBC14\uD1A4 \uC9C4",
  "\uBE14\uB8E8\uD050\uB77C\uC18C": "\uBE14\uB8E8\uD050\uB77C\uC18C",
  "\uC559\uACE0\uC2A4\uD22C\uB77C\uBE44\uD130\uC2A4": "\uC559\uACE0\uC2A4\uD22C\uB77C",
  "\uC544\uB9C8\uB808\uD1A0\uC2DC\uB7FD": "\uC544\uB9C8\uB808\uD1A0",
  "\uC5BC\uADF8\uB808\uC774": "\uC5BC\uADF8\uB808\uC774 \uC2DC\uB7FD",
  "\uC790\uBABD": "\uC790\uBABD \uC2DC\uB7FD",
  "\uCCAD\uD3EC\uB3C4": "\uCCAD\uD3EC\uB3C4 \uC2DC\uB7FD",
  "\uD53C\uCE58": "\uD53C\uCE58 \uB9AC\uD050\uB974",
  "\uCE7C\uB8E8\uC544": "\uAE54\uB8E8\uC544",
  "\uD558\uC774\uB124\uCE94": "\uD558\uC774\uB124\uCF04",
  "\uBC84\uB4DC\uC640\uC774\uC800\uC0DD": "\uBC84\uB4DC\uC640\uC774\uC800 \uC0DD\uB9E5\uC8FC",
  "\uBC84\uB4DC\uC640\uC774\uC800\uC0DD\uB9E5": "\uBC84\uB4DC\uC640\uC774\uC800 \uC0DD\uB9E5\uC8FC",
  "\uBC84\uB4DC\uC640\uC774\uC800\uC0DD\uB9E5\uC8FC": "\uBC84\uB4DC\uC640\uC774\uC800 \uC0DD\uB9E5\uC8FC",
  "\uD55C\uB9E5\uC0DD\uB9E5": "\uD55C\uB9E5 \uC0DD\uB9E5\uC8FC"
};
async function requireStoreAccount(ctx) {
  const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
  if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
  await ensureCanonicalStoreAccounts();
  const account = await getStoreAccountById(payload.accountId);
  if (!account) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
  return account;
}
async function ensureLiquorTables(db) {
  if (!db) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorItems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT '기타',
    unitCost DECIMAL(15,0) NOT NULL DEFAULT 0,
    isActive INT NOT NULL DEFAULT 1,
    sortOrder INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorInventories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branchId INT NOT NULL,
    liquorItemId INT NOT NULL,
    currentStock DECIMAL(12,2) NOT NULL DEFAULT 0,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_liquor_inventory_branch_item (branchId, liquorItemId)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorStockMovements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branchId INT NOT NULL,
    liquorItemId INT NOT NULL,
    date VARCHAR(10) NOT NULL,
    type ENUM('IN','OUT','ADJUST') NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    unitCost DECIMAL(15,0) NOT NULL DEFAULT 0,
    totalCost DECIMAL(15,0) NOT NULL DEFAULT 0,
    memo TEXT NULL,
    createdBy INT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_liquor_movement_branch_date (branchId, date),
    INDEX idx_liquor_movement_item (liquorItemId)
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorSeedMeta (
    seedKey VARCHAR(120) PRIMARY KEY,
    appliedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS liquorHiddenItems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branchId INT NOT NULL,
    liquorItemId INT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_liquor_hidden_branch_item (branchId, liquorItemId)
  )`);
}
function normalizeLiquorSeedKey(value) {
  return String(value || "").toLowerCase().replace(/[\s()\[\]{}._\-\/\\]/g, "").replace(/년/g, "y").replace(/㎖|ml/gi, "ml").replace(/리큐르시럽/g, "\uB9AC\uD050\uB974").trim();
}
function normalizeBranchSeedKey(value) {
  return String(value || "").replace(/\s/g, "").trim();
}
function getCanonicalLiquorName(rawName) {
  const clean = String(rawName || "").replace(/\s+/g, " ").trim();
  const key = normalizeLiquorSeedKey(clean);
  return BOXHERO_ITEM_ALIASES[key] || clean;
}
function getSeedCategory(rawCategory) {
  const mapped = BOXHERO_CATEGORY_FALLBACK[rawCategory] || rawCategory || "\uC704\uC2A4\uD0A4";
  if (mapped === "\uB9E5\uC8FC") return "\uB9E5\uC8FC";
  if (mapped.includes("\uB9AC\uD050\uB974") || mapped.includes("\uC2DC\uB7FD")) return "\uB9AC\uD050\uB974/\uC2DC\uB7FD";
  return "\uC704\uC2A4\uD0A4";
}
async function ensureBoxHeroBranchStockSeeded(db) {
  if (!db) return;
  await ensureLiquorTables(db);
  const existingSeed = await db.execute(sql`SELECT seedKey FROM liquorSeedMeta WHERE seedKey = ${BOXHERO_STOCK_SEED_VERSION} LIMIT 1`);
  const seedRows = Array.isArray(existingSeed) ? existingSeed[0] : [];
  if (Array.isArray(seedRows) && seedRows.length > 0) return;
  const allBranches = await db.select().from(branches);
  const branchByKey = new Map(allBranches.map((branch) => [normalizeBranchSeedKey(branch.name), branch]));
  const currentItems = await db.select().from(liquorItems).orderBy(liquorItems.sortOrder, liquorItems.name);
  const itemByKey = /* @__PURE__ */ new Map();
  for (const item of currentItems) {
    itemByKey.set(normalizeLiquorSeedKey(item.name), item);
  }
  const defaultCostByKey = new Map(DEFAULT_LIQUOR_ITEMS.map((item) => [normalizeLiquorSeedKey(item.name), item.unitCost]));
  let nextSortOrder = currentItems.length + 1;
  const getOrCreateItem = async (rawName, rawCategory) => {
    const canonicalName = getCanonicalLiquorName(rawName);
    const canonicalKey = normalizeLiquorSeedKey(canonicalName);
    const rawKey = normalizeLiquorSeedKey(rawName);
    let item = itemByKey.get(canonicalKey) || itemByKey.get(rawKey);
    if (item) return item;
    const unitCost = defaultCostByKey.get(canonicalKey) || defaultCostByKey.get(rawKey) || 0;
    const category = getSeedCategory(rawCategory);
    const result = await db.insert(liquorItems).values({
      name: canonicalName,
      category,
      unitCost: String(unitCost),
      isActive: 1,
      sortOrder: nextSortOrder++
    });
    const insertId = Number(result.insertId || 0);
    if (insertId) {
      const [created] = await db.select().from(liquorItems).where(eq6(liquorItems.id, insertId)).limit(1);
      if (created) {
        itemByKey.set(canonicalKey, created);
        itemByKey.set(rawKey, created);
        return created;
      }
    }
    const [fallback] = await db.select().from(liquorItems).where(eq6(liquorItems.name, canonicalName)).limit(1);
    if (!fallback) throw new Error(`\uC8FC\uB958 \uD488\uBAA9 \uC0DD\uC131 \uC2E4\uD328: ${canonicalName}`);
    itemByKey.set(canonicalKey, fallback);
    itemByKey.set(rawKey, fallback);
    return fallback;
  };
  for (const [branchName, rows] of Object.entries(BOXHERO_BRANCH_STOCKS)) {
    const branch = branchByKey.get(normalizeBranchSeedKey(branchName));
    if (!branch) {
      console.warn(`[liquor-seed] \uC9C0\uC810 \uB9E4\uCE6D \uC2E4\uD328: ${branchName}`);
      continue;
    }
    for (const row of rows) {
      const item = await getOrCreateItem(row.name, row.category);
      const qty = Number(row.quantity || 0);
      const [existingInventory] = await db.select().from(liquorInventories).where(and5(eq6(liquorInventories.branchId, branch.id), eq6(liquorInventories.liquorItemId, item.id))).limit(1);
      if (!existingInventory) {
        await db.insert(liquorInventories).values({ branchId: branch.id, liquorItemId: item.id, currentStock: String(qty) });
      }
    }
  }
  await db.execute(sql`INSERT INTO liquorSeedMeta (seedKey) VALUES (${BOXHERO_STOCK_SEED_VERSION})`);
  console.log(`[liquor-seed] BoxHero \uC9C0\uC810\uBCC4 \uC7AC\uACE0 \uBC18\uC601 \uC644\uB8CC: ${BOXHERO_STOCK_SEED_VERSION}`);
}
async function ensureLiquorSeeded(db) {
  if (!db) return;
  await ensureLiquorTables(db);
  const existing = await db.select({ id: liquorItems.id }).from(liquorItems).limit(1);
  if (existing.length === 0) {
    await db.insert(liquorItems).values(DEFAULT_LIQUOR_ITEMS.map((item, idx) => ({
      name: item.name,
      category: getSeedCategory(item.category),
      unitCost: String(item.unitCost),
      isActive: 1,
      sortOrder: idx
    })));
  }
  await ensureBoxHeroBranchStockSeeded(db);
}
async function parseStoreCookie3(cookieHeader, authHeader) {
  let token;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  }
  if (!token && cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [k, ...v] = c.trim().split("=");
        return [k.trim(), v.join("=")];
      })
    );
    token = cookies[COOKIE_NAME];
  }
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify4(token, secret, { algorithms: ["HS256"] });
    if (payload.type !== "store") return null;
    return payload;
  } catch {
    return null;
  }
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    // 자체 아이디/비밀번호 로그인
    loginWithPassword: publicProcedure.input(z4.object({
      loginId: z4.string().min(1),
      password: z4.string().min(1)
    })).mutation(async ({ ctx, input }) => {
      process.stdout.write("BATCHSAVE_V20260603\n");
      await ensureCanonicalStoreAccounts();
      const account = await getStoreAccountByLoginId(input.loginId);
      if (!account) {
        throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4" });
      }
      const isValid = await bcrypt.compare(input.password, account.passwordHash);
      if (!isValid) {
        throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4" });
      }
      const token = await createStoreSessionToken(account.id, account.loginId, account.role);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      let branch = null;
      if (account.branchId) {
        branch = await getBranchById(account.branchId);
      }
      return {
        success: true,
        token,
        // localStorage에 저장하여 Authorization 헤더로 전달
        account: {
          id: account.id,
          loginId: account.loginId,
          displayName: account.displayName,
          role: account.role,
          branchId: account.branchId,
          branch
        }
      };
    }),
    // 자체 계정 현재 사용자 조회
    storeMe: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) return null;
      await ensureCanonicalStoreAccounts();
      const account = await getStoreAccountById(payload.accountId);
      if (!account) return null;
      let branch = null;
      if (account.branchId) {
        branch = await getBranchById(account.branchId);
      }
      let allBranches = null;
      if (account.role === "admin") {
        const db = await getDb();
        if (db) {
          allBranches = await db.select().from(branches).orderBy(branches.name);
        }
      }
      return {
        id: account.id,
        loginId: account.loginId,
        displayName: account.displayName,
        role: account.role,
        branchId: account.branchId,
        branch,
        allBranches
      };
    })
  }),
  push: router({
    subscribe: protectedProcedure.input(z4.object({ endpoint: z4.string(), p256dh: z4.string(), auth: z4.string() })).mutation(async ({ ctx, input }) => {
      await savePushSubscription({ userId: ctx.user.id, endpoint: input.endpoint, p256dh: input.p256dh, auth: input.auth });
      return { success: true };
    }),
    unsubscribe: protectedProcedure.input(z4.object({ endpoint: z4.string() })).mutation(async ({ input }) => {
      await deletePushSubscription(input.endpoint);
      return { success: true };
    }),
    test: protectedProcedure.mutation(async ({ ctx }) => {
      const subs = await getPushSubscriptionsByOpenId(ctx.user.openId);
      if (subs.length === 0) return { success: false, message: "\uAD6C\uB3C5 \uC5C6\uC74C" };
      const payload = JSON.stringify({ title: "\uB9E4\uCD9C \uBCF4\uACE0 \uC54C\uB9BC \uD14C\uC2A4\uD2B8", body: "\uD478\uC2DC \uC54C\uB9BC\uC774 \uC815\uC0C1\uC801\uC73C\uB85C \uC791\uB3D9\uD569\uB2C8\uB2E4! \u2705" });
      for (const sub of subs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        } catch (err) {
          if (err.statusCode === 410) await deletePushSubscription(sub.endpoint);
        }
      }
      return { success: true };
    })
  }),
  branch: router({
    myBranches: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      if (ctx.user.role === "admin") return db.select().from(branches).orderBy(branches.name);
      const managed = await db.select({ branch: branches }).from(branchManagers).innerJoin(branches, eq6(branchManagers.branchId, branches.id)).where(eq6(branchManagers.userId, ctx.user.id));
      return managed.map((r) => r.branch);
    }),
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) {
        console.log("[branch.list] NO DATABASE");
        return [];
      }
      try {
        const result = await db.select().from(branches).orderBy(branches.name);
        console.log("[branch.list] SUCCESS", { count: result.length });
        return result;
      } catch (error) {
        console.error("[branch.list] ERROR:", error);
        return [];
      }
    }),
    create: adminProcedure.input(z4.object({ name: z4.string().min(1), code: z4.string().min(1) })).mutation(async ({ ctx, input }) => {
      const branch = await createBranch({ name: input.name, code: input.code, ownerId: ctx.user.id });
      return { success: true, branch };
    }),
    update: adminProcedure.input(z4.object({ id: z4.number(), name: z4.string().min(1), code: z4.string().min(1) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(branches).set({ name: input.name, code: input.code }).where(eq6(branches.id, input.id));
      return { success: true };
    }),
    delete: adminProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(branches).where(eq6(branches.id, input.id));
      return { success: true };
    })
  }),
  user: router({
    list: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const allUsers = await db.select().from(users).orderBy(users.name);
      return Promise.all(allUsers.map(async (u) => {
        const managed = await db.select({ branch: branches }).from(branchManagers).innerJoin(branches, eq6(branchManagers.branchId, branches.id)).where(eq6(branchManagers.userId, u.id));
        return { ...u, assignedBranches: managed.map((r) => r.branch) };
      }));
    }),
    updateRole: adminProcedure.input(z4.object({ userId: z4.number(), role: z4.enum(["user", "admin"]) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(users).set({ role: input.role }).where(eq6(users.id, input.userId));
      return { success: true };
    }),
    assignBranch: adminProcedure.input(z4.object({ userId: z4.number(), branchId: z4.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const existing = await db.select().from(branchManagers).where(and5(eq6(branchManagers.userId, input.userId), eq6(branchManagers.branchId, input.branchId))).limit(1);
      if (existing.length === 0) {
        await db.insert(branchManagers).values({ userId: input.userId, branchId: input.branchId, role: "manager" });
      }
      return { success: true };
    }),
    unassignBranch: adminProcedure.input(z4.object({ userId: z4.number(), branchId: z4.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(branchManagers).where(and5(eq6(branchManagers.userId, input.userId), eq6(branchManagers.branchId, input.branchId)));
      return { success: true };
    })
  }),
  // storeAccount 관리 API
  storeAccount: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload || payload.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4" });
      const accounts = await getAllStoreAccounts();
      const db = await getDb();
      const allBranches = db ? await db.select().from(branches) : [];
      return accounts.map((acc) => ({
        id: acc.id,
        loginId: acc.loginId,
        displayName: acc.displayName,
        role: acc.role,
        branchId: acc.branchId,
        createdAt: acc.createdAt,
        branch: allBranches.find((b) => b.id === acc.branchId) || null
      }));
    }),
    create: publicProcedure.input(z4.object({
      loginId: z4.string().min(1).max(50),
      password: z4.string().min(1),
      displayName: z4.string().optional(),
      role: z4.enum(["user", "admin"]).default("user"),
      branchId: z4.number().optional()
    })).mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload || payload.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4" });
      const existing = await getStoreAccountByLoginId(input.loginId);
      if (existing) throw new TRPCError5({ code: "CONFLICT", message: "\uC774\uBBF8 \uC0AC\uC6A9 \uC911\uC778 \uC544\uC774\uB514\uC785\uB2C8\uB2E4" });
      const passwordHash = await bcrypt.hash(input.password, 10);
      const account = await createStoreAccount({
        loginId: input.loginId,
        passwordHash,
        displayName: input.displayName || input.loginId,
        role: input.role,
        branchId: input.branchId || null
      });
      return { success: true, account };
    }),
    changePassword: publicProcedure.input(z4.object({ accountId: z4.number(), newPassword: z4.string().min(1) })).mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload || payload.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4" });
      const passwordHash = await bcrypt.hash(input.newPassword, 10);
      await updateStoreAccount(input.accountId, { passwordHash });
      return { success: true };
    }),
    delete: publicProcedure.input(z4.object({ accountId: z4.number() })).mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload || payload.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4" });
      await deleteStoreAccount(input.accountId);
      return { success: true };
    }),
    assignBranch: publicProcedure.input(z4.object({ accountId: z4.number(), branchId: z4.number().nullable() })).mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload || payload.role !== "admin") throw new TRPCError5({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4" });
      await updateStoreAccount(input.accountId, { branchId: input.branchId });
      return { success: true };
    }),
    branchList: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(branches).orderBy(branches.name);
    })
  }),
  // 매출 기록 API (storeAccount 기반)
  storeSales: router({
    getBranches: publicProcedure.query(async ({ ctx }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError5({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      if (account.role === "admin") {
        return await db.select().from(branches).orderBy(branches.name);
      }
      if (account.branchId) {
        return await db.select().from(branches).where(eq6(branches.id, account.branchId));
      }
      return [];
    }),
    getRecord: publicProcedure.input(z4.object({ branchId: z4.number(), date: z4.string() })).query(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      if (account.role !== "admin" && account.branchId !== input.branchId) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      let record = await getDailySalesRecord(input.branchId, input.date);
      if (!record) return null;
      record = await normalizeMonthlyCumulativeRecord(record);
      if (!record) return null;
      const posStart = parseInt(record.posStartAmount || "0") || 0;
      const posEnd = parseInt(record.posEndAmount || "0") || 0;
      if (posStart <= 0 && posEnd <= 0) {
        const prevPosRecord = await getPrevDailySalesRecordWithPosEnd(input.branchId, input.date);
        const fallbackStart = parseInt(prevPosRecord?.posEndAmount || "0") || 0;
        if (fallbackStart > 0 && record) {
          const expenses = Array.isArray(record.expenses) ? record.expenses : [];
          const expenseTotal = expenses.reduce((s, e) => s + (parseInt(e.amount || "0") || 0), 0);
          const cashDepositVal = parseInt(record.cashDeposit || "0") || 0;
          const dateObj = /* @__PURE__ */ new Date(input.date + "T12:00:00");
          const isSunday = dateObj.getDay() === 0;
          return {
            ...record,
            posStartAmount: String(fallbackStart),
            posEndAmount: String(isSunday ? fallbackStart : fallbackStart - expenseTotal + cashDepositVal)
          };
        }
      }
      return record;
    }),
    getPrevRecord: publicProcedure.input(z4.object({ branchId: z4.number(), date: z4.string() })).query(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      if (account.role !== "admin" && account.branchId !== input.branchId) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const prev = await getPrevDailySalesRecordWithPosEnd(input.branchId, input.date);
      return normalizeMonthlyCumulativeRecord(prev);
    }),
    getRecords: publicProcedure.input(z4.object({ branchId: z4.number(), startDate: z4.string(), endDate: z4.string() })).query(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      if (account.role !== "admin" && account.branchId !== input.branchId) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const records = await getDailySalesRecordsByDateRange(input.branchId, input.startDate, input.endDate);
      return Promise.all(records.map((record) => normalizeMonthlyCumulativeRecord(record)));
    }),
    save: publicProcedure.input(z4.object({
      branchId: z4.number(),
      date: z4.string(),
      posStartAmount: z4.string().default("0"),
      cash: z4.string().default("0"),
      card: z4.string().default("0"),
      cashTotal: z4.string().default("0"),
      cardTotal: z4.string().default("0"),
      posEndAmount: z4.string().default("0"),
      cashDeposit: z4.string().optional(),
      expenses: z4.array(z4.object({ id: z4.string(), description: z4.string(), amount: z4.string() })).default([])
    })).mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      if (account.role !== "admin" && account.branchId !== input.branchId) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      }
      const prevRec = await getPrevDailySalesRecord(input.branchId, input.date);
      const dateObj = /* @__PURE__ */ new Date(input.date + "T12:00:00");
      const isSunday = dateObj.getDay() === 0;
      const todayCash = parseInt(input.cash || "0") || 0;
      const todayCard = parseInt(input.card || "0") || 0;
      const { cashTotal: computedCashTotal, cardTotal: computedCardTotal } = await computeCumulativesForDate(
        input.branchId,
        input.date,
        prevRec ?? null,
        todayCash,
        todayCard
      );
      const prevPosRecord = await getPrevDailySalesRecordWithPosEnd(input.branchId, input.date);
      const fallbackPosStart = parseInt(prevPosRecord?.posEndAmount || "0") || 0;
      const inputPosStart = parseInt(input.posStartAmount || "0") || 0;
      const posStartVal = inputPosStart > 0 ? inputPosStart : fallbackPosStart;
      const expenseTotal = (input.expenses || []).reduce((s, e) => s + (parseInt(e.amount || "0") || 0), 0);
      const cashDepositVal = parseInt(input.cashDeposit || "0") || 0;
      const computedPosEnd = isSunday ? posStartVal : posStartVal - expenseTotal + cashDepositVal;
      const record = await upsertDailySalesRecord({
        branchId: input.branchId,
        date: input.date,
        posStartAmount: String(posStartVal),
        cash: input.cash,
        card: input.card,
        cashTotal: String(computedCashTotal),
        cardTotal: String(computedCardTotal),
        posEndAmount: String(computedPosEnd),
        cashDeposit: input.cashDeposit ?? "0",
        expenses: input.expenses,
        submittedAt: /* @__PURE__ */ new Date()
      });
      try {
        await cascadeUpdatePosAmounts(input.branchId, input.date);
      } catch (e) {
        console.error("[cascadeUpdatePosAmounts \uC624\uB958]", e);
      }
      try {
        await cascadeUpdateCumulativeAmounts(input.branchId, input.date);
      } catch (e) {
        console.error("[cascadeUpdateCumulativeAmounts \uC624\uB958]", e);
      }
      const branch = await getBranchById(input.branchId);
      const branchName = branch?.name ?? "\uC54C \uC218 \uC5C6\uB294 \uC9C0\uC810";
      const fmt = (v) => {
        const n = Number((v || "").replace(/,/g, ""));
        return isNaN(n) || n === 0 ? "\u2014" : `\u20A9${n.toLocaleString("ko-KR")}`;
      };
      const dailyTotal = Number(input.cash || 0) + Number(input.card || 0);
      const title = `[${branchName}] ${input.date} \uB9E4\uCD9C \uBCF4\uACE0`;
      const body = `\u{1F4B0} \uD604\uAE08: ${fmt(input.cash)} / \uCE74\uB4DC: ${fmt(input.card)} | \uD569\uACC4: \u20A9${dailyTotal.toLocaleString("ko-KR")}`;
      const expenseLines = input.expenses.filter((e) => e.description && e.amount).map((e) => `\u2022 ${e.description}: ${fmt(e.amount)}`).join("\n");
      const content = [`\u{1F4CD} \uC9C0\uC810: ${branchName}`, `\u{1F4C5} \uB0A0\uC9DC: ${input.date}`, "", "\u{1F4B0} \uC624\uB298 \uB9E4\uCD9C", `  \uD604\uAE08: ${fmt(input.cash)}`, `  \uCE74\uB4DC: ${fmt(input.card)}`, `  \uD569\uACC4: \u20A9${dailyTotal.toLocaleString("ko-KR")}`, ...expenseLines ? ["", "\u{1F9FE} \uC9C0\uCD9C \uB0B4\uC5ED", expenseLines] : []].join("\n");
      try {
        await notifyOwner({ title, content });
      } catch {
      }
      let pushSent = false;
      if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
        try {
          const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
          for (const sub of subs) {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body }));
              pushSent = true;
            } catch (err) {
              if (err.statusCode === 410) await deletePushSubscription(sub.endpoint);
            }
          }
        } catch {
        }
      }
      try {
        const db = await getDb();
        if (db) {
          const tableReport = await db.select().from(tableReports).where(and5(eq6(tableReports.branchId, input.branchId), eq6(tableReports.date, input.date))).limit(1);
          const tableReportId = tableReport?.[0]?.id ?? null;
          const staffRows = tableReportId ? await db.select().from(staffIncentives).where(eq6(staffIncentives.tableReportId, tableReportId)) : [];
          const staffCount = (staffRows ?? []).filter((i) => i.staffType === "staff").length;
          const partTimeCount = (staffRows ?? []).filter((i) => i.staffType === "parttime").length;
          const managerCount2 = (staffRows ?? []).filter((i) => i.staffType === "manager").length;
          const partTimeTotalHours = (staffRows ?? []).reduce((sum, i) => sum + (i.staffType === "parttime" ? Number(i.workHours || 0) : 0), 0);
          const cash = parseInt(input.cash || "0") || 0;
          const card = parseInt(input.card || "0") || 0;
          const settlement = await calculateDailySettlement(
            input.branchId,
            input.date,
            cash,
            card,
            staffCount,
            partTimeCount,
            input.expenses,
            tableReportId,
            managerCount2,
            partTimeTotalHours
          );
          await saveDailySettlementRecord(input.branchId, input.date, settlement);
        }
      } catch (e) {
        console.error("[\uC815\uC0B0 \uC790\uB3D9 \uACC4\uC0B0 \uC624\uB958]", e);
      }
      try {
        const branchInfo = await getBranchById(input.branchId);
        const webhookPayload = {
          date: input.date,
          branchId: input.branchId,
          branchName: branchInfo?.name ?? "",
          cash: input.cash,
          card: input.card,
          totalRevenue: Number(input.cash || 0) + Number(input.card || 0)
        };
        await fetch("https://hook.eu1.make.com/3n5i5frjiogmona7xq8sew2fweykqy7y", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload)
        });
      } catch (e) {
        console.error("[Make \uC6F9\uD6C5 \uC624\uB958]", e);
      }
      return { success: true, record, pushSent };
    }),
    adminDailyDetail: publicProcedure.input(z4.object({ date: z4.string() })).query(async ({ ctx, input }) => {
      const storePayload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      const isStoreAdmin = storePayload?.role === "admin";
      const isOAuthAdmin = ctx.user?.role === "admin";
      if (!isStoreAdmin && !isOAuthAdmin) throw new TRPCError5({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4" });
      const db = await getDb();
      if (!db) return [];
      const allBranches = await db.select().from(branches).orderBy(branches.name);
      const records = await db.select().from(dailySalesRecords).where(eq6(dailySalesRecords.date, input.date));
      const tableReportRows = await db.select().from(tableReports).where(eq6(tableReports.date, input.date));
      const reportIds = tableReportRows.map((r) => r.id);
      const tableItemRows = reportIds.length > 0 ? await db.select().from(tableItems).where(inArray(tableItems.tableReportId, reportIds)).orderBy(asc(tableItems.sortOrder), asc(tableItems.createdAt)) : [];
      const incentiveRows = reportIds.length > 0 ? await db.select().from(staffIncentives).where(inArray(staffIncentives.tableReportId, reportIds)).orderBy(staffIncentives.sortOrder, staffIncentives.createdAt) : [];
      return allBranches.map((branch) => ({
        branch,
        record: records.find((r) => r.branchId === branch.id) || null,
        tableReport: (() => {
          const tr = tableReportRows.find((r) => r.branchId === branch.id);
          if (!tr) return null;
          return {
            ...tr,
            items: tableItemRows.filter((i) => i.tableReportId === tr.id),
            incentives: incentiveRows.filter((i) => i.tableReportId === tr.id)
          };
        })()
      }));
    }),
    adminSummary: publicProcedure.input(z4.object({ startDate: z4.string(), endDate: z4.string() })).query(async ({ ctx, input }) => {
      const storePayload2 = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      const isStoreAdmin2 = storePayload2?.role === "admin";
      const isOAuthAdmin2 = ctx.user?.role === "admin";
      if (!isStoreAdmin2 && !isOAuthAdmin2) throw new TRPCError5({ code: "FORBIDDEN", message: "\uAD00\uB9AC\uC790\uB9CC \uC811\uADFC \uAC00\uB2A5\uD569\uB2C8\uB2E4" });
      const db = await getDb();
      if (!db) return { byBranch: [], byDate: [] };
      const allBranches = await db.select().from(branches).orderBy(branches.name);
      const records = await db.select().from(dailySalesRecords).orderBy(desc3(dailySalesRecords.date));
      const filtered = records.filter((r) => r.date >= input.startDate && r.date <= input.endDate);
      const byBranch = allBranches.map((branch) => {
        const br = filtered.filter((r) => r.branchId === branch.id);
        const totalCash = br.reduce((s, r) => s + Number(r.cash || 0), 0);
        const totalCard = br.reduce((s, r) => s + Number(r.card || 0), 0);
        const totalExpense = br.reduce((s, r) => s + r.expenses.reduce((ss, e) => ss + Number(e.amount || 0), 0), 0);
        return { branch, totalCash, totalCard, total: totalCash + totalCard, totalExpense, recordCount: br.length };
      });
      const dateMap = {};
      filtered.forEach((r) => {
        if (!dateMap[r.date]) dateMap[r.date] = { totalCash: 0, totalCard: 0, total: 0 };
        dateMap[r.date].totalCash += Number(r.cash || 0);
        dateMap[r.date].totalCard += Number(r.card || 0);
        dateMap[r.date].total += Number(r.cash || 0) + Number(r.card || 0);
      });
      const byDate = Object.entries(dateMap).map(([date, data]) => ({ date, ...data })).sort((a, b) => b.date.localeCompare(a.date));
      return { byBranch, byDate };
    }),
    analyzeImage: publicProcedure.input(z4.object({
      imageBase64: z4.string(),
      mimeType: z4.string().default("image/jpeg")
    })).mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const imageDataUrl = input.imageBase64.startsWith("data:") ? input.imageBase64 : `data:${input.mimeType};base64,${input.imageBase64}`;
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "\uB2F9\uC2E0\uC740 \uD55C\uAD6D \uCE74\uD398/\uC74C\uC2DD\uC810 \uD3EC\uC2A4\uAE30 \uC8FC\uBB38\uB0B4\uC5ED \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD558\uB294 \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4. \uC774\uBBF8\uC9C0\uC5D0\uC11C \uD604\uAE08 \uB9E4\uCD9C, \uCE74\uB4DC \uB9E4\uCD9C, \uC9C0\uCD9C \uD56D\uBAA9\uC744 \uCD94\uCD9C\uD569\uB2C8\uB2E4."
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageDataUrl, detail: "high" }
              },
              {
                type: "text",
                text: `\uC774 \uD3EC\uC2A4\uAE30 \uC8FC\uBB38\uB0B4\uC5ED \uC774\uBBF8\uC9C0\uC5D0\uC11C \uB2E4\uC74C \uC815\uBCF4\uB97C \uCD94\uCD9C\uD574\uC8FC\uC138\uC694:
1. \uD604\uAE08 \uB9E4\uCD9C \uD569\uACC4 (cash): \uD604\uAE08\uC73C\uB85C \uACB0\uC81C\uB41C \uCD1D \uAE08\uC561
2. \uCE74\uB4DC \uB9E4\uCD9C \uD569\uACC4 (card): \uCE74\uB4DC/\uC2E0\uC6A9\uCE74\uB4DC/\uCCB4\uD06C\uCE74\uB4DC\uB85C \uACB0\uC81C\uB41C \uCD1D \uAE08\uC561
3. \uC9C0\uCD9C \uD56D\uBAA9 (expenses): \uC9C0\uCD9C/\uBE44\uC6A9 \uD56D\uBAA9\uC774 \uC788\uB2E4\uBA74 \uAC01 \uD56D\uBAA9\uC758 \uC774\uB984\uACFC \uAE08\uC561

\uC22B\uC790\uB294 \uC6D0\uD654 \uAE30\uC900 \uC815\uC218\uB85C\uB9CC \uBC18\uD658\uD558\uC138\uC694 (\uC27C\uD45C, \uC6D0 \uAE30\uD638 \uC5C6\uC774). \uD574\uB2F9 \uD56D\uBAA9\uC774 \uC5C6\uAC70\uB098 \uD655\uC778 \uBD88\uAC00\uD558\uBA74 0\uC73C\uB85C \uBC18\uD658\uD558\uC138\uC694.`
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "pos_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                cash: { type: "integer", description: "\uD604\uAE08 \uB9E4\uCD9C \uD569\uACC4 (\uC6D0)" },
                card: { type: "integer", description: "\uCE74\uB4DC \uB9E4\uCD9C \uD569\uACC4 (\uC6D0)" },
                expenses: {
                  type: "array",
                  description: "\uC9C0\uCD9C \uD56D\uBAA9 \uBAA9\uB85D",
                  items: {
                    type: "object",
                    properties: {
                      description: { type: "string", description: "\uC9C0\uCD9C \uD56D\uBAA9\uBA85" },
                      amount: { type: "integer", description: "\uC9C0\uCD9C \uAE08\uC561 (\uC6D0)" }
                    },
                    required: ["description", "amount"],
                    additionalProperties: false
                  }
                },
                confidence: { type: "string", description: "\uBD84\uC11D \uC2E0\uB8B0\uB3C4: high/medium/low" },
                note: { type: "string", description: "\uBD84\uC11D \uC2DC \uCC38\uACE0\uC0AC\uD56D\uC774\uB098 \uBD88\uD655\uC2E4\uD55C \uBD80\uBD84" }
              },
              required: ["cash", "card", "expenses", "confidence", "note"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices?.[0]?.message?.content;
      if (!rawContent) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "AI \uBD84\uC11D \uACB0\uACFC\uB97C \uBC1B\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4" });
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const result = JSON.parse(content);
      return {
        cash: String(result.cash || 0),
        card: String(result.card || 0),
        expenses: (result.expenses || []).map((e, i) => ({
          id: `exp_ai_${Date.now()}_${i}`,
          description: e.description,
          amount: String(e.amount)
        })),
        confidence: result.confidence,
        note: result.note
      };
    })
  }),
  // 기존 Manus OAuth 기반 매출 API (하위 호환)
  sales: router({
    getRecord: protectedProcedure.input(z4.object({ branchId: z4.number(), date: z4.string() })).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        const db = await getDb();
        if (!db) return null;
        const managed = await db.select().from(branchManagers).where(and5(eq6(branchManagers.userId, ctx.user.id), eq6(branchManagers.branchId, input.branchId))).limit(1);
        if (managed.length === 0) throw new Error("\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4");
      }
      return getDailySalesRecord(input.branchId, input.date);
    }),
    getRecords: protectedProcedure.input(z4.object({ branchId: z4.number(), startDate: z4.string(), endDate: z4.string() })).query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        const db = await getDb();
        if (!db) return [];
        const managed = await db.select().from(branchManagers).where(and5(eq6(branchManagers.userId, ctx.user.id), eq6(branchManagers.branchId, input.branchId))).limit(1);
        if (managed.length === 0) throw new Error("\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4");
      }
      return getDailySalesRecordsByDateRange(input.branchId, input.startDate, input.endDate);
    }),
    save: protectedProcedure.input(z4.object({
      branchId: z4.number(),
      date: z4.string(),
      posStartAmount: z4.string().default("0"),
      cash: z4.string().default("0"),
      card: z4.string().default("0"),
      cashTotal: z4.string().default("0"),
      cardTotal: z4.string().default("0"),
      posEndAmount: z4.string().default("0"),
      cashDeposit: z4.string().optional(),
      expenses: z4.array(z4.object({ id: z4.string(), description: z4.string(), amount: z4.string() })).default([])
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        const db = await getDb();
        if (!db) return { success: false };
        const managed = await db.select().from(branchManagers).where(and5(eq6(branchManagers.userId, ctx.user.id), eq6(branchManagers.branchId, input.branchId))).limit(1);
        if (managed.length === 0) throw new Error("\uC811\uADFC \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4");
      }
      const prevRec2 = await getPrevDailySalesRecord(input.branchId, input.date);
      const dateObj2 = /* @__PURE__ */ new Date(input.date + "T12:00:00");
      const isSunday2 = dateObj2.getDay() === 0;
      const todayCash2 = parseInt(input.cash || "0") || 0;
      const todayCard2 = parseInt(input.card || "0") || 0;
      const { cashTotal: computedCashTotal2, cardTotal: computedCardTotal2 } = await computeCumulativesForDate(
        input.branchId,
        input.date,
        prevRec2 ?? null,
        todayCash2,
        todayCard2
      );
      const prevPosRecord2 = await getPrevDailySalesRecordWithPosEnd(input.branchId, input.date);
      const fallbackPosStart2 = parseInt(prevPosRecord2?.posEndAmount || "0") || 0;
      const inputPosStart2 = parseInt(input.posStartAmount || "0") || 0;
      const posStartVal2 = inputPosStart2 > 0 ? inputPosStart2 : fallbackPosStart2;
      const expenseTotal2 = (input.expenses || []).reduce((s, e) => s + (parseInt(e.amount || "0") || 0), 0);
      const cashDepositVal2 = parseInt(input.cashDeposit || "0") || 0;
      const computedPosEnd2 = isSunday2 ? posStartVal2 : posStartVal2 - expenseTotal2 + cashDepositVal2;
      const finalPosEnd2 = rec2 && parseInt(rec2.posEndAmount || "0") > 0 ? rec2.posEndAmount : String(computedPosEnd2);
      const record = await upsertDailySalesRecord({
        branchId: input.branchId,
        date: input.date,
        posStartAmount: String(posStartVal2),
        cash: input.cash,
        card: input.card,
        cashTotal: String(computedCashTotal2),
        cardTotal: String(computedCardTotal2),
        posEndAmount: finalPosEnd2,
        cashDeposit: input.cashDeposit ?? "0",
        expenses: input.expenses,
        submittedBy: ctx.user.id,
        submittedAt: /* @__PURE__ */ new Date()
      });
      try {
        await cascadeUpdatePosAmounts(input.branchId, input.date);
      } catch (e) {
        console.error("[cascadeUpdatePosAmounts \uC624\uB958]", e);
      }
      try {
        await cascadeUpdateCumulativeAmounts(input.branchId, input.date);
      } catch (e) {
        console.error("[cascadeUpdateCumulativeAmounts \uC624\uB958]", e);
      }
      const branch = await getBranchById(input.branchId);
      const branchName = branch?.name ?? "\uC54C \uC218 \uC5C6\uB294 \uC9C0\uC810";
      const fmt = (v) => {
        const n = Number((v || "").replace(/,/g, ""));
        return isNaN(n) || n === 0 ? "\u2014" : `\u20A9${n.toLocaleString("ko-KR")}`;
      };
      const dailyTotal = Number(input.cash || 0) + Number(input.card || 0);
      const title = `[${branchName}] ${input.date} \uB9E4\uCD9C \uBCF4\uACE0`;
      const body = `\u{1F4B0} \uD604\uAE08: ${fmt(input.cash)} / \uCE74\uB4DC: ${fmt(input.card)} | \uD569\uACC4: \u20A9${dailyTotal.toLocaleString("ko-KR")}`;
      try {
        await notifyOwner({ title, content: body });
      } catch {
      }
      let pushSent = false;
      if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
        try {
          const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
          for (const sub of subs) {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body }));
              pushSent = true;
            } catch (err) {
              if (err.statusCode === 410) await deletePushSubscription(sub.endpoint);
            }
          }
        } catch {
        }
      }
      return { success: true, record, pushSent };
    }),
    adminSummary: adminProcedure.input(z4.object({ startDate: z4.string(), endDate: z4.string() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { byBranch: [], byDate: [] };
      const allBranches = await db.select().from(branches).orderBy(branches.name);
      const records = await db.select().from(dailySalesRecords).orderBy(desc3(dailySalesRecords.date));
      const filtered = records.filter((r) => r.date >= input.startDate && r.date <= input.endDate);
      const byBranch = allBranches.map((branch) => {
        const br = filtered.filter((r) => r.branchId === branch.id);
        const totalCash = br.reduce((s, r) => s + Number(r.cash || 0), 0);
        const totalCard = br.reduce((s, r) => s + Number(r.card || 0), 0);
        const totalExpense = br.reduce((s, r) => s + r.expenses.reduce((ss, e) => ss + Number(e.amount || 0), 0), 0);
        return { branch, totalCash, totalCard, total: totalCash + totalCard, totalExpense, recordCount: br.length };
      });
      const dateMap = {};
      filtered.forEach((r) => {
        if (!dateMap[r.date]) dateMap[r.date] = { totalCash: 0, totalCard: 0, total: 0 };
        dateMap[r.date].totalCash += Number(r.cash || 0);
        dateMap[r.date].totalCard += Number(r.card || 0);
        dateMap[r.date].total += Number(r.cash || 0) + Number(r.card || 0);
      });
      const byDate = Object.entries(dateMap).map(([date, data]) => ({ date, ...data })).sort((a, b) => b.date.localeCompare(a.date));
      return { byBranch, byDate };
    }),
    adminDailyDetail: adminProcedure.input(z4.object({ date: z4.string() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const allBranches = await db.select().from(branches).orderBy(branches.name);
      const records = await db.select().from(dailySalesRecords).where(eq6(dailySalesRecords.date, input.date));
      const tableReportRows = await db.select().from(tableReports).where(eq6(tableReports.date, input.date));
      const reportIds = tableReportRows.map((r) => r.id);
      const tableItemRows = reportIds.length > 0 ? await db.select().from(tableItems).where(inArray(tableItems.tableReportId, reportIds)).orderBy(asc(tableItems.sortOrder), asc(tableItems.createdAt)) : [];
      const incentiveRows = reportIds.length > 0 ? await db.select().from(staffIncentives).where(inArray(staffIncentives.tableReportId, reportIds)).orderBy(staffIncentives.sortOrder, staffIncentives.createdAt) : [];
      return allBranches.map((branch) => ({
        branch,
        record: records.find((r) => r.branchId === branch.id) || null,
        tableReport: (() => {
          const tr = tableReportRows.find((r) => r.branchId === branch.id);
          if (!tr) return null;
          return {
            ...tr,
            items: tableItemRows.filter((i) => i.tableReportId === tr.id),
            incentives: incentiveRows.filter((i) => i.tableReportId === tr.id)
          };
        })()
      }));
    }),
    notify: publicProcedure.input(z4.object({
      branch: z4.string(),
      date: z4.string(),
      cash: z4.string(),
      card: z4.string(),
      dailyTotal: z4.string(),
      cashTotal: z4.string(),
      cardTotal: z4.string(),
      grandTotal: z4.string(),
      posStartAmount: z4.string(),
      posEndAmount: z4.string(),
      cashDeposit: z4.string().optional(),
      expenses: z4.array(z4.object({ description: z4.string(), amount: z4.string() }))
    })).mutation(async ({ input }) => {
      const fmt = (v) => {
        const n = Number((v || "").replace(/,/g, ""));
        return isNaN(n) || n === 0 ? "\u2014" : `\u20A9${n.toLocaleString("ko-KR")}`;
      };
      const title = `[${input.branch}] ${input.date} \uB9E4\uCD9C \uBCF4\uACE0`;
      const body = `\u{1F4B0} \uD604\uAE08: ${fmt(input.cash)} / \uCE74\uB4DC: ${fmt(input.card)} | \uD569\uACC4: ${fmt(input.dailyTotal)}`;
      try {
        await notifyOwner({ title, content: body });
      } catch {
      }
      let pushSent = false;
      if (ENV.ownerOpenId && ENV.vapidPublicKey && ENV.vapidPrivateKey) {
        try {
          const subs = await getPushSubscriptionsByOpenId(ENV.ownerOpenId);
          for (const sub of subs) {
            try {
              await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body }));
              pushSent = true;
            } catch (err) {
              if (err.statusCode === 410) await deletePushSubscription(sub.endpoint);
            }
          }
        } catch {
        }
      }
      return { success: true, pushSent };
    })
  }),
  liquor: router({
    branchItems: publicProcedure.input(z4.object({ branchId: z4.number().optional() })).query(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { items: [] };
      await ensureLiquorSeeded(db);
      const effectiveBranchId = account.role === "admin" ? input.branchId : account.branchId;
      const itemRows = await db.select().from(liquorItems).where(eq6(liquorItems.isActive, 1)).orderBy(liquorItems.sortOrder, liquorItems.name);
      if (!effectiveBranchId) {
        return { items: itemRows.map((item) => ({ ...item, unitCost: Number(item.unitCost || 0) })) };
      }
      const hiddenResult = await db.execute(sql`SELECT liquorItemId FROM liquorHiddenItems WHERE branchId = ${effectiveBranchId}`);
      const rawRows = Array.isArray(hiddenResult) ? Array.isArray(hiddenResult[0]) ? hiddenResult[0] : hiddenResult : hiddenResult?.rows ?? [];
      const hiddenIds = new Set((Array.isArray(rawRows) ? rawRows : []).map((r) => Number(r.liquorItemId ?? r.liquor_item_id ?? r[0])));
      let items = itemRows.filter((item) => !hiddenIds.has(Number(item.id)));
      if (items.length === 0 && itemRows.length > 0) items = itemRows;
      return { items: items.map((item) => ({ ...item, unitCost: Number(item.unitCost || 0) })) };
    }),
    overview: publicProcedure.input(z4.object({ date: z4.string(), branchId: z4.number().optional(), includeInactive: z4.boolean().optional() })).query(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { branches: [], items: [], inventories: [], movements: [], branchSummaries: [], totals: { stock: 0, inQty: 0, outQty: 0, outCost: 0 } };
      await ensureLiquorSeeded(db);
      const allBranches = account.role === "admin" ? await db.select().from(branches).orderBy(branches.name) : account.branchId ? await db.select().from(branches).where(eq6(branches.id, account.branchId)) : [];
      const allowedBranchIds = allBranches.map((b) => b.id);
      const selectedBranchIds = account.role === "admin" && input.branchId ? allowedBranchIds.filter((id) => id === input.branchId) : allowedBranchIds;
      if (selectedBranchIds.length === 0) {
        return { branches: allBranches, items: [], inventories: [], movements: [], branchSummaries: [], totals: { stock: 0, inQty: 0, outQty: 0, outCost: 0 } };
      }
      const itemRows = await db.select().from(liquorItems).orderBy(liquorItems.sortOrder, liquorItems.name);
      let activeItems = input.includeInactive ? itemRows : itemRows.filter((i) => Number(i.isActive) === 1);
      if (selectedBranchIds.length === 1) {
        const hiddenResult = await db.execute(sql`SELECT liquorItemId FROM liquorHiddenItems WHERE branchId = ${selectedBranchIds[0]}`);
        const rawHiddenRows = Array.isArray(hiddenResult) ? Array.isArray(hiddenResult[0]) ? hiddenResult[0] : hiddenResult : hiddenResult?.rows ?? [];
        const hiddenIds = new Set((Array.isArray(rawHiddenRows) ? rawHiddenRows : []).map((r) => Number(r.liquorItemId ?? r.liquor_item_id ?? r[0])));
        activeItems = activeItems.filter((i) => !hiddenIds.has(Number(i.id)));
      }
      const inventoryRows = await db.select().from(liquorInventories).where(inArray(liquorInventories.branchId, selectedBranchIds));
      const movementRows = await db.select().from(liquorStockMovements).where(and5(inArray(liquorStockMovements.branchId, selectedBranchIds), eq6(liquorStockMovements.date, input.date))).orderBy(desc3(liquorStockMovements.createdAt));
      const itemById = new Map(itemRows.map((i) => [i.id, i]));
      const branchById = new Map(allBranches.map((b) => [b.id, b]));
      const creatorRows = await db.select().from(storeAccounts);
      const creatorById = new Map(creatorRows.map((a) => [Number(a.id), a]));
      const movements = movementRows.map((m) => {
        const item = itemById.get(m.liquorItemId);
        const branch = branchById.get(m.branchId);
        const creator = m.createdBy ? creatorById.get(Number(m.createdBy)) : null;
        return {
          ...m,
          quantity: Number(m.quantity || 0),
          unitCost: Number(m.unitCost || item?.unitCost || 0),
          totalCost: Number(m.totalCost || 0) || Math.abs(Number(m.quantity || 0)) * Number(m.unitCost || item?.unitCost || 0),
          itemName: item?.name ?? "\uC0AD\uC81C\uB41C \uD488\uBAA9",
          category: item?.category ?? "\uAE30\uD0C0",
          branchName: branch?.name ?? "",
          createdByLoginId: creator?.loginId ?? "",
          createdByDisplayName: creator?.displayName ?? "",
          createdByRole: creator?.role ?? ""
        };
      });
      const activeItemIds = new Set(activeItems.map((i) => Number(i.id)));
      const inventories = inventoryRows.filter((inv) => activeItemIds.has(Number(inv.liquorItemId))).map((inv) => ({ ...inv, currentStock: Number(inv.currentStock || 0) }));
      const branchSummaries = selectedBranchIds.map((branchId) => {
        const branch = branchById.get(branchId);
        const branchMovements = movements.filter((m) => m.branchId === branchId);
        const outMovements = branchMovements.filter((m) => m.type === "OUT");
        const inMovements = branchMovements.filter((m) => m.type === "IN");
        return {
          branchId,
          branchName: branch?.name ?? "",
          outQty: outMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity || 0)), 0),
          inQty: inMovements.reduce((sum, m) => sum + Math.abs(Number(m.quantity || 0)), 0),
          outCost: outMovements.reduce((sum, m) => sum + Math.abs(Number(m.totalCost || 0)), 0),
          itemCount: new Set(outMovements.map((m) => m.liquorItemId)).size
        };
      });
      const totals = {
        stock: inventories.reduce((sum, inv) => sum + Number(inv.currentStock || 0), 0),
        inQty: branchSummaries.reduce((sum, b) => sum + b.inQty, 0),
        outQty: branchSummaries.reduce((sum, b) => sum + b.outQty, 0),
        outCost: branchSummaries.reduce((sum, b) => sum + b.outCost, 0)
      };
      return { branches: allBranches, items: activeItems.map((i) => ({ ...i, unitCost: Number(i.unitCost || 0) })), inventories, movements, branchSummaries, totals };
    }),
    history: publicProcedure.input(z4.object({
      startDate: z4.string(),
      endDate: z4.string(),
      branchId: z4.number().optional(),
      keyword: z4.string().optional(),
      type: z4.enum(["IN", "OUT", "ADJUST"]).optional()
    })).query(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { movements: [] };
      await ensureLiquorSeeded(db);
      const allBranches = account.role === "admin" ? await db.select().from(branches).orderBy(branches.name) : account.branchId ? await db.select().from(branches).where(eq6(branches.id, account.branchId)) : [];
      const allowedBranchIds = allBranches.map((b) => b.id);
      const selectedBranchIds = account.role === "admin" && input.branchId ? allowedBranchIds.filter((id) => id === input.branchId) : allowedBranchIds;
      if (selectedBranchIds.length === 0) return { movements: [] };
      const itemRows = await db.select().from(liquorItems).orderBy(liquorItems.sortOrder, liquorItems.name);
      const itemById = new Map(itemRows.map((i) => [i.id, i]));
      const branchById = new Map(allBranches.map((b) => [b.id, b]));
      const creatorRows = await db.select().from(storeAccounts);
      const creatorById = new Map(creatorRows.map((a) => [Number(a.id), a]));
      const historyConditions = [
        inArray(liquorStockMovements.branchId, selectedBranchIds),
        gte4(liquorStockMovements.date, input.startDate),
        lte4(liquorStockMovements.date, input.endDate)
      ];
      if (input.type) historyConditions.push(eq6(liquorStockMovements.type, input.type));
      const movementRows = await db.select().from(liquorStockMovements).where(and5(...historyConditions)).orderBy(desc3(liquorStockMovements.date), desc3(liquorStockMovements.createdAt));
      const keyword = (input.keyword || "").trim().toLowerCase();
      const movements = movementRows.map((m) => {
        const item = itemById.get(m.liquorItemId);
        const branch = branchById.get(m.branchId);
        const creator = m.createdBy ? creatorById.get(Number(m.createdBy)) : null;
        return {
          ...m,
          quantity: Number(m.quantity || 0),
          unitCost: Number(m.unitCost || item?.unitCost || 0),
          totalCost: Number(m.totalCost || 0) || Math.abs(Number(m.quantity || 0)) * Number(m.unitCost || item?.unitCost || 0),
          itemName: item?.name ?? "\uC0AD\uC81C\uB41C \uD488\uBAA9",
          category: item?.category ?? "\uAE30\uD0C0",
          branchName: branch?.name ?? "",
          createdByLoginId: creator?.loginId ?? "",
          createdByDisplayName: creator?.displayName ?? "",
          createdByRole: creator?.role ?? ""
        };
      }).filter((m) => !keyword || String(m.itemName).toLowerCase().includes(keyword));
      return { movements };
    }),
    upsertItem: publicProcedure.input(z4.object({
      id: z4.number().optional(),
      name: z4.string().min(1),
      category: z4.string().min(1).default("\uAE30\uD0C0"),
      unitCost: z4.number().min(0).optional().default(0),
      isActive: z4.boolean().default(true),
      branchId: z4.number().optional(),
      initialStock: z4.number().optional().default(0)
    })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const effectiveBranchId = account.role === "admin" ? input.branchId : account.branchId;
      if (!effectiveBranchId) {
        throw new TRPCError5({ code: "BAD_REQUEST", message: "\uC8FC\uB958 \uD488\uBAA9\uC744 \uCD94\uAC00/\uC218\uC815\uD558\uB824\uBA74 \uC9C0\uC810\uC744 \uBA3C\uC800 \uC120\uD0DD\uD574\uC8FC\uC138\uC694" });
      }
      if (input.id) {
        if (account.role === "admin") {
          await db.update(liquorItems).set({
            name: input.name,
            category: input.category,
            unitCost: String(input.unitCost || 0),
            isActive: input.isActive ? 1 : 0
          }).where(eq6(liquorItems.id, input.id));
          const newUnitCost = Number(input.unitCost || 0);
          if (newUnitCost > 0) {
            const staleMovements = await db.select().from(liquorStockMovements).where(and5(
              eq6(liquorStockMovements.liquorItemId, input.id),
              sql`(CAST(${liquorStockMovements.unitCost} AS DECIMAL) = 0 OR CAST(${liquorStockMovements.totalCost} AS DECIMAL) = 0)`
            ));
            for (const mv of staleMovements) {
              const newTotalCost = Math.abs(Number(mv.quantity || 0)) * newUnitCost;
              await db.update(liquorStockMovements).set({
                unitCost: String(newUnitCost),
                totalCost: String(newTotalCost)
              }).where(eq6(liquorStockMovements.id, mv.id));
            }
          }
        } else {
          await db.update(liquorItems).set({
            name: input.name,
            category: input.category,
            isActive: input.isActive ? 1 : 0
          }).where(eq6(liquorItems.id, input.id));
        }
        if (effectiveBranchId && input.initialStock !== void 0) {
          const [existingInventory] = await db.select().from(liquorInventories).where(and5(eq6(liquorInventories.branchId, effectiveBranchId), eq6(liquorInventories.liquorItemId, input.id))).limit(1);
          const prevStock = Number(existingInventory?.currentStock || 0);
          const nextStock = Number(input.initialStock || 0);
          const diff = nextStock - prevStock;
          if (existingInventory) {
            await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq6(liquorInventories.id, existingInventory.id));
            try {
              await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${existingInventory.branchId}, ${existingInventory.liquorItemId}, ${Number(existingInventory.currentStock || 0)}, ${Number(nextStock)}, ${"upsertItem"}, ${account?.id ?? null})`);
            } catch {
            }
          } else {
            await db.insert(liquorInventories).values({ branchId: effectiveBranchId, liquorItemId: input.id, currentStock: String(nextStock) });
            try {
              await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${effectiveBranchId}, ${input.id}, 0, ${Number(nextStock)}, ${"upsertItem-new"}, ${account?.id ?? null})`);
            } catch {
            }
          }
          if (diff !== 0) {
            const [stockItem] = await db.select().from(liquorItems).where(eq6(liquorItems.id, input.id)).limit(1);
            const unitCost = Number(stockItem?.unitCost || 0);
            await db.insert(liquorStockMovements).values({
              branchId: effectiveBranchId,
              liquorItemId: input.id,
              date: todayKstString(),
              type: "ADJUST",
              quantity: String(diff),
              unitCost: String(unitCost),
              totalCost: String(Math.abs(diff) * unitCost),
              memo: `\uC7AC\uACE0\uC218\uC815: ${prevStock}\uAC1C \u2192 ${nextStock}\uAC1C (${diff > 0 ? "+" : ""}${diff})`,
              createdBy: account.id
            });
          }
        }
        return { success: true, id: input.id };
      }
      const cleanName = input.name.trim();
      const normalizedNewName = cleanName.replace(/\s+/g, "");
      const targetBranchIdForDedupe = input.branchId ?? account.branchId;
      if (targetBranchIdForDedupe) {
        const hiddenForBranch = await db.select({ liquorItemId: liquorHiddenItems.liquorItemId }).from(liquorHiddenItems).where(eq6(liquorHiddenItems.branchId, targetBranchIdForDedupe));
        const hiddenIdSet = new Set(hiddenForBranch.map((h) => h.liquorItemId));
        const allActiveItems = await db.select().from(liquorItems).where(eq6(liquorItems.isActive, 1));
        const existingMatch = allActiveItems.find(
          (it) => !hiddenIdSet.has(it.id) && it.name.replace(/\s+/g, "") === normalizedNewName
        );
        if (existingMatch) {
          return { success: true, id: existingMatch.id, reused: true };
        }
      }
      const result = await db.insert(liquorItems).values({
        name: cleanName,
        category: input.category,
        unitCost: String(account.role === "admin" ? input.unitCost || 0 : 0),
        isActive: 1,
        sortOrder: 9999
      });
      let itemId = Number(result.insertId || 0);
      if (!itemId) {
        const [created] = await db.select().from(liquorItems).where(eq6(liquorItems.name, cleanName)).orderBy(desc3(liquorItems.id)).limit(1);
        itemId = created?.id;
      }
      if (!itemId) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "\uD488\uBAA9 \uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4" });
      const allBranchRows = await db.select().from(branches);
      for (const branch of allBranchRows) {
        if (Number(branch.id) !== Number(effectiveBranchId)) {
          await db.execute(sql`INSERT IGNORE INTO liquorHiddenItems (branchId, liquorItemId) VALUES (${branch.id}, ${itemId})`);
        }
      }
      await db.execute(sql`DELETE FROM liquorHiddenItems WHERE branchId = ${effectiveBranchId} AND liquorItemId = ${itemId}`);
      const initialStock = Number(input.initialStock || 0);
      await db.insert(liquorInventories).values({
        branchId: effectiveBranchId,
        liquorItemId: itemId,
        currentStock: String(initialStock)
      });
      if (initialStock !== 0) {
        const unitCost = account.role === "admin" ? Number(input.unitCost || 0) : 0;
        await db.insert(liquorStockMovements).values({
          branchId: effectiveBranchId,
          liquorItemId: itemId,
          date: todayKstString(),
          type: "ADJUST",
          quantity: String(initialStock),
          unitCost: String(unitCost),
          totalCost: String(Math.abs(initialStock) * unitCost),
          memo: "\uC81C\uD488 \uB4F1\uB85D \uCD08\uAE30 \uC7AC\uACE0",
          createdBy: account.id
        });
      }
      return { success: true, id: itemId };
    }),
    deleteItem: publicProcedure.input(z4.object({ id: z4.number(), branchId: z4.number().optional() })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const branchId = account.role === "admin" ? input.branchId : account.branchId;
      if (!branchId) throw new TRPCError5({ code: "BAD_REQUEST", message: "\uC0AD\uC81C\uD560 \uC9C0\uC810\uC744 \uBA3C\uC800 \uC120\uD0DD\uD574\uC8FC\uC138\uC694" });
      if (account.role !== "admin" && Number(account.branchId) !== Number(branchId)) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uD574\uB2F9 \uC9C0\uC810 \uD488\uBAA9\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
      await db.execute(sql`INSERT IGNORE INTO liquorHiddenItems (branchId, liquorItemId) VALUES (${branchId}, ${input.id})`);
      await db.delete(liquorInventories).where(and5(eq6(liquorInventories.branchId, branchId), eq6(liquorInventories.liquorItemId, input.id)));
      return { success: true, mode: "branch" };
    }),
    bulkDeleteItems: publicProcedure.input(z4.object({ ids: z4.array(z4.number()).min(1), branchId: z4.number().optional() })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const branchId = account.role === "admin" ? input.branchId : account.branchId;
      if (!branchId) throw new TRPCError5({ code: "BAD_REQUEST", message: "\uC0AD\uC81C\uD560 \uC9C0\uC810\uC744 \uBA3C\uC800 \uC120\uD0DD\uD574\uC8FC\uC138\uC694" });
      if (account.role !== "admin" && Number(account.branchId) !== Number(branchId)) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uD574\uB2F9 \uC9C0\uC810 \uD488\uBAA9\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
      const ids = Array.from(new Set(input.ids.map(Number).filter(Boolean)));
      if (!ids.length) return { success: true, count: 0 };
      for (const id of ids) {
        await db.execute(sql`INSERT IGNORE INTO liquorHiddenItems (branchId, liquorItemId) VALUES (${branchId}, ${id})`);
      }
      await db.delete(liquorInventories).where(and5(eq6(liquorInventories.branchId, branchId), inArray(liquorInventories.liquorItemId, ids)));
      return { success: true, count: ids.length, mode: "branch" };
    }),
    recordMovement: publicProcedure.input(z4.object({ branchId: z4.number(), date: z4.string(), type: z4.enum(["IN", "OUT", "ADJUST"]), items: z4.array(z4.object({ liquorItemId: z4.number(), quantity: z4.number(), memo: z4.string().optional() })).min(1), memo: z4.string().optional() })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      if (account.role !== "admin" && account.branchId !== input.branchId) throw new TRPCError5({ code: "FORBIDDEN", message: "\uD574\uB2F9 \uC9C0\uC810 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" });
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const itemIds = input.items.map((i) => i.liquorItemId);
      const itemRows = itemIds.length ? await db.select().from(liquorItems).where(inArray(liquorItems.id, itemIds)) : [];
      const itemById = new Map(itemRows.map((i) => [i.id, i]));
      for (const row of input.items) {
        const item = itemById.get(row.liquorItemId);
        if (!item) continue;
        const rawQty = Number(row.quantity || 0);
        if (!rawQty && input.type !== "ADJUST") continue;
        const unitCost = Number(item.unitCost || 0);
        const signedQty = input.type === "OUT" ? -Math.abs(rawQty) : input.type === "IN" ? Math.abs(rawQty) : rawQty;
        const totalCost = Math.abs(signedQty) * unitCost;
        await db.insert(liquorStockMovements).values({ branchId: input.branchId, liquorItemId: row.liquorItemId, date: input.date, type: input.type, quantity: String(signedQty), unitCost: String(unitCost), totalCost: String(totalCost), memo: row.memo || input.memo || null, createdBy: account.id });
        const [existing] = await db.select().from(liquorInventories).where(and5(eq6(liquorInventories.branchId, input.branchId), eq6(liquorInventories.liquorItemId, row.liquorItemId))).limit(1);
        const nextStock = Number(existing?.currentStock || 0) + signedQty;
        if (existing) {
          await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq6(liquorInventories.id, existing.id));
          try {
            await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${existing.branchId}, ${existing.liquorItemId}, ${Number(existing.currentStock || 0)}, ${Number(nextStock)}, ${"recordMovement"}, ${account?.id ?? null})`);
          } catch {
          }
        } else {
          const hiddenCheck = await db.execute(sql`SELECT id FROM liquorHiddenItems WHERE branchId = ${input.branchId} AND liquorItemId = ${row.liquorItemId} LIMIT 1`);
          const hiddenRows = Array.isArray(hiddenCheck) ? Array.isArray(hiddenCheck[0]) ? hiddenCheck[0] : hiddenCheck : hiddenCheck?.rows ?? [];
          const isHidden = Array.isArray(hiddenRows) && hiddenRows.length > 0;
          if (!isHidden) {
            await db.insert(liquorInventories).values({ branchId: input.branchId, liquorItemId: row.liquorItemId, currentStock: String(nextStock) });
          }
        }
      }
      try {
        const newLiquorCost = await calculateLiquorCostExpense(input.branchId, input.date);
        const existingRec = await getDailySalesRecord(input.branchId, input.date);
        if (existingRec) {
          const newTotalExpenses = Number(existingRec.commissionExpense || 0) + Number(existingRec.rentExpense || 0) + Number(existingRec.managementFeeExpense || 0) + Number(existingRec.staffWageExpense || 0) + Number(existingRec.managerWageExpense || 0) + Number(existingRec.partTimeWageExpense || 0) + newLiquorCost + Number(existingRec.staffDrinkExpense || 0) + Number(existingRec.salesIncentiveExpense || 0) + Number(existingRec.otherExpense || 0);
          const newNetProfit = Number(existingRec.totalRevenue || 0) - newTotalExpenses;
          await db.update(dailySalesRecords).set({
            liquorCostExpense: String(newLiquorCost),
            totalExpenses: String(newTotalExpenses),
            netProfit: String(newNetProfit)
          }).where(eq6(dailySalesRecords.id, existingRec.id));
        } else if (newLiquorCost > 0) {
          await db.insert(dailySalesRecords).values({
            branchId: input.branchId,
            date: input.date,
            liquorCostExpense: String(newLiquorCost),
            totalExpenses: String(newLiquorCost),
            netProfit: String(-newLiquorCost)
          });
        }
      } catch (e) {
        console.error("[recordMovement] liquorCostExpense \uC790\uB3D9 \uB3D9\uAE30\uD654 \uC624\uB958", e);
      }
      return { success: true };
    }),
    updateMovement: publicProcedure.input(z4.object({ id: z4.number(), date: z4.string(), type: z4.enum(["IN", "OUT", "ADJUST"]).optional(), quantity: z4.number(), memo: z4.string().optional() })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const [movement] = await db.select().from(liquorStockMovements).where(eq6(liquorStockMovements.id, input.id)).limit(1);
      if (!movement) throw new TRPCError5({ code: "NOT_FOUND", message: "\uD788\uC2A4\uD1A0\uB9AC \uB0B4\uC5ED\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      if (account.role !== "admin" && account.branchId !== movement.branchId) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uD574\uB2F9 \uC9C0\uC810 \uB0B4\uC5ED\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
      const rawQty = Number(input.quantity || 0);
      const nextType = input.type || movement.type;
      if (!rawQty && nextType !== "ADJUST") throw new TRPCError5({ code: "BAD_REQUEST", message: "\uC218\uB7C9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694" });
      const newSignedQty = nextType === "OUT" ? -Math.abs(rawQty) : nextType === "IN" ? Math.abs(rawQty) : rawQty;
      const oldSignedQty = Number(movement.quantity || 0);
      const diff = newSignedQty - oldSignedQty;
      const [itemForCost] = await db.select().from(liquorItems).where(eq6(liquorItems.id, movement.liquorItemId)).limit(1);
      const unitCost = Number(movement.unitCost || itemForCost?.unitCost || 0);
      const totalCost = Math.abs(newSignedQty) * unitCost;
      await db.update(liquorStockMovements).set({
        date: input.date,
        type: nextType,
        quantity: String(newSignedQty),
        totalCost: String(totalCost),
        memo: input.memo || null,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(liquorStockMovements.id, input.id));
      if (diff !== 0) {
        const [existing] = await db.select().from(liquorInventories).where(and5(eq6(liquorInventories.branchId, movement.branchId), eq6(liquorInventories.liquorItemId, movement.liquorItemId))).limit(1);
        if (existing) {
          const nextStock = Number(existing.currentStock || 0) + diff;
          await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq6(liquorInventories.id, existing.id));
          try {
            await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${existing.branchId}, ${existing.liquorItemId}, ${Number(existing.currentStock || 0)}, ${Number(nextStock)}, ${"updateMovement"}, ${account?.id ?? null})`);
          } catch {
          }
        } else {
          await db.insert(liquorInventories).values({ branchId: movement.branchId, liquorItemId: movement.liquorItemId, currentStock: String(diff) });
        }
      }
      return { success: true };
    }),
    updateMovementGroup: publicProcedure.input(z4.object({ ids: z4.array(z4.number()).min(1), date: z4.string(), type: z4.enum(["IN", "OUT", "ADJUST"]), memo: z4.string().optional(), mergeSameDate: z4.boolean().optional() })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const rows = await db.select().from(liquorStockMovements).where(inArray(liquorStockMovements.id, input.ids));
      if (rows.length === 0) throw new TRPCError5({ code: "NOT_FOUND", message: "\uD788\uC2A4\uD1A0\uB9AC \uB0B4\uC5ED\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      if (account.role !== "admin" && rows.some((m) => Number(m.branchId) !== Number(account.branchId))) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uD574\uB2F9 \uC9C0\uC810 \uB0B4\uC5ED\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
      const mergeTarget = input.mergeSameDate ? (await db.select().from(liquorStockMovements).where(and5(
        eq6(liquorStockMovements.branchId, rows[0].branchId),
        eq6(liquorStockMovements.date, input.date),
        eq6(liquorStockMovements.type, input.type),
        not(inArray(liquorStockMovements.id, input.ids))
      )).orderBy(desc3(liquorStockMovements.createdAt)).limit(1))[0] : null;
      const mergedCreatedAt = mergeTarget?.createdAt ? new Date(mergeTarget.createdAt) : void 0;
      const mergedCreatedBy = mergeTarget?.createdBy || rows[0].createdBy;
      const mergedMemo = input.mergeSameDate && mergeTarget ? input.memo ?? mergeTarget.memo ?? null : input.memo || null;
      if (input.mergeSameDate && mergeTarget) {
        await db.update(liquorStockMovements).set({
          memo: mergedMemo,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(and5(
          eq6(liquorStockMovements.branchId, rows[0].branchId),
          eq6(liquorStockMovements.date, input.date),
          eq6(liquorStockMovements.type, input.type),
          eq6(liquorStockMovements.createdAt, mergeTarget.createdAt)
        ));
      }
      for (const movement of rows) {
        const oldSignedQty = Number(movement.quantity || 0);
        const baseQty = Math.abs(oldSignedQty);
        const newSignedQty = input.type === "OUT" ? -baseQty : input.type === "IN" ? baseQty : oldSignedQty;
        const diff = newSignedQty - oldSignedQty;
        const totalCost = Math.abs(newSignedQty) * Number(movement.unitCost || 0);
        await db.update(liquorStockMovements).set({
          date: input.date,
          type: input.type,
          quantity: String(newSignedQty),
          totalCost: String(totalCost),
          memo: mergedMemo,
          ...mergedCreatedAt ? { createdAt: mergedCreatedAt, createdBy: mergedCreatedBy } : {},
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq6(liquorStockMovements.id, movement.id));
        if (diff !== 0) {
          const [existing] = await db.select().from(liquorInventories).where(and5(eq6(liquorInventories.branchId, movement.branchId), eq6(liquorInventories.liquorItemId, movement.liquorItemId))).limit(1);
          if (existing) {
            const nextStock = Number(existing.currentStock || 0) + diff;
            await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq6(liquorInventories.id, existing.id));
            try {
              await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${existing.branchId}, ${existing.liquorItemId}, ${Number(existing.currentStock || 0)}, ${Number(nextStock)}, ${"updateMovementGroup"}, ${account?.id ?? null})`);
            } catch {
            }
          } else {
            await db.insert(liquorInventories).values({ branchId: movement.branchId, liquorItemId: movement.liquorItemId, currentStock: String(diff) });
          }
        }
      }
      return { success: true };
    }),
    addMovementToGroup: publicProcedure.input(z4.object({
      groupIds: z4.array(z4.number()).min(1),
      liquorItemId: z4.number(),
      quantity: z4.number(),
      type: z4.enum(["IN", "OUT", "ADJUST"]),
      date: z4.string(),
      memo: z4.string().optional()
    })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const groupRows = await db.select().from(liquorStockMovements).where(inArray(liquorStockMovements.id, input.groupIds));
      if (groupRows.length === 0) throw new TRPCError5({ code: "NOT_FOUND", message: "\uAE30\uC900 \uD788\uC2A4\uD1A0\uB9AC\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      const base = groupRows[0];
      if (account.role !== "admin" && Number(account.branchId) !== Number(base.branchId)) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uD574\uB2F9 \uC9C0\uC810 \uB0B4\uC5ED\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
      const [item] = await db.select().from(liquorItems).where(eq6(liquorItems.id, input.liquorItemId)).limit(1);
      if (!item) throw new TRPCError5({ code: "NOT_FOUND", message: "\uD488\uBAA9\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      const rawQty = Number(input.quantity || 0);
      if (!rawQty && input.type !== "ADJUST") throw new TRPCError5({ code: "BAD_REQUEST", message: "\uC218\uB7C9\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694" });
      const signedQty = input.type === "OUT" ? -Math.abs(rawQty) : input.type === "IN" ? Math.abs(rawQty) : rawQty;
      const unitCost = Number(item.unitCost || 0);
      const totalCost = Math.abs(signedQty) * unitCost;
      await db.insert(liquorStockMovements).values({
        branchId: base.branchId,
        liquorItemId: input.liquorItemId,
        date: input.date,
        type: input.type,
        quantity: String(signedQty),
        unitCost: String(unitCost),
        totalCost: String(totalCost),
        memo: input.memo || base.memo || null,
        createdBy: base.createdBy,
        createdAt: base.createdAt
      });
      const [existing] = await db.select().from(liquorInventories).where(and5(eq6(liquorInventories.branchId, base.branchId), eq6(liquorInventories.liquorItemId, input.liquorItemId))).limit(1);
      const nextStock = Number(existing?.currentStock || 0) + signedQty;
      if (existing) {
        await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq6(liquorInventories.id, existing.id));
        try {
          await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${existing.branchId}, ${existing.liquorItemId}, ${Number(existing.currentStock || 0)}, ${Number(nextStock)}, ${"addMovementToGroup"}, ${account?.id ?? null})`);
        } catch {
        }
      } else {
        await db.insert(liquorInventories).values({ branchId: base.branchId, liquorItemId: input.liquorItemId, currentStock: String(nextStock) });
        try {
          await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${base.branchId}, ${input.liquorItemId}, 0, ${Number(nextStock)}, ${"addMovementToGroup-new"}, ${account?.id ?? null})`);
        } catch {
        }
      }
      return { success: true };
    }),
    deleteMovement: publicProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const [movement] = await db.select().from(liquorStockMovements).where(eq6(liquorStockMovements.id, input.id)).limit(1);
      if (!movement) throw new TRPCError5({ code: "NOT_FOUND", message: "\uD788\uC2A4\uD1A0\uB9AC \uB0B4\uC5ED\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      if (account.role !== "admin" && account.branchId !== movement.branchId) {
        throw new TRPCError5({ code: "FORBIDDEN", message: "\uD574\uB2F9 \uC9C0\uC810 \uB0B4\uC5ED\uB9CC \uC0AD\uC81C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
      const signedQty = Number(movement.quantity || 0);
      const [existing] = await db.select().from(liquorInventories).where(and5(eq6(liquorInventories.branchId, movement.branchId), eq6(liquorInventories.liquorItemId, movement.liquorItemId))).limit(1);
      if (existing) {
        const nextStock = Number(existing.currentStock || 0) - signedQty;
        await db.update(liquorInventories).set({ currentStock: String(nextStock) }).where(eq6(liquorInventories.id, existing.id));
        try {
          await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${existing.branchId}, ${existing.liquorItemId}, ${Number(existing.currentStock || 0)}, ${Number(nextStock)}, ${"deleteMovement"}, ${account?.id ?? null})`);
        } catch {
        }
      }
      await db.delete(liquorStockMovements).where(eq6(liquorStockMovements.id, input.id));
      return { success: true };
    }),
    setStock: publicProcedure.input(z4.object({ branchId: z4.number(), liquorItemId: z4.number(), currentStock: z4.number(), memo: z4.string().optional() })).mutation(async ({ ctx, input }) => {
      const account = await requireStoreAccount(ctx);
      if (account.role !== "admin" && account.branchId !== input.branchId) throw new TRPCError5({ code: "FORBIDDEN", message: "\uD574\uB2F9 \uC9C0\uC810 \uC7AC\uACE0\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      const db = await getDb();
      if (!db) return { success: false };
      await ensureLiquorSeeded(db);
      const [item] = await db.select().from(liquorItems).where(eq6(liquorItems.id, input.liquorItemId)).limit(1);
      if (!item) throw new TRPCError5({ code: "NOT_FOUND", message: "\uD488\uBAA9\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      const [existing] = await db.select().from(liquorInventories).where(and5(eq6(liquorInventories.branchId, input.branchId), eq6(liquorInventories.liquorItemId, input.liquorItemId))).limit(1);
      const prevStock = Number(existing?.currentStock || 0);
      const diff = input.currentStock - prevStock;
      if (existing) {
        await db.update(liquorInventories).set({ currentStock: String(input.currentStock) }).where(eq6(liquorInventories.id, existing.id));
        try {
          await db.execute(sql`INSERT INTO liquorStockAudit (branchId, liquorItemId, prevStock, nextStock, source, accountId) VALUES (${existing.branchId}, ${existing.liquorItemId}, ${Number(existing.currentStock || 0)}, ${Number(input.currentStock)}, ${"setStock"}, ${account?.id ?? null})`);
        } catch {
        }
      } else {
        const hiddenCheck2 = await db.execute(sql`SELECT id FROM liquorHiddenItems WHERE branchId = ${input.branchId} AND liquorItemId = ${input.liquorItemId} LIMIT 1`);
        const hiddenRows2 = Array.isArray(hiddenCheck2) ? Array.isArray(hiddenCheck2[0]) ? hiddenCheck2[0] : hiddenCheck2 : hiddenCheck2?.rows ?? [];
        const isHidden2 = Array.isArray(hiddenRows2) && hiddenRows2.length > 0;
        if (!isHidden2) {
          await db.insert(liquorInventories).values({ branchId: input.branchId, liquorItemId: input.liquorItemId, currentStock: String(input.currentStock) });
        }
      }
      if (diff !== 0) {
        const unitCost = Number(item.unitCost || 0);
        await db.insert(liquorStockMovements).values({ branchId: input.branchId, liquorItemId: input.liquorItemId, date: todayKstString(), type: "ADJUST", quantity: String(diff), unitCost: String(unitCost), totalCost: String(Math.abs(diff) * unitCost), memo: input.memo || `\uC7AC\uACE0\uC218\uC815: ${prevStock}\uAC1C \u2192 ${input.currentStock}\uAC1C (${diff > 0 ? "+" : ""}${diff})`, createdBy: account.id });
      }
      return { success: true };
    })
  }),
  tableReport: router({
    // 날짜별 테이블 기록 조회 (없으면 null 반환)
    getByDate: publicProcedure.input(z4.object({ date: z4.string(), branchId: z4.number().optional() })).query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) return null;
      const effectiveBranchId = account.branchId ?? input.branchId;
      if (!effectiveBranchId) return null;
      const [report] = await db.select().from(tableReports).where(and5(eq6(tableReports.branchId, effectiveBranchId), eq6(tableReports.date, input.date))).limit(1);
      if (!report) return null;
      const items = await db.select().from(tableItems).where(eq6(tableItems.tableReportId, report.id)).orderBy(tableItems.sortOrder, tableItems.createdAt);
      const incentives = await db.select().from(staffIncentives).where(eq6(staffIncentives.tableReportId, report.id)).orderBy(staffIncentives.sortOrder, staffIncentives.createdAt);
      return { ...report, items, incentives };
    }),
    // 기록 생성 또는 업데이트
    upsert: publicProcedure.input(z4.object({
      date: z4.string(),
      teamCount: z4.number().default(0),
      notes: z4.string().optional(),
      branchId: z4.number().optional()
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError5({ code: "FORBIDDEN", message: "\uC9C0\uC810 \uACC4\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const effectiveBranchId = account.branchId ?? input.branchId;
      if (!effectiveBranchId) throw new TRPCError5({ code: "FORBIDDEN", message: "\uC9C0\uC810 \uC815\uBCF4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const [existing] = await db.select().from(tableReports).where(and5(eq6(tableReports.branchId, effectiveBranchId), eq6(tableReports.date, input.date))).limit(1);
      let reportId;
      if (existing) {
        await db.update(tableReports).set({
          teamCount: input.teamCount,
          notes: input.notes || null
        }).where(eq6(tableReports.id, existing.id));
        reportId = existing.id;
      } else {
        const [result] = await db.insert(tableReports).values({
          branchId: effectiveBranchId,
          date: input.date,
          teamCount: input.teamCount,
          notes: input.notes || null
        });
        reportId = result.insertId;
      }
      const allItems = await db.select().from(tableItems).where(eq6(tableItems.tableReportId, reportId));
      const cashSum = allItems.filter((it) => it.paymentMethod === "cash").reduce((sum, it) => sum + Number(it.amount || 0), 0);
      const cardSum = allItems.filter((it) => it.paymentMethod === "card").reduce((sum, it) => sum + Number(it.amount || 0), 0);
      await db.update(tableReports).set({
        cashAmount: String(cashSum),
        cardAmount: String(cardSum)
      }).where(eq6(tableReports.id, reportId));
      const existingSales = await getDailySalesRecord(effectiveBranchId, input.date);
      const prevRec2 = await getPrevDailySalesRecord(effectiveBranchId, input.date);
      const { cashTotal: computedCashTotal2, cardTotal: computedCardTotal2 } = await computeCumulativesForDate(
        effectiveBranchId,
        input.date,
        prevRec2 ?? null,
        cashSum,
        cardSum
      );
      await upsertDailySalesRecord({
        branchId: effectiveBranchId,
        date: input.date,
        posStartAmount: existingSales?.posStartAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || "0") || 0),
        cash: String(cashSum),
        card: String(cardSum),
        cashTotal: String(computedCashTotal2),
        cardTotal: String(computedCardTotal2),
        posEndAmount: existingSales?.posEndAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || "0") || 0),
        expenses: existingSales?.expenses ?? [],
        submittedAt: /* @__PURE__ */ new Date()
      });
      try {
        await cascadeUpdateCumulativeAmounts(effectiveBranchId, input.date);
      } catch (e) {
        console.error("[cascadeUpdateCumulativeAmounts \uC624\uB958]", e);
      }
      try {
        await cascadeUpdatePosAmounts(effectiveBranchId, input.date);
      } catch (e) {
        console.error("[cascadeUpdatePosAmounts \uC624\uB958]", e);
      }
      try {
        const salesRec = await db?.select().from(dailySalesRecords).where(and5(eq6(dailySalesRecords.branchId, effectiveBranchId), eq6(dailySalesRecords.date, input.date))).limit(1);
        const rec = salesRec && salesRec.length > 0 ? salesRec[0] : null;
        const allInc = await db?.select().from(staffIncentives).where(eq6(staffIncentives.tableReportId, reportId));
        const sc = (allInc ?? []).filter((i) => i.staffType === "staff").length;
        const pc = (allInc ?? []).filter((i) => i.staffType === "parttime").length;
        const mc = (allInc ?? []).filter((i) => i.staffType === "manager" || i.staffType === "deputy").length;
        let pth = 0;
        for (const inc of (allInc ?? []).filter((i) => i.staffType === "parttime")) {
          if (inc.workStart && inc.workEnd) {
            try {
              const [sh, sm] = inc.workStart.split(":").map(Number);
              const [eh, em] = inc.workEnd.split(":").map(Number);
              let startMin = sh * 60 + sm;
              let endMin = eh * 60 + em;
              if (endMin <= startMin) endMin += 24 * 60;
              pth += (endMin - startMin) / 60;
            } catch {
            }
          }
        }
        const cash = parseInt(rec?.cash || "0") || cashSum;
        const card = parseInt(rec?.card || "0") || cardSum;
        const expenses = rec && Array.isArray(rec.expenses) ? rec.expenses : [];
        const settlement = await calculateDailySettlement(
          effectiveBranchId,
          input.date,
          cash,
          card,
          sc,
          pc,
          expenses,
          reportId,
          mc,
          pth
        );
        if (!rec) {
          await db?.insert(dailySalesRecords).values({
            branchId: effectiveBranchId,
            date: input.date,
            cash: String(cash),
            card: String(card),
            expenses,
            totalRevenue: String(settlement.totalRevenue),
            commissionExpense: String(settlement.commissionExpense),
            rentExpense: String(settlement.rentExpense),
            managementFeeExpense: String(settlement.managementFeeExpense),
            staffWageExpense: String(settlement.staffWageExpense),
            partTimeWageExpense: String(settlement.partTimeWageExpense),
            liquorCostExpense: String(settlement.liquorCostExpense),
            staffDrinkExpense: String(settlement.staffDrinkExpense),
            otherExpense: String(settlement.otherExpense),
            totalExpenses: String(settlement.totalExpenses),
            netProfit: String(settlement.netProfit),
            staffCount: sc,
            partTimeCount: pc,
            submittedAt: /* @__PURE__ */ new Date()
          });
        } else {
          await saveDailySettlementRecord(effectiveBranchId, input.date, settlement);
        }
      } catch (e) {
        console.error("[\uD14C\uC774\uBE14 \uC800\uC7A5 \uD6C4 \uC815\uC0B0 \uC7AC\uACC4\uC0B0 \uC624\uB958]", e);
      }
      return { id: reportId, cashSum, cardSum };
    }),
    // 테이블 항목 추가
    addItem: publicProcedure.input(z4.object({
      tableReportId: z4.number(),
      tableNumber: z4.string(),
      guestType: z4.enum(["walking", "regular", "named"]).default("walking"),
      guestName: z4.string().optional(),
      amount: z4.string().default("0"),
      paymentMethod: z4.enum(["card", "cash", "\uCE74\uB4DC", "\uD604\uAE08"]).default("card"),
      memo: z4.string().optional(),
      sortOrder: z4.number().default(0)
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(tableItems).values({
        tableReportId: input.tableReportId,
        tableNumber: input.tableNumber,
        guestType: input.guestType,
        guestName: input.guestName || null,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        memo: input.memo || null,
        sortOrder: input.sortOrder
      });
      return { id: result.insertId };
    }),
    // 테이블 항목 수정
    updateItem: publicProcedure.input(z4.object({
      id: z4.number(),
      tableNumber: z4.string().optional(),
      guestType: z4.enum(["walking", "regular", "named"]).optional(),
      guestName: z4.string().optional().nullable(),
      amount: z4.string().optional(),
      paymentMethod: z4.enum(["card", "cash"]).optional(),
      memo: z4.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...rest } = input;
      const updateData = {};
      if (rest.tableNumber !== void 0) updateData.tableNumber = rest.tableNumber;
      if (rest.guestType !== void 0) updateData.guestType = rest.guestType;
      if (rest.guestName !== void 0) updateData.guestName = rest.guestName;
      if (rest.amount !== void 0) updateData.amount = rest.amount;
      if (rest.paymentMethod !== void 0) updateData.paymentMethod = rest.paymentMethod;
      if (rest.memo !== void 0) updateData.memo = rest.memo;
      await db.update(tableItems).set(updateData).where(eq6(tableItems.id, id));
      return { success: true };
    }),
    // 테이블 항목 삭제
    deleteItem: publicProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(tableItems).where(eq6(tableItems.id, input.id));
      return { success: true };
    }),
    // 두 테이블 항목 합치기 (분할 결제 대응)
    // targetItemId: 남길 테이블 항목 ID, sourceItemId: 합쳐지고 삭제될 테이블 항목 ID
    mergeItems: publicProcedure.input(z4.object({
      targetItemId: z4.number(),
      // 남길 항목
      sourceItemId: z4.number(),
      // 합쳐지고 삭제될 항목
      tableReportId: z4.number(),
      // 소속 tableReport ID (누적금 재계산용)
      date: z4.string(),
      // YYYY-MM-DD (누적금 재계산용)
      branchId: z4.number().optional()
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError5({ code: "FORBIDDEN" });
      const [target] = await db.select().from(tableItems).where(eq6(tableItems.id, input.targetItemId)).limit(1);
      const [source] = await db.select().from(tableItems).where(eq6(tableItems.id, input.sourceItemId)).limit(1);
      if (!target || !source) throw new TRPCError5({ code: "NOT_FOUND", message: "\uD56D\uBAA9\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4" });
      if (target.tableReportId !== source.tableReportId) {
        throw new TRPCError5({ code: "BAD_REQUEST", message: "\uAC19\uC740 \uB0A0\uC9DC\uC758 \uD56D\uBAA9\uB9CC \uD569\uCE60 \uC218 \uC788\uC2B5\uB2C8\uB2E4" });
      }
      const mergedAmount = String(Number(target.amount || 0) + Number(source.amount || 0));
      const targetMemo = (target.memo ?? "").trim();
      const sourceMemo = (source.memo ?? "").trim();
      let mergedMemo = null;
      if (targetMemo && sourceMemo) {
        mergedMemo = targetMemo + "<br>" + sourceMemo;
      } else if (targetMemo) {
        mergedMemo = targetMemo;
      } else if (sourceMemo) {
        mergedMemo = sourceMemo;
      }
      await db.update(tableItems).set({
        amount: mergedAmount,
        memo: mergedMemo
      }).where(eq6(tableItems.id, input.targetItemId));
      await db.delete(tableItems).where(eq6(tableItems.id, input.sourceItemId));
      const effectiveBranchId = account.role === "admin" ? input.branchId ?? account.branchId ?? null : account.branchId ?? null;
      if (effectiveBranchId) {
        const allItems = await db.select().from(tableItems).where(eq6(tableItems.tableReportId, input.tableReportId));
        const cashSum = allItems.filter((it) => it.paymentMethod === "cash").reduce((s, it) => s + Number(it.amount || 0), 0);
        const cardSum = allItems.filter((it) => it.paymentMethod === "card").reduce((s, it) => s + Number(it.amount || 0), 0);
        await db.update(tableReports).set({
          cashAmount: String(cashSum),
          cardAmount: String(cardSum)
        }).where(eq6(tableReports.id, input.tableReportId));
        const existingSales = await getDailySalesRecord(effectiveBranchId, input.date);
        const prevRec = await getPrevDailySalesRecord(effectiveBranchId, input.date);
        const { cashTotal, cardTotal } = await computeCumulativesForDate(effectiveBranchId, input.date, prevRec ?? null, cashSum, cardSum);
        await upsertDailySalesRecord({
          branchId: effectiveBranchId,
          date: input.date,
          posStartAmount: existingSales?.posStartAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || "0") || 0),
          cash: String(cashSum),
          card: String(cardSum),
          cashTotal: String(cashTotal),
          cardTotal: String(cardTotal),
          posEndAmount: existingSales?.posEndAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || "0") || 0),
          expenses: existingSales?.expenses ?? [],
          submittedAt: /* @__PURE__ */ new Date()
        });
        try {
          await cascadeUpdateCumulativeAmounts(effectiveBranchId, input.date);
        } catch (e) {
          console.error("[mergeItems cascade \uC624\uB958]", e);
        }
      }
      return { success: true, mergedAmount, mergedMemo };
    }),
    // 직원 인센티브 추가
    addIncentive: publicProcedure.input(z4.object({
      tableReportId: z4.number(),
      staffName: z4.string(),
      glassCount: z4.number().default(0),
      bottleCount: z4.number().default(0),
      beerBottleCount: z4.number().default(0),
      salesIncentive: z4.string().default("0"),
      workStart: z4.string().optional(),
      workEnd: z4.string().optional(),
      sortOrder: z4.number().default(0)
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      const [result] = await db.insert(staffIncentives).values(input);
      return { id: result.insertId };
    }),
    // 직원 인센티브 수정
    updateIncentive: publicProcedure.input(z4.object({
      id: z4.number(),
      staffName: z4.string().optional(),
      glassCount: z4.number().optional(),
      bottleCount: z4.number().optional(),
      beerBottleCount: z4.number().optional(),
      salesIncentive: z4.string().optional(),
      workStart: z4.string().optional(),
      workEnd: z4.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...rest } = input;
      const updateData = {};
      if (rest.staffName !== void 0) updateData.staffName = rest.staffName;
      if (rest.glassCount !== void 0) updateData.glassCount = rest.glassCount;
      if (rest.bottleCount !== void 0) updateData.bottleCount = rest.bottleCount;
      if (rest.beerBottleCount !== void 0) updateData.beerBottleCount = rest.beerBottleCount;
      if (rest.salesIncentive !== void 0) updateData.salesIncentive = rest.salesIncentive;
      if (rest.workStart !== void 0) updateData.workStart = rest.workStart;
      if (rest.workEnd !== void 0) updateData.workEnd = rest.workEnd;
      await db.update(staffIncentives).set(updateData).where(eq6(staffIncentives.id, id));
      return { success: true };
    }),
    // 직원 인센티브 삭제
    deleteIncentive: publicProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(staffIncentives).where(eq6(staffIncentives.id, input.id));
      return { success: true };
    }),
    // 배치 저장 API - 한 번의 요청으로 report + 항목 + 인센티브 모두 저장
    batchSave: publicProcedure.input(z4.object({
      date: z4.string(),
      teamCount: z4.number().default(0),
      notes: z4.string().optional(),
      branchId: z4.number().optional(),
      items: z4.array(z4.object({
        id: z4.number().optional(),
        localId: z4.string(),
        tableNumber: z4.string(),
        guestType: z4.enum(["walking", "regular", "named"]).default("walking"),
        guestName: z4.string().optional().nullable(),
        amount: z4.string().default("0"),
        paymentMethod: z4.enum(["card", "cash", "\uCE74\uB4DC", "\uD604\uAE08"]).default("card"),
        memo: z4.string().optional(),
        sortOrder: z4.number().default(0)
      })),
      incentives: z4.array(z4.object({
        id: z4.number().optional(),
        localId: z4.string(),
        staffName: z4.string(),
        staffType: z4.enum(["staff", "parttime", "manager", "deputy"]).default("staff"),
        glassCount: z4.number().default(0),
        bottleCount: z4.number().default(0),
        beerBottleCount: z4.number().default(0),
        salesIncentive: z4.string().default("0"),
        workStart: z4.string().optional(),
        workEnd: z4.string().optional(),
        sortOrder: z4.number().default(0)
      }))
    })).mutation(async ({ ctx, input }) => {
      process.stdout.write("[batchSave] \uC9C4\uC785 date=" + input.date + "\n");
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      if (!account) throw new TRPCError5({ code: "FORBIDDEN", message: "\uC9C0\uC810 \uACC4\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const effectiveBranchId = account.branchId ?? input.branchId;
      if (!effectiveBranchId) throw new TRPCError5({ code: "FORBIDDEN", message: "\uC9C0\uC810 \uC815\uBCF4\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const [existing] = await db.select().from(tableReports).where(and5(eq6(tableReports.branchId, effectiveBranchId), eq6(tableReports.date, input.date))).limit(1);
      let reportId;
      if (existing) {
        await db.update(tableReports).set({
          teamCount: input.teamCount,
          notes: input.notes || null
        }).where(eq6(tableReports.id, existing.id));
        reportId = existing.id;
      } else {
        const [result] = await db.insert(tableReports).values({
          branchId: effectiveBranchId,
          date: input.date,
          teamCount: input.teamCount,
          notes: input.notes || null
        });
        reportId = result.insertId;
      }
      const itemIdMap = {};
      const validItems = input.items.filter((it) => it.tableNumber || it.amount || it.memo);
      const itemsToUpdate = validItems.filter((it) => it.id);
      const itemsToInsert = validItems.filter((it) => !it.id);
      await Promise.all(itemsToUpdate.map(async (it) => {
        await db.update(tableItems).set({
          tableNumber: it.tableNumber,
          guestType: it.guestType,
          guestName: it.guestName ?? null,
          amount: it.amount || "0",
          paymentMethod: it.paymentMethod,
          memo: it.memo || null,
          sortOrder: it.sortOrder
        }).where(eq6(tableItems.id, it.id));
        itemIdMap[it.localId] = it.id;
      }));
      for (const it of itemsToInsert) {
        const [result] = await db.insert(tableItems).values({
          tableReportId: reportId,
          tableNumber: it.tableNumber,
          guestType: it.guestType,
          guestName: it.guestName ?? null,
          amount: it.amount || "0",
          paymentMethod: it.paymentMethod,
          memo: it.memo || null,
          sortOrder: it.sortOrder
        });
        itemIdMap[it.localId] = result.insertId;
      }
      const incentiveIdMap = {};
      const validIncentives = input.incentives.filter((inc) => inc.staffName);
      const incentivesToUpdate = validIncentives.filter((inc) => inc.id);
      const incentivesToInsert = validIncentives.filter((inc) => !inc.id);
      const existingIncentives = await db.select().from(staffIncentives).where(eq6(staffIncentives.tableReportId, reportId));
      const incomingIds = new Set(validIncentives.filter((inc) => inc.id).map((inc) => inc.id));
      const toDelete = existingIncentives.filter((inc) => !incomingIds.has(inc.id));
      if (toDelete.length > 0) {
        await Promise.all(toDelete.map((inc) => db.delete(staffIncentives).where(eq6(staffIncentives.id, inc.id))));
      }
      await Promise.all(incentivesToUpdate.map(async (inc) => {
        await db.update(staffIncentives).set({
          staffName: inc.staffName,
          staffType: inc.staffType,
          glassCount: inc.glassCount,
          bottleCount: inc.bottleCount,
          beerBottleCount: inc.beerBottleCount,
          salesIncentive: inc.salesIncentive || "0",
          workStart: inc.workStart || null,
          workEnd: inc.workEnd || null
        }).where(eq6(staffIncentives.id, inc.id));
        incentiveIdMap[inc.localId] = inc.id;
      }));
      for (const inc of incentivesToInsert) {
        const [result] = await db.insert(staffIncentives).values({
          tableReportId: reportId,
          staffName: inc.staffName,
          staffType: inc.staffType,
          glassCount: inc.glassCount,
          bottleCount: inc.bottleCount,
          beerBottleCount: inc.beerBottleCount,
          salesIncentive: inc.salesIncentive || "0",
          workStart: inc.workStart || null,
          workEnd: inc.workEnd || null,
          sortOrder: inc.sortOrder
        });
        incentiveIdMap[inc.localId] = result.insertId;
      }
      const allItems = await db.select().from(tableItems).where(eq6(tableItems.tableReportId, reportId));
      const cashSum = allItems.filter((it) => it.paymentMethod === "cash" || it.paymentMethod === "\uD604\uAE08").reduce((s, it) => s + Number(it.amount || 0), 0);
      const cardSum = allItems.filter((it) => it.paymentMethod === "card" || it.paymentMethod === "\uCE74\uB4DC").reduce((s, it) => s + Number(it.amount || 0), 0);
      await db.update(tableReports).set({
        cashAmount: String(cashSum),
        cardAmount: String(cardSum)
      }).where(eq6(tableReports.id, reportId));
      const existingSales = await getDailySalesRecord(effectiveBranchId, input.date);
      const prevRec = await getPrevDailySalesRecord(effectiveBranchId, input.date);
      const { cashTotal: computedCashTotal, cardTotal: computedCardTotal } = await computeCumulativesForDate(
        effectiveBranchId,
        input.date,
        prevRec ?? null,
        cashSum,
        cardSum
      );
      await upsertDailySalesRecord({
        branchId: effectiveBranchId,
        date: input.date,
        posStartAmount: existingSales?.posStartAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || "0") || 0),
        cash: String(cashSum),
        card: String(cardSum),
        cashTotal: String(computedCashTotal),
        cardTotal: String(computedCardTotal),
        posEndAmount: existingSales?.posEndAmount ?? String(parseInt((await getPrevDailySalesRecordWithPosEnd(effectiveBranchId, input.date))?.posEndAmount || "0") || 0),
        cashDeposit: existingSales?.cashDeposit ?? "0",
        posEndAmount: existingSales?.posEndAmount ?? "0",
        expenses: existingSales?.expenses ?? [],
        submittedAt: /* @__PURE__ */ new Date()
      });
      try {
        await cascadeUpdateCumulativeAmounts(effectiveBranchId, input.date);
      } catch (e) {
        console.error("[cascadeUpdateCumulativeAmounts \uC624\uB958]", e);
      }
      try {
        await cascadeUpdatePosAmounts(effectiveBranchId, input.date);
      } catch (e) {
        console.error("[cascadeUpdatePosAmounts \uC624\uB958]", e);
      }
      try {
        const db2 = await getDb();
        const salesRec2 = db2 ? await db2.select().from(dailySalesRecords).where(and5(eq6(dailySalesRecords.branchId, effectiveBranchId), eq6(dailySalesRecords.date, input.date))).limit(1) : [];
        const rec22 = salesRec2 && salesRec2.length > 0 ? salesRec2[0] : null;
        const validInc2 = input.incentives.filter((inc) => inc.staffName);
        const sc2 = validInc2.filter((i) => i.staffType === "staff").length;
        const pc2 = validInc2.filter((i) => i.staffType === "parttime").length;
        const mc2 = validInc2.filter((i) => i.staffType === "manager").length;
        const dc2 = validInc2.filter((i) => i.staffType === "deputy").length;
        let pth2 = 0;
        for (const inc of validInc2.filter((i) => i.staffType === "parttime")) {
          if (inc.workStart && inc.workEnd) {
            try {
              const [sh, sm] = inc.workStart.split(":").map(Number);
              const [eh, em] = inc.workEnd.split(":").map(Number);
              let startMin = sh * 60 + sm;
              let endMin = eh * 60 + em;
              if (endMin <= startMin) endMin += 24 * 60;
              pth2 += (endMin - startMin) / 60;
            } catch {
            }
          }
        }
        const cash2 = cashSum;
        const card2 = cardSum;
        const expenses2 = rec22 && Array.isArray(rec22.expenses) ? rec22.expenses : [];
        const GLASS_PRICE = 5e3;
        const BOTTLE_PRICE = 1e4;
        const BEER_PRICE = 3e3;
        const staffDrink2 = validInc2.reduce((sum, inc) => {
          return sum + Number(inc.glassCount || 0) * GLASS_PRICE + Number(inc.bottleCount || 0) * BOTTLE_PRICE + Number(inc.beerBottleCount || 0) * BEER_PRICE;
        }, 0);
        const salesIncentive2 = validInc2.reduce((sum, inc) => sum + Number(inc.salesIncentive || 0), 0);
        const bsForOther = db2 ? await db2.select().from(branchSettings).where(eq6(branchSettings.branchId, effectiveBranchId)).limit(1) : [];
        const monthlyFixed = bsForOther.length > 0 ? Number(bsForOther[0].monthlyFixedExpense || 0) : 0;
        const [yr, mo] = input.date.split("-").map(Number);
        const lastDay = new Date(yr, mo, 0).getDate();
        let bizDays = 0;
        for (let d = 1; d <= lastDay; d++) {
          if (new Date(yr, mo - 1, d).getDay() !== 0) bizDays++;
        }
        const dailyFixed = bizDays > 0 ? Math.round(monthlyFixed / bizDays) : 0;
        const webExpense2 = expenses2.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const otherExpense2 = dailyFixed + webExpense2;
        const settlement2 = await calculateDailySettlement(
          effectiveBranchId,
          input.date,
          cash2,
          card2,
          sc2,
          pc2,
          expenses2,
          reportId,
          mc2,
          pth2
        );
        if (!rec22) {
          if (cash2 > 0 || card2 > 0) {
            await db2?.insert(dailySalesRecords).values({
              branchId: effectiveBranchId,
              date: input.date,
              cash: String(cash2),
              card: String(card2),
              expenses: expenses2,
              totalRevenue: String(settlement2.totalRevenue),
              commissionExpense: String(settlement2.commissionExpense),
              rentExpense: String(settlement2.rentExpense),
              managementFeeExpense: String(settlement2.managementFeeExpense),
              staffWageExpense: String(settlement2.staffWageExpense),
              managerWageExpense: String(settlement2.managerWageExpense ?? 0),
              partTimeWageExpense: String(settlement2.partTimeWageExpense),
              liquorCostExpense: String(settlement2.liquorCostExpense),
              staffDrinkExpense: String(staffDrink2 || settlement2.staffDrinkExpense),
              salesIncentiveExpense: String(salesIncentive2),
              otherExpense: String(otherExpense2 || settlement2.otherExpense),
              totalExpenses: String(
                settlement2.commissionExpense + settlement2.rentExpense + settlement2.managementFeeExpense + settlement2.staffWageExpense + (settlement2.managerWageExpense ?? 0) + settlement2.partTimeWageExpense + settlement2.liquorCostExpense + (staffDrink2 || settlement2.staffDrinkExpense) + salesIncentive2 + (otherExpense2 || settlement2.otherExpense)
              ),
              netProfit: String(
                settlement2.totalRevenue - (settlement2.commissionExpense + settlement2.rentExpense + settlement2.managementFeeExpense + settlement2.staffWageExpense + (settlement2.managerWageExpense ?? 0) + settlement2.partTimeWageExpense + settlement2.liquorCostExpense + (staffDrink2 || settlement2.staffDrinkExpense) + salesIncentive2 + (otherExpense2 || settlement2.otherExpense))
              ),
              staffCount: sc2,
              partTimeCount: pc2,
              submittedAt: /* @__PURE__ */ new Date()
            });
          }
        } else {
          await db2?.update(dailySalesRecords).set({
            totalRevenue: String(settlement2.totalRevenue),
            commissionExpense: String(settlement2.commissionExpense),
            rentExpense: String(settlement2.rentExpense),
            managementFeeExpense: String(settlement2.managementFeeExpense),
            staffWageExpense: String(settlement2.staffWageExpense),
            managerWageExpense: String(settlement2.managerWageExpense ?? 0),
            partTimeWageExpense: String(settlement2.partTimeWageExpense),
            liquorCostExpense: String(settlement2.liquorCostExpense),
            staffDrinkExpense: String(staffDrink2 || settlement2.staffDrinkExpense),
            salesIncentiveExpense: String(salesIncentive2),
            otherExpense: String(otherExpense2 || settlement2.otherExpense),
            totalExpenses: String(
              settlement2.commissionExpense + settlement2.rentExpense + settlement2.managementFeeExpense + settlement2.staffWageExpense + (settlement2.managerWageExpense ?? 0) + settlement2.partTimeWageExpense + settlement2.liquorCostExpense + (staffDrink2 || settlement2.staffDrinkExpense) + salesIncentive2 + (otherExpense2 || settlement2.otherExpense)
            ),
            netProfit: String(
              settlement2.totalRevenue - (settlement2.commissionExpense + settlement2.rentExpense + settlement2.managementFeeExpense + settlement2.staffWageExpense + (settlement2.managerWageExpense ?? 0) + settlement2.partTimeWageExpense + settlement2.liquorCostExpense + (staffDrink2 || settlement2.staffDrinkExpense) + salesIncentive2 + (otherExpense2 || settlement2.otherExpense))
            ),
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq6(dailySalesRecords.id, rec22.id));
        }
      } catch (e) {
        console.error("[\uD14C\uC774\uBE14 \uC800\uC7A5 \uD6C4 \uC815\uC0B0 \uC7AC\uACC4\uC0B0 \uC624\uB958]", e);
        return { id: reportId, cashSum, cardSum, itemIdMap, incentiveIdMap, settlementResult: null, settlementError: String(e?.message || e) };
      }
      const verifyRec = await db?.select().from(dailySalesRecords).where(and5(eq6(dailySalesRecords.branchId, effectiveBranchId), eq6(dailySalesRecords.date, input.date))).limit(1);
      const settlementResult = verifyRec && verifyRec.length > 0 ? {
        managerWageExpense: String(verifyRec[0].managerWageExpense),
        netProfit: String(verifyRec[0].netProfit),
        totalRevenue: String(verifyRec[0].totalRevenue),
        debugIncCount: input.incentives.filter((i) => i.staffName).length,
        debugManagerCount: input.incentives.filter((i) => i.staffType === "manager" || i.staffType === "deputy").length
      } : { debugIncCount: input.incentives.length, debugManagerCount: input.incentives.filter((i) => i.staffType === "manager" || i.staffType === "deputy").length, managerWageExpense: "?", netProfit: "?", totalRevenue: "?" };
      return { id: reportId, cashSum, cardSum, itemIdMap, incentiveIdMap, settlementResult, settlementError: null };
    }),
    // 직원별 월간 인센티브 집계
    staffIncentiveStats: publicProcedure.input(z4.object({
      yearMonth: z4.string(),
      // 'YYYY-MM'
      branchId: z4.number().optional()
      // 없으면 전체 지점
    })).query(async ({ input, ctx }) => {
      const account = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!account) throw new TRPCError5({ code: "UNAUTHORIZED" });
      const db = await getDb();
      if (!db) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR" });
      function getBaseMondayOfMonth(ym) {
        const [y, m] = ym.split("-").map(Number);
        const firstDay = new Date(y, m - 1, 1);
        const dayOfWeek = firstDay.getDay();
        const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        return new Date(y, m - 1, 1 - daysSinceMonday);
      }
      const [rangeY, rangeM] = input.yearMonth.split("-").map(Number);
      const lastDayOfMonth = new Date(rangeY, rangeM, 0);
      const baseMondayOfMonth = getBaseMondayOfMonth(input.yearMonth);
      const lastDayOfWeek = lastDayOfMonth.getDay();
      const daysUntilSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
      const rangeEnd = new Date(lastDayOfMonth);
      rangeEnd.setDate(rangeEnd.getDate() + daysUntilSunday);
      const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const rangeStartStr = fmt(baseMondayOfMonth);
      const rangeEndStr = fmt(rangeEnd);
      const fullAccount = await getStoreAccountById(account.accountId);
      if (!fullAccount) throw new TRPCError5({ code: "UNAUTHORIZED" });
      const targetBranchId = account.role === "admin" ? input.branchId ?? null : fullAccount.branchId;
      const prefix = `${input.yearMonth}-%`;
      const rows = await db.select({
        staffName: staffIncentives.staffName,
        staffType: staffIncentives.staffType,
        totalGlass: sql`SUM(${staffIncentives.glassCount})`,
        totalBottle: sql`SUM(${staffIncentives.bottleCount})`,
        totalBeerBottle: sql`SUM(${staffIncentives.beerBottleCount})`,
        totalSalesIncentive: sql`SUM(CAST(NULLIF(${staffIncentives.salesIncentive}, '') AS DECIMAL(15,0)))`,
        workDays: sql`COUNT(DISTINCT ${tableReports.date})`
      }).from(staffIncentives).innerJoin(tableReports, eq6(staffIncentives.tableReportId, tableReports.id)).where(
        targetBranchId !== null ? and5(like(tableReports.date, prefix), eq6(tableReports.branchId, targetBranchId)) : like(tableReports.date, prefix)
      ).groupBy(staffIncentives.staffName, staffIncentives.staffType).orderBy(staffIncentives.staffType, staffIncentives.staffName);
      const detailRows = await db.select({
        staffName: staffIncentives.staffName,
        staffType: staffIncentives.staffType,
        date: tableReports.date,
        workStart: staffIncentives.workStart,
        workEnd: staffIncentives.workEnd
      }).from(staffIncentives).innerJoin(tableReports, eq6(staffIncentives.tableReportId, tableReports.id)).where(
        targetBranchId !== null ? and5(gte4(tableReports.date, rangeStartStr), lte4(tableReports.date, rangeEndStr), eq6(tableReports.branchId, targetBranchId)) : and5(gte4(tableReports.date, rangeStartStr), lte4(tableReports.date, rangeEndStr))
      ).orderBy(tableReports.date);
      function calcWorkMinutes(start, end) {
        if (!start || !end) return 0;
        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);
        if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
        let startMin = sh * 60 + sm;
        let endMin = eh * 60 + em;
        if (endMin <= startMin) endMin += 24 * 60;
        return endMin - startMin;
      }
      function getWeekLabel(date) {
        const d = /* @__PURE__ */ new Date(date + "T00:00:00");
        const diffMs = d.getTime() - baseMondayOfMonth.getTime();
        const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
        const weekNum = Math.floor(diffDays / 7);
        const weekStart = new Date(baseMondayOfMonth.getTime() + weekNum * 7 * 24 * 60 * 60 * 1e3);
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1e3);
        const fmt2 = (d2) => `${d2.getMonth() + 1}/${d2.getDate()}`;
        return `${fmt2(weekStart)}~${fmt2(weekEnd)}`;
      }
      const staffWeeklyMap = {};
      const staffWeeklyDaysMap = {};
      const staffInMonthMinutes = {};
      const staffInMonthDays = {};
      for (const row of detailRows) {
        const key = `${row.staffName}__${row.staffType}`;
        const mins = calcWorkMinutes(row.workStart, row.workEnd);
        if (!staffWeeklyMap[key]) staffWeeklyMap[key] = {};
        if (!staffWeeklyDaysMap[key]) staffWeeklyDaysMap[key] = {};
        const weekLabel = getWeekLabel(row.date);
        staffWeeklyMap[key][weekLabel] = (staffWeeklyMap[key][weekLabel] || 0) + mins;
        staffWeeklyDaysMap[key][weekLabel] = (staffWeeklyDaysMap[key][weekLabel] || 0) + 1;
        if (row.date.startsWith(input.yearMonth)) {
          staffInMonthMinutes[key] = (staffInMonthMinutes[key] || 0) + mins;
          staffInMonthDays[key] = (staffInMonthDays[key] || 0) + 1;
        }
      }
      const GLASS_PRICE = 5e3;
      const BOTTLE_PRICE = 1e4;
      const BEER_PRICE = 3e3;
      const weekLabelSet = new Set(detailRows.map((r) => getWeekLabel(r.date)));
      const allWeekLabels = Array.from(weekLabelSet).sort((a, b) => {
        const dateA = detailRows.find((r) => getWeekLabel(r.date) === a)?.date ?? "";
        const dateB = detailRows.find((r) => getWeekLabel(r.date) === b)?.date ?? "";
        return dateA.localeCompare(dateB);
      });
      const result = rows.map((row) => {
        const name = row.staffName;
        const key = `${name}__${row.staffType}`;
        const glass = Number(row.totalGlass) || 0;
        const bottle = Number(row.totalBottle) || 0;
        const beer = Number(row.totalBeerBottle) || 0;
        const salesInc = Number(row.totalSalesIncentive) || 0;
        const incentiveAmount = glass * GLASS_PRICE + bottle * BOTTLE_PRICE + beer * BEER_PRICE + salesInc;
        const totalMins = staffInMonthMinutes[key] || 0;
        const weeklyHours = staffWeeklyMap[key] || {};
        const weekCount = Object.keys(weeklyHours).length || 1;
        const avgWeeklyIncentive = Math.round(incentiveAmount / weekCount);
        const workDays = staffInMonthDays[key] || 0;
        const standardMinutes = workDays * 420;
        const workDiffMinutes = totalMins - standardMinutes;
        return {
          ...row,
          incentiveAmount,
          workDays,
          totalWorkMinutes: totalMins,
          standardMinutes,
          workDiffMinutes,
          weeklyWorkMinutes: weeklyHours,
          // { '4/6~4/12': 분수 }
          weeklyWorkDays: staffWeeklyDaysMap[key] || {},
          // { '4/6~4/12': 출근일수 }
          avgWeeklyIncentive
        };
      });
      return { stats: result, weekLabels: allWeekLabels };
    }),
    // 지점 메모에서 형광펜 패턴 추출 (앱 로드 시 사전 학습용)
    getHighlightPatterns: publicProcedure.input(z4.object({
      branchId: z4.number().optional()
    })).query(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const account = await getStoreAccountById(payload.accountId);
      const effectiveBranchId = input.branchId ?? account?.branchId ?? null;
      let yellowKeywords = [];
      let pinkKeywords = [];
      let recentMemoExamples = [];
      if (effectiveBranchId) {
        try {
          const db = await getDb();
          if (db) {
            const cutoffDate = /* @__PURE__ */ new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 90);
            const cutoff = formatKstDateString(cutoffDate);
            const recentItems = await db.select({ memo: tableItems.memo }).from(tableItems).innerJoin(tableReports, eq6(tableItems.tableReportId, tableReports.id)).where(
              and5(
                eq6(tableReports.branchId, effectiveBranchId),
                sql`${tableReports.date} >= ${cutoff}`,
                sql`${tableItems.memo} IS NOT NULL`,
                sql`${tableItems.memo} != ''`
              )
            ).orderBy(desc3(tableReports.date)).limit(200);
            const yellowSet = /* @__PURE__ */ new Set();
            const pinkSet = /* @__PURE__ */ new Set();
            for (const row of recentItems) {
              const memo = row.memo ?? "";
              const yMatches = Array.from(memo.matchAll(/<mark[^>]*rgb\(255,\s*224,\s*102\)[^>]*>([\s\S]*?)<\/mark>/g));
              for (const m of yMatches) {
                const text2 = m[1].replace(/<[^>]+>/g, "").trim();
                if (text2 && text2.length > 0 && text2.length < 30) yellowSet.add(text2);
              }
              const pMatches = Array.from(memo.matchAll(/<mark[^>]*rgb\(216,\s*180,\s*254\)[^>]*>([\s\S]*?)<\/mark>/g));
              for (const m of pMatches) {
                const text2 = m[1].replace(/<[^>]+>/g, "").trim();
                const parts = text2.split(/[,，]/).map((p) => p.trim()).filter((p) => p.length > 0 && p.length < 15);
                for (const p of parts) {
                  const nameMatch = p.match(/^([가-힣a-zA-Z]+)\d*$/);
                  if (nameMatch) pinkSet.add(nameMatch[1]);
                  else if (/^[가-힣a-zA-Z]{1,6}$/.test(p)) pinkSet.add(p);
                }
              }
              if (recentMemoExamples.length < 10) {
                const cleanMemo = memo.replace(/<[^>]+>/g, "").trim();
                if (cleanMemo) recentMemoExamples.push(cleanMemo);
              }
            }
            const YELLOW_BLACKLIST = ["\uBB34\uC81C\uD55C", "\uC5F0\uC7A5", "\uAE30\uBCF8", "\uCD94\uAC00", "\uC11C\uBE44\uC2A4", "\uD3EC\uC7A5", "\uD14C\uC774\uBE14", "\uB8F8", "\uC794\uC220", "\uC794"];
            yellowKeywords = Array.from(yellowSet).filter((kw) => !YELLOW_BLACKLIST.some((bl) => kw.includes(bl))).slice(0, 50);
            pinkKeywords = Array.from(pinkSet).slice(0, 50);
          }
        } catch (e) {
          console.error("[getHighlightPatterns] \uC624\uB958:", e);
        }
      }
      return { yellowKeywords, pinkKeywords, recentMemoExamples, branchId: effectiveBranchId };
    }),
    // 포스기 주문내역 사진에서 주문메모 텍스트 자동 추출 (이전 기록 참고 형광펜 + 금액 계산)
    analyzeOrderMemo: publicProcedure.input(z4.object({
      imageBase64: z4.string(),
      mimeType: z4.string().default("image/jpeg"),
      branchId: z4.number().optional(),
      date: z4.string().optional(),
      // 클라이언트에서 사전 로드된 패턴 (있으면 DB 재조회 생략)
      preloadedYellow: z4.array(z4.string()).optional(),
      preloadedPink: z4.array(z4.string()).optional(),
      preloadedExamples: z4.array(z4.string()).optional(),
      // [추가] 사용자 학습형 형광펜 제외 단어
      //   - 클라이언트에서 사용자가 mark를 지운 횟수를 누적하여 임계값을 넘은 단어 목록.
      //   - 서버 단에서 keyword 후보 및 LLM 프롬프트의 절대 형광펜 금지 항목에 포함시킨다.
      excludedYellow: z4.array(z4.string()).optional(),
      excludedPink: z4.array(z4.string()).optional()
    })).mutation(async ({ ctx, input }) => {
      const payload = await parseStoreCookie3(ctx.req.headers.cookie, ctx.req.headers.authorization);
      if (!payload) throw new TRPCError5({ code: "UNAUTHORIZED", message: "\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4" });
      const imageDataUrl = input.imageBase64.startsWith("data:") ? input.imageBase64 : `data:${input.mimeType};base64,${input.imageBase64}`;
      const account = await getStoreAccountById(payload.accountId);
      const effectiveBranchId = input.branchId ?? account?.branchId ?? null;
      let yellowKeywords = input.preloadedYellow ?? [];
      let pinkKeywords = input.preloadedPink ?? [];
      let recentMemoExamples = input.preloadedExamples ?? [];
      const excludedYellowSet = new Set((input.excludedYellow ?? []).map((s) => s.trim()).filter(Boolean));
      const excludedPinkSet = new Set((input.excludedPink ?? []).map((s) => s.trim()).filter(Boolean));
      const hasPreloaded = (input.preloadedYellow?.length ?? 0) > 0 || (input.preloadedPink?.length ?? 0) > 0;
      if (effectiveBranchId && !hasPreloaded) {
        try {
          const db = await getDb();
          if (db) {
            const cutoffDate = /* @__PURE__ */ new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 60);
            const cutoff = formatKstDateString(cutoffDate);
            const recentItems = await db.select({ memo: tableItems.memo, amount: tableItems.amount }).from(tableItems).innerJoin(tableReports, eq6(tableItems.tableReportId, tableReports.id)).where(
              and5(
                eq6(tableReports.branchId, effectiveBranchId),
                sql`${tableReports.date} >= ${cutoff}`,
                sql`${tableItems.memo} IS NOT NULL`,
                sql`${tableItems.memo} != ''`
              )
            ).orderBy(desc3(tableReports.date)).limit(80);
            const yellowSet = /* @__PURE__ */ new Set();
            const pinkSet = /* @__PURE__ */ new Set();
            for (const row of recentItems) {
              const memo = row.memo ?? "";
              const yMatches = Array.from(memo.matchAll(/<mark[^>]*rgb\(255,\s*224,\s*102\)[^>]*>([\s\S]*?)<\/mark>/g));
              for (const m of yMatches) {
                const text2 = m[1].replace(/<[^>]+>/g, "").trim();
                if (text2 && text2.length > 0 && text2.length < 30) yellowSet.add(text2);
              }
              const pMatches = Array.from(memo.matchAll(/<mark[^>]*rgb\(216,\s*180,\s*254\)[^>]*>([\s\S]*?)<\/mark>/g));
              for (const m of pMatches) {
                const text2 = m[1].replace(/<[^>]+>/g, "").trim();
                const parts = text2.split(/[,，]/).map((p) => p.trim()).filter((p) => p.length > 0 && p.length < 15);
                for (const p of parts) {
                  const nameMatch = p.match(/^([가-힣a-zA-Z]+)\d*$/);
                  if (nameMatch) pinkSet.add(nameMatch[1]);
                  else if (/^[가-힣a-zA-Z]{1,6}$/.test(p)) pinkSet.add(p);
                }
              }
              if (recentMemoExamples.length < 8) {
                const cleanMemo = memo.replace(/<[^>]+>/g, "").trim();
                if (cleanMemo) recentMemoExamples.push(cleanMemo);
              }
            }
            const YELLOW_BLACKLIST = ["\uBB34\uC81C\uD55C", "\uC5F0\uC7A5", "\uAE30\uBCF8", "\uCD94\uAC00", "\uC11C\uBE44\uC2A4", "\uD3EC\uC7A5", "\uD14C\uC774\uBE14", "\uB8F8", "\uC794\uC220", "\uC794"];
            yellowKeywords = Array.from(yellowSet).filter((kw) => !YELLOW_BLACKLIST.some((bl) => kw.includes(bl))).slice(0, 30);
            pinkKeywords = Array.from(pinkSet).slice(0, 30);
          }
        } catch (e) {
          console.error("[analyzeOrderMemo] \uC774\uC804 \uAE30\uB85D \uC870\uD68C \uC2E4\uD328:", e);
        }
      }
      const excludedYellowList = Array.from(excludedYellowSet).filter((w) => w.length > 0);
      const excludedPinkList = Array.from(excludedPinkSet).filter((w) => w.length > 0);
      const matchesAnyExcluded = (kw, list) => list.some((ex) => ex.length > 0 && (kw === ex || kw.includes(ex)));
      if (excludedYellowList.length > 0) {
        yellowKeywords = yellowKeywords.filter((kw) => !matchesAnyExcluded(kw, excludedYellowList));
      }
      if (excludedPinkList.length > 0) {
        pinkKeywords = pinkKeywords.filter((kw) => !matchesAnyExcluded(kw, excludedPinkList));
      }
      const userExcludedYellowList = Array.from(excludedYellowSet);
      const userExcludedPinkList = Array.from(excludedPinkSet);
      const userExcludeNote = userExcludedYellowList.length + userExcludedPinkList.length > 0 ? `

[\uC0AC\uC6A9\uC790 \uD559\uC2B5\uD615 \uD615\uAD11\uD39C \uC808\uB300 \uAE08\uC9C0 \uB2E8\uC5B4]
` + (userExcludedYellowList.length > 0 ? `- \uB178\uB780 \uD615\uAD11\uD39C \uAE08\uC9C0: ${userExcludedYellowList.join(", ")}
` : "") + (userExcludedPinkList.length > 0 ? `- \uBD84\uD64D \uD615\uAD11\uD39C \uAE08\uC9C0: ${userExcludedPinkList.join(", ")}
` : "") + `\uC704 \uB2E8\uC5B4\uB4E4\uC740 \uC0AC\uC6A9\uC790\uAC00 \uBC18\uBCF5\uC801\uC73C\uB85C \uD615\uAD11\uD39C\uC744 \uC81C\uAC70\uD55C \uB2E8\uC5B4\uC774\uBBC0\uB85C \uC808\uB300\uB85C mark \uD0DC\uADF8\uB97C \uC801\uC6A9\uD558\uC9C0 \uB9D0 \uAC83.` : "";
      const yellowGuide = yellowKeywords.length > 0 ? `\uB178\uB780 \uD615\uAD11\uD39C(<mark style="background: rgb(255, 224, 102); border-radius: 2px; padding: 0px 1px;">\uD14D\uC2A4\uD2B8</mark>): \uC8FC\uB958/\uC0F4\uD398\uC778/\uC704\uC2A4\uD0A4/\uB9E5\uC8FC \uB4F1\uC744 "\uBCD1" \uB2E8\uC704\uB85C \uC8FC\uBB38\uD55C \uACBD\uC6B0\uC5D0\uB9CC \uC801\uC6A9(\uC591\uC8FC\uB294 \uBC14\uD2C0, \uB9E5\uC8FC\uB3C4 \uBCD1\uC774\uBA74 \uD3EC\uD568). \uC794\uC220/\uAE00\uB77C\uC2A4/\uC0DD\uB9E5\uC8FC(\uB4DC\uB798\uD504\uD2B8 \uC794) \uB2E8\uC704 \uC8FC\uBB38\uC740 \uC808\uB300 \uB178\uB780 \uD615\uAD11\uD39C \uAE08\uC9C0. \uC774\uC804 \uAE30\uB85D\uC5D0\uC11C \uB178\uB780 \uD615\uAD11\uD39C\uC774 \uC801\uC6A9\uB41C \uD0A4\uC6CC\uB4DC \uC608\uC2DC: ${yellowKeywords.join(", ")}` : '\uB178\uB780 \uD615\uAD11\uD39C: \uC8FC\uB958/\uC0F4\uD398\uC778/\uC704\uC2A4\uD0A4/\uB9E5\uC8FC\uB97C "\uBCD1" \uB2E8\uC704\uB85C \uC8FC\uBB38\uD55C \uACBD\uC6B0\uC5D0\uB9CC \uC801\uC6A9 (\uC794\uC220/\uAE00\uB77C\uC2A4/\uC0DD\uB9E5\uC8FC\uC794 \uB2E8\uC704\uB294 \uC808\uB300 \uAE08\uC9C0)';
      const pinkGuide = pinkKeywords.length > 0 ? `\uBCF4\uB77C \uD615\uAD11\uD39C(<mark style="background: rgb(216, 180, 254); border-radius: 2px; padding: 0px 1px;">\uD14D\uC2A4\uD2B8</mark>): \uC9C1\uC6D0\uBA85(\uD638\uC2A4\uD2F0\uC2A4/\uC2A4\uD15D \uC774\uB984, \uC794\uCD94\uAC00 \uB4F1). \uC774\uC804 \uAE30\uB85D\uC5D0\uC11C \uBCF4\uB77C \uD615\uAD11\uD39C\uC774 \uC801\uC6A9\uB41C \uC9C1\uC6D0\uBA85 \uC608\uC2DC: ${pinkKeywords.join(", ")}` : "\uBCF4\uB77C \uD615\uAD11\uD39C: \uC9C1\uC6D0\uBA85(\uD638\uC2A4\uD2F0\uC2A4/\uC2A4\uD15D \uC774\uB984, \uC794\uCD94\uAC00 \uB4F1)\uC5D0 \uC801\uC6A9";
      const examplesGuide = recentMemoExamples.length > 0 ? `

\uC774\uC804 \uAE30\uB85D \uBA54\uBAA8 \uD615\uC2DD \uC608\uC2DC:
${recentMemoExamples.slice(0, 5).map((m) => `- ${m}`).join("\n")}` : "";
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `\uB2F9\uC2E0\uC740 \uD55C\uAD6D \uD074\uB7FD/\uBC14/\uB098\uC774\uD2B8\uC758 \uD3EC\uC2A4\uAE30 \uC8FC\uBB38\uB0B4\uC5ED \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD558\uB294 \uC804\uBB38\uAC00\uC785\uB2C8\uB2E4.
\uC774\uBBF8\uC9C0\uC5D0\uC11C \uC8FC\uBB38 \uD56D\uBAA9\uC744 \uCD94\uCD9C\uD558\uACE0, \uC774\uC804 \uAE30\uB85D \uD328\uD134\uC744 \uCC38\uACE0\uD558\uC5EC \uD615\uAD11\uD39C HTML\uC744 \uC801\uC6A9\uD55C \uBA54\uBAA8\uC640 \uCD1D \uAE08\uC561\uC744 \uACC4\uC0B0\uD569\uB2C8\uB2E4.

\uC218\uB7C9 \uD45C\uAE30 \uBCC0\uD658 \uADDC\uCE59 (\uCD5C\uC6B0\uC120):
- \uD3EC\uC2A4\uAE30\uC758 "x1", "X1", "\xD71", "*1" \uD615\uC2DD\uC744 \uBAA8\uB450 "(1)" \uAD04\uD638 \uD615\uC2DD\uC73C\uB85C \uBCC0\uD658
- \uC608: \uD788\uBE44\uD0A4x1 \u2192 \uD788\uBE44\uD0A4(1), \uBAA8\uC5E3x2 \u2192 \uBAA8\uC5E3(2), \uBC1C\uB80C17 X1 \u2192 \uBC1C\uB80C17(1)

\u26A0\uFE0F \uC815\uD655\uB3C4 \uCD5C\uC6B0\uC120 \uADDC\uCE59 (\uB9E4\uC6B0 \uC911\uC694):
- \uC774\uBBF8\uC9C0\uC5D0 \uC2E4\uC81C\uB85C \uC801\uD78C \uAE00\uC790\uB9CC \uADF8\uB300\uB85C \uC62E\uACA8 \uC801\uC744 \uAC83. \uC774\uC804\uC5D0 \uBCF8 \uC801 \uC788\uB294 \uBA54\uB274 \uC774\uB984\uC774\uB098 \uD328\uD134\uC744 \uB5A0\uC62C\uB824\uC11C \uBE44\uC2B7\uD558\uAC8C \uCC44\uC6CC\uB123\uC9C0 \uB9D0 \uAC83
- \uAE00\uC790\uAC00 \uD750\uB9BF\uD558\uAC70\uB098 \uC798 \uC548 \uBCF4\uC774\uBA74, \uC548 \uBCF4\uC774\uB294 \uB300\uB85C \uCD5C\uB300\uD55C \uC77D\uB418 \uC808\uB300 \uB2E4\uB978 \uBA54\uB274 \uC774\uB984\uC73C\uB85C \uB300\uCCB4\uD558\uAC70\uB098 \uC9C0\uC5B4\uB0B4\uC9C0 \uB9D0 \uAC83
- \uC790\uBAA8 \uD558\uB098\uD558\uB098\uB97C \uC815\uD655\uD788 \uAD6C\uBD84\uD574\uC11C \uC77D\uC744 \uAC83 (\uC608: "\uCE75\uD14C\uC77C"\uACFC "\uB77D\uD14C\uC77C"\uC740 \uB2E4\uB978 \uAE00\uC790\uC774\uB2C8 \uD654\uBA74\uC5D0 \uCC0D\uD78C \uC790\uC74C/\uBAA8\uC74C\uC744 \uC815\uD655\uD788 \uD655\uC778. "\uB354 \uD754\uD55C \uB2E8\uC5B4"\uB85C \uC790\uB3D9 \uBCF4\uC815\uD558\uC9C0 \uB9D0 \uAC83)
- "\uC794\uC220", "\uAE00\uB77C\uC2A4", "\uBCD1", "\uBC14\uD2C0" \uB4F1 \uB2E8\uC704\uB97C \uB098\uD0C0\uB0B4\uB294 \uD45C\uAE30\uAC00 \uBA54\uB274\uBA85 \uB4A4\uC5D0 \uBD99\uC5B4\uC788\uC73C\uBA74, \uBC18\uB4DC\uC2DC name\uC5D0 \uADF8\uB300\uB85C \uD3EC\uD568\uC2DC\uD0AC \uAC83 (\uC218\uB7C9 \uBCC0\uD658 \uC2DC\uC5D0\uB3C4 \uC808\uB300 \uBE60\uB728\uB9AC\uC9C0 \uB9D0 \uAC83. \uC608: "\uB9E5\uCF08\uB780 12y \uC794\uC220 x1" \u2192 "\uB9E5\uCF08\uB780 12y \uC794\uC220(1)", \uC808\uB300 "\uB9E5\uCF08\uB780 12y(1)"\uCC98\uB7FC \uC794\uC220\uC744 \uBE7C\uBA74 \uC548 \uB428)
- \uC774\uBBF8\uC9C0\uC5D0 \uC788\uB294 \uC904(\uD56D\uBAA9)\uC740 \uD558\uB098\uB3C4 \uBE60\uC9D0\uC5C6\uC774 \uC804\uBD80 \uD3EC\uD568\uD560 \uAC83 (\uD55C \uC904\uC774\uB77C\uB3C4 \uB204\uB77D \uAE08\uC9C0)
- \uC774\uBBF8\uC9C0\uC5D0 \uC5C6\uB294 \uD56D\uBAA9\uC744 \uCD94\uAC00\uB85C \uB9CC\uB4E4\uC5B4\uB0B4\uC9C0 \uB9D0 \uAC83

\uD615\uAD11\uD39C \uADDC\uCE59:
${yellowGuide}
${pinkGuide}${userExcludeNote}${examplesGuide}`
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageDataUrl, detail: "high" }
              },
              {
                type: "text",
                text: `\uC774 \uD3EC\uC2A4\uAE30 \uC8FC\uBB38\uB0B4\uC5ED \uC774\uBBF8\uC9C0\uB97C \uBD84\uC11D\uD574\uC11C \uB2E4\uC74C\uC744 \uBC18\uD658\uD574\uC8FC\uC138\uC694. memo \uBB38\uC7A5\uC744 \uC9C1\uC811 \uC791\uC131\uD558\uC9C0 \uB9D0\uACE0, \uC774\uBBF8\uC9C0\uC5D0 \uBCF4\uC774\uB294 \uD56D\uBAA9\uC744 \uD558\uB098\uC529 items \uBC30\uC5F4\uC5D0 \uC815\uD655\uD788 \uB098\uC5F4\uD574\uC8FC\uC138\uC694 (\uBB38\uC7A5 \uC870\uB9BD\uC740 \uC11C\uBC84\uC5D0\uC11C \uCC98\uB9AC\uD569\uB2C8\uB2E4).

1. items: \uC774\uBBF8\uC9C0\uC758 \uAC01 \uC904(\uD56D\uBAA9)\uC744 \uD558\uB098\uC529 \uBE60\uC9D0\uC5C6\uC774 \uBC30\uC5F4\uB85C \uBC18\uD658
   - name: \uD56D\uBAA9\uBA85. \uC218\uB7C9 \uD45C\uAE30(x1, X1, \xD71, *1 \uB4F1)\uB294 "\uC774\uB984(\uC22B\uC790)" \uD615\uC2DD\uC73C\uB85C \uBCC0\uD658 (\uC608: \uD788\uBE44\uD0A4x1 \u2192 "\uD788\uBE44\uD0A4(1)", \uBAA8\uC5E3x2 \u2192 "\uBAA8\uC5E3(2)")
     \uC218\uB7C9\uC774 \uC5C6\uC73C\uBA74 \uC774\uB984\uB9CC (\uC608: "\uBB34\uC81C\uD55C2", "\uC5F0\uC7A51"\uCC98\uB7FC \uC774\uBBF8\uC9C0\uC5D0 \uBD99\uC5B4\uC788\uB294 \uC22B\uC790\uB294 \uADF8\uB300\uB85C \uC774\uB984\uC5D0 \uD3EC\uD568)
   - amount: \uD574\uB2F9 \uD56D\uBAA9 \uAE08\uC561 (\uC6D0 \uB2E8\uC704 \uC815\uC218). \uBB34\uB8CC/\uC11C\uBE44\uC2A4 \uD56D\uBAA9\uC740 0
   - highlight: \uC774 \uD56D\uBAA9\uC5D0 \uC801\uC6A9\uD560 \uD615\uAD11\uD39C \uC0C9\uC0C1
     \xB7 "yellow": \uC8FC\uB958/\uC0F4\uD398\uC778/\uC704\uC2A4\uD0A4/\uB9E5\uC8FC \uB4F1\uC744 "\uBCD1" \uB2E8\uC704\uB85C \uC8FC\uBB38\uD55C \uACBD\uC6B0\uB9CC (\uC608: \uAE30\uB124\uC2A4 \uB4DC\uB798\uD504\uD2B8/\uCE74\uC2A4/\uD14C\uB77C \uB4F1 \uB9E5\uC8FC\uB3C4 \uBCD1 \uB2E8\uC704\uBA74 \uD3EC\uD568) (\u26A0\uFE0F \uC794\uC220/\uAE00\uB77C\uC2A4/\uC794/\uC0DD\uB9E5\uC8FC\uC794 \uB2E8\uC704\uB294 \uC808\uB300 yellow \uAE08\uC9C0 \u2192 "none")
     \xB7 "purple": \uC9C1\uC6D0\uBA85(\uD638\uC2A4\uD2F0\uC2A4/\uC2A4\uD15D, \uC794\uCD94\uAC00 \uB4F1)\uC778 \uACBD\uC6B0
     \xB7 "none": \uADF8 \uC678 \uC804\uBD80 (\uBB34\uC81C\uD55C, \uC5F0\uC7A5, \uAE30\uBCF8, \uCD94\uAC00, \uC11C\uBE44\uC2A4, \uD3EC\uC7A5, \uD14C\uC774\uBE14, \uB8F8, \uC794\uC220 \uB2E8\uC704 \uC8FC\uB958 \uB4F1)
   - \uC774\uBBF8\uC9C0\uC5D0 \uC2E4\uC81C\uB85C \uBCF4\uC774\uB294 \uAE00\uC790\uB9CC \uC62E\uAE38 \uAC83. \uD750\uB9BF\uD574\uB3C4 \uB2E4\uB978 \uBA54\uB274\uB85C \uB300\uCCB4\uD558\uAC70\uB098 \uC9C0\uC5B4\uB0B4\uC9C0 \uB9D0\uACE0, \uC548 \uBCF4\uC774\uBA74 \uBCF4\uC774\uB294 \uBD80\uBD84\uAE4C\uC9C0\uB9CC \uC815\uD655\uD788 \uD45C\uAE30

2. amount: \uC774\uBBF8\uC9C0\uC5D0 "\uD569\uACC4/\uCD1D\uC561"\uB780\uC774 \uBCC4\uB3C4\uB85C \uBA85\uC2DC\uB418\uC5B4 \uC788\uC73C\uBA74 \uADF8 \uC22B\uC790 \uADF8\uB300\uB85C \uC0AC\uC6A9 (\uC6D0 \uB2E8\uC704 \uC815\uC218)
   - \uBCC4\uB3C4 \uD569\uACC4\uB780\uC774 \uC5C6\uC73C\uBA74 0\uC73C\uB85C \uBC18\uD658 (items \uD569\uC0B0\uC740 \uC11C\uBC84\uC5D0\uC11C \uC790\uB3D9 \uACC4\uC0B0)

3. confidence: \uBD84\uC11D \uC2E0\uB8B0\uB3C4 (high/medium/low)`
              }
            ]
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "order_memo_v3",
            strict: true,
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  description: "\uC774\uBBF8\uC9C0\uC5D0\uC11C \uC77D\uC740 \uAC1C\uBCC4 \uD56D\uBAA9 \uBAA9\uB85D (\uBE60\uC9D0\uC5C6\uC774 \uC804\uBD80, \uC9C0\uC5B4\uB0B4\uC9C0 \uB9D0 \uAC83)",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: '\uD56D\uBAA9\uBA85 (\uC218\uB7C9\uC740 "\uC774\uB984(\uC22B\uC790)" \uD615\uC2DD)' },
                      amount: { type: "integer", description: "\uD574\uB2F9 \uD56D\uBAA9 \uAE08\uC561 (\uC6D0)" },
                      highlight: { type: "string", enum: ["yellow", "purple", "none"], description: "\uD615\uAD11\uD39C \uC0C9\uC0C1" }
                    },
                    required: ["name", "amount", "highlight"],
                    additionalProperties: false
                  }
                },
                amount: { type: "integer", description: "\uC774\uBBF8\uC9C0\uC5D0 \uD45C\uC2DC\uB41C \uCD1D \uACB0\uC81C\uAE08\uC561 (\uD569\uACC4\uB780\uC774 \uBA85\uC2DC\uB418\uC5B4 \uC788\uB294 \uACBD\uC6B0\uB9CC \uC0AC\uC6A9, \uC5C6\uC73C\uBA74 0)" },
                confidence: { type: "string", description: "\uBD84\uC11D \uC2E0\uB8B0\uB3C4: high/medium/low" }
              },
              required: ["items", "amount", "confidence"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices?.[0]?.message?.content;
      if (!rawContent) throw new TRPCError5({ code: "INTERNAL_SERVER_ERROR", message: "AI \uBD84\uC11D \uACB0\uACFC\uB97C \uBC1B\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4" });
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      const result = JSON.parse(content);
      const HIGHLIGHT_STYLE = {
        yellow: "background: rgb(255, 224, 102); border-radius: 2px; padding: 0px 1px;",
        purple: "background: rgb(216, 180, 254); border-radius: 2px; padding: 0px 1px;"
      };
      const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      if (Array.isArray(result.items)) {
        for (const it of result.items) {
          if (!it || typeof it !== "object") continue;
          const nm = String(it.name ?? "");
          const isGlassUnit = /잔술|글라스/.test(nm) || /(?<![가-힣])잔(?![가-힣])/.test(nm.replace(/\(\d+\)$/, ""));
          if (isGlassUnit && it.highlight === "yellow") {
            it.highlight = "none";
          }
        }
      }
      result.memo = Array.isArray(result.items) ? result.items.map((it) => {
        const name = escapeHtml(String(it?.name ?? "").trim());
        if (!name) return null;
        const style = HIGHLIGHT_STYLE[it?.highlight];
        return style ? `<mark style="${style}">${name}</mark>` : name;
      }).filter(Boolean).join(", ") : "";
      const itemsSum = Array.isArray(result.items) ? result.items.reduce((sum, it) => sum + (Number(it?.amount) || 0), 0) : 0;
      if (itemsSum > 0) {
        const modelAmount = Number(result.amount) || 0;
        result.amount = modelAmount > 0 && Math.abs(modelAmount - itemsSum) <= 1e3 ? itemsSum : modelAmount > 0 ? modelAmount : itemsSum;
      }
      const stripMarksContaining = (html, markPattern, excludedList) => {
        if (!html || excludedList.length === 0) return html;
        return html.replace(markPattern, (full, inner) => {
          const innerText = String(inner).replace(/<[^>]+>/g, "");
          const hit = excludedList.some((ex) => ex.length > 0 && innerText.includes(ex));
          return hit ? inner : full;
        });
      };
      let memoOut = result.memo || "";
      const yellowMarkRe = /<mark[^>]*rgb\(255,\s*224,\s*102\)[^>]*>([\s\S]*?)<\/mark>/g;
      const pinkMarkRe = /<mark[^>]*rgb\(216,\s*180,\s*254\)[^>]*>([\s\S]*?)<\/mark>/g;
      memoOut = stripMarksContaining(memoOut, yellowMarkRe, excludedYellowList);
      memoOut = stripMarksContaining(memoOut, pinkMarkRe, excludedPinkList);
      return {
        memo: memoOut,
        amount: typeof result.amount === "number" && result.amount > 0 ? String(result.amount) : "",
        confidence: result.confidence || "low"
      };
    })
  }),
  settlement: settlementRouter,
  branchSettings: branchSettingsRouter
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  const url = opts.req.url;
  const hasCookie = !!opts.req.headers.cookie;
  const cookieNames = opts.req.headers.cookie ? opts.req.headers.cookie.split(";").map((c) => c.trim().split("=")[0]) : [];
  const hasAuthHeader = !!opts.req.headers.authorization;
  console.log("[CTX-DEBUG]", {
    authHeader: opts.req.headers.authorization ? opts.req.headers.authorization.substring(0, 100) : "NOT SET",
    cookie: opts.req.headers.cookie ? opts.req.headers.cookie.substring(0, 100) : "NOT SET"
  });
  console.log("[createContext] Request Debug:", {
    url,
    hasCookie,
    cookieNames,
    hasAuthHeader
  });
  try {
    console.log("[createContext] Attempting sdk.authenticateRequest...");
    user = await sdk.authenticateRequest(opts.req);
    console.log("[createContext] SUCCESS:", {
      userId: user?.id,
      userRole: user?.role
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log("[createContext] FAILED:", { error: errorMsg });
    user = null;
  }
  console.log("[createContext] Final ctx.user:", {
    isNull: user === null,
    userId: user?.id,
    userRole: user?.role
  });
  console.log("[DEBUG-USER-OBJ]", JSON.stringify(user, null, 2));
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/backup-scheduler.ts
init_db();
import { sql as sql2 } from "drizzle-orm";
var GITHUB_TOKEN = process.env.GITHUB_BACKUP_TOKEN ?? "";
var GITHUB_REPO = "jhyun860-source/sales-report";
var BACKUP_BRANCH = "main";
function todayKST() {
  const now = /* @__PURE__ */ new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1e3);
  return kst.toISOString().slice(0, 10);
}
async function getFileSha(path4) {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path4}?ref=${BACKUP_BRANCH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.sha ?? null;
  } catch {
    return null;
  }
}
async function pushToGitHub(path4, content, message) {
  if (!GITHUB_TOKEN) {
    console.warn("[backup] GITHUB_BACKUP_TOKEN \uBBF8\uC124\uC815 - \uBC31\uC5C5 \uC2A4\uD0B5");
    return false;
  }
  const sha = await getFileSha(path4);
  const body = {
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    branch: BACKUP_BRANCH
  };
  if (sha) body.sha = sha;
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path4}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  return res.ok;
}
async function takeSnapshot() {
  const db = await getDb();
  if (!db) throw new Error("DB \uC5F0\uACB0 \uC2E4\uD328");
  const tables = [
    "branches",
    "dailySalesRecords",
    "tableReports",
    "tableItems",
    "staffIncentives",
    "liquorItems",
    "liquorInventories",
    "liquorStockMovements",
    "liquorHiddenItems"
  ];
  const snapshot = {};
  for (const table of tables) {
    const rows = await db.execute(sql2.raw(`SELECT * FROM \`${table}\``));
    const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
    snapshot[table] = data;
  }
  return snapshot;
}
async function runDailyBackup() {
  const dateStr = todayKST();
  console.log(`[backup] ${dateStr} \uBC31\uC5C5 \uC2DC\uC791`);
  try {
    const snapshot = await takeSnapshot();
    const json2 = JSON.stringify(snapshot, null, 2);
    const dailyPath = `backups/${dateStr}.json`;
    const ok1 = await pushToGitHub(
      dailyPath,
      json2,
      `[backup] ${dateStr} \uC790\uB3D9 DB \uC2A4\uB0C5\uC0F7`
    );
    const ok2 = await pushToGitHub(
      "backups/latest.json",
      json2,
      `[backup] latest \uAC31\uC2E0 (${dateStr})`
    );
    const indexPath = "backups/index.json";
    const existingIndexSha = await getFileSha(indexPath);
    let indexData = [];
    if (existingIndexSha) {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexPath}?ref=${BACKUP_BRANCH}`,
        { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
      );
      const d = await res.json();
      try {
        indexData = JSON.parse(Buffer.from(d.content, "base64").toString("utf-8"));
      } catch {
      }
    }
    indexData = indexData.filter((e) => e.date !== dateStr);
    indexData.unshift({ date: dateStr, file: dailyPath, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
    indexData = indexData.slice(0, 90);
    await pushToGitHub(
      indexPath,
      JSON.stringify(indexData, null, 2),
      `[backup] index \uAC31\uC2E0 (${dateStr})`
    );
    if (ok1 && ok2) {
      console.log(`[backup] ${dateStr} \uBC31\uC5C5 \uC644\uB8CC \u2192 backups/${dateStr}.json`);
    } else {
      console.error(`[backup] ${dateStr} \uBC31\uC5C5 \uC77C\uBD80 \uC2E4\uD328 (ok1=${ok1}, ok2=${ok2})`);
    }
  } catch (err) {
    console.error("[backup] \uBC31\uC5C5 \uC624\uB958:", err);
  }
}
function startBackupScheduler() {
  console.log("[backup] \uC790\uB3D9 \uBC31\uC5C5 \uC2A4\uCF00\uC904\uB7EC \uC2DC\uC791");
  function scheduleNext() {
    const now = /* @__PURE__ */ new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1e3);
    const nextRun = new Date(kstNow);
    nextRun.setUTCHours(0, 5, 0, 0);
    if (nextRun <= kstNow) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }
    const nextRunUTC = new Date(nextRun.getTime() - 9 * 60 * 60 * 1e3);
    const msUntilRun = nextRunUTC.getTime() - now.getTime();
    console.log(`[backup] \uB2E4\uC74C \uBC31\uC5C5 \uC608\uC815: ${nextRun.toISOString().slice(0, 16)} KST (${Math.round(msUntilRun / 6e4)}\uBD84 \uD6C4)`);
    setTimeout(async () => {
      await runDailyBackup();
      scheduleNext();
    }, msUntilRun);
  }
  scheduleNext();
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  const { registerRestoreRoutes: registerRestoreRoutes2 } = await Promise.resolve().then(() => (init_restoreRouter(), restoreRouter_exports));
  registerRestoreRoutes2(app);
  app.get("/version", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    let dbStatus = "unknown";
    let dataCheck = null;
    try {
      const { getDb: getDb2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const db = await getDb2();
      if (db) {
        await db.execute("SELECT 1");
        dbStatus = "connected";
        const [b] = await db.execute("SELECT COUNT(*) AS c FROM branches");
        const [a] = await db.execute("SELECT loginId FROM storeAccounts ORDER BY id LIMIT 20");
        dataCheck = {
          branches: b?.[0]?.c ?? b,
          loginIds: Array.isArray(a) ? a.map((r) => r.loginId) : a
        };
      } else {
        dbStatus = "no DATABASE_URL";
      }
    } catch (e) {
      const cause = e?.cause?.message || e?.cause?.code || "";
      dbStatus = "error: " + (cause || (e?.message ?? String(e))).slice(0, 200);
    }
    let dbHost = "unset";
    try {
      const u = new URL(process.env.DATABASE_URL || "");
      dbHost = `${u.hostname}:${u.port}`;
    } catch {
      dbHost = "parse-fail";
    }
    res.json({
      build: "2026-07-11-v5-railway",
      db: dbStatus,
      dbHost,
      dataCheck,
      time: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  registerSettlementsRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    if (process.env.NODE_ENV === "production") {
      startBackupScheduler();
    }
  });
}
startServer().catch(console.error);
