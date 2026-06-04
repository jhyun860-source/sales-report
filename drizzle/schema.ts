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
  cashDeposit: decimal("cashDeposit", { precision: 15, scale: 0 }).default("0").notNull(), // 시제 입금
  paymentChangeNote: text("paymentChangeNote"),
  paymentChangeDate: varchar("paymentChangeDate", { length: 10 }),
  paymentChangeAmount: decimal("paymentChangeAmount", { precision: 15, scale: 0 }).default("0").notNull(),
  expenses: json("expenses").$type<Array<{ id: string; description: string; amount: string }>>().default([]).notNull(),
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
  otherExpense: decimal("otherExpense", { precision: 15, scale: 0 }).default("0").notNull(),
  totalExpenses: decimal("totalExpenses", { precision: 15, scale: 0 }).default("0").notNull(),
  netProfit: decimal("netProfit", { precision: 15, scale: 0 }).default("0").notNull(),
  staffCount: int("staffCount").default(0).notNull(),
  partTimeCount: int("partTimeCount").default(0).notNull(),
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

/**
 * 지점 계정 테이블 - 자체 아이디/비밀번호 로그인
 * 점장들이 아이디/비밀번호로 로그인하는 계정
 */
export const storeAccounts = mysqlTable("storeAccounts", {
  id: int("id").autoincrement().primaryKey(),
  loginId: varchar("loginId", { length: 50 }).notNull().unique(), // 로그인 아이디
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(), // bcrypt 해시
  branchId: int("branchId"), // 배정된 지점 (null이면 미배정)
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  displayName: varchar("displayName", { length: 100 }), // 표시 이름
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StoreAccount = typeof storeAccounts.$inferSelect;
export type InsertStoreAccount = typeof storeAccounts.$inferInsert;

export const storeAccountsRelations = relations(storeAccounts, ({ one }) => ({
  branch: one(branches, {
    fields: [storeAccounts.branchId],
    references: [branches.id],
  }),
}));

export const branchSettings = mysqlTable("branchSettings", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  monthlyRent: decimal("monthlyRent", { precision: 15, scale: 0 }).default("0").notNull(),
  dailyRentExpense: decimal("dailyRentExpense", { precision: 15, scale: 0 }).default("0").notNull(), // 사용자 설정 일일 임대료
  managerMonthlySalary: decimal("managerMonthlySalary", { precision: 15, scale: 0 }).default("0").notNull(),
  managerDailyWage: decimal("managerDailyWage", { precision: 15, scale: 0 }).default("0").notNull(),
  staffDailyWage: decimal("staffDailyWage", { precision: 15, scale: 0 }).default("0").notNull(),
  partTimeHourlyWage: decimal("partTimeHourlyWage", { precision: 15, scale: 0 }).default("0").notNull(),
  deputyMonthlySalary: decimal("deputyMonthlySalary", { precision: 15, scale: 0 }).default("0").notNull(),
  deputyDailyWage: decimal("deputyDailyWage", { precision: 15, scale: 0 }).default("0").notNull(),
  monthlyFixedExpense: decimal("monthlyFixedExpense", { precision: 15, scale: 0 }).default("0").notNull(),
  commissionRate: decimal("commissionRate", { precision: 5, scale: 4 }).default("0.1700").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BranchSettings = typeof branchSettings.$inferSelect;
export type InsertBranchSettings = typeof branchSettings.$inferInsert;

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

/**
 * 테이블 영업 기록 헤더 테이블
 * 날짜별 영업 기록 (팀수, 기타사항, 신규손님 팁 등)
 */
export const tableReports = mysqlTable("tableReports", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  teamCount: int("teamCount").default(0).notNull(), // 팀수
  cashAmount: decimal("cashAmount", { precision: 15, scale: 0 }).default("0").notNull(), // 현금 금액
  cardAmount: decimal("cardAmount", { precision: 15, scale: 0 }).default("0").notNull(), // 카드 금액
  notes: text("notes"), // 기타사항
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TableReport = typeof tableReports.$inferSelect;
export type InsertTableReport = typeof tableReports.$inferInsert;

/**
 * 테이블 항목 테이블
 * 각 테이블별 손님 정보 (번호, 손님구분, 금액, 결제수단, 메모)
 */
export const tableItems = mysqlTable("tableItems", {
  id: int("id").autoincrement().primaryKey(),
  tableReportId: int("tableReportId").notNull(),
  tableNumber: varchar("tableNumber", { length: 20 }).notNull(), // 테이블 번호 (1T, 2T 등)
  guestType: mysqlEnum("guestType", ["walking", "regular", "named"]).default("walking").notNull(), // 워킹/기존/지명
  guestName: varchar("guestName", { length: 100 }), // 손님 이름 (지명 시)
  amount: decimal("amount", { precision: 15, scale: 0 }).default("0").notNull(), // 금액
  paymentMethod: mysqlEnum("paymentMethod", ["card", "cash"]).default("card").notNull(), // 결제수단
  memo: text("memo"), // 주문 메모
  sortOrder: int("sortOrder").default(0).notNull(), // 정렬 순서
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TableItem = typeof tableItems.$inferSelect;
export type InsertTableItem = typeof tableItems.$inferInsert;

/**
 * 직원 인센티브 테이블
 * 출근자별 잔추가/병추가/맥주병추가 기록
 */
export const staffIncentives = mysqlTable("staffIncentives", {
  id: int("id").autoincrement().primaryKey(),
  tableReportId: int("tableReportId").notNull(),
  staffName: varchar("staffName", { length: 50 }).notNull(), // 직원명
  glassCount: int("glassCount").default(0).notNull(), // 잔추가 수
  bottleCount: int("bottleCount").default(0).notNull(), // 병추가 수
  beerBottleCount: int("beerBottleCount").default(0).notNull(), // 맥주 병추가 수
  salesIncentive: decimal("salesIncentive", { precision: 15, scale: 0 }).default("0").notNull(), // 영업 인센티브 금액
  staffType: mysqlEnum("staffType", ["staff", "parttime", "manager", "deputy"]).default("staff").notNull(), // 직원/아르바이트/점장
  workStart: varchar("workStart", { length: 5 }), // 근무 시작 시간 (HH:mm)
  workEnd: varchar("workEnd", { length: 5 }), // 근무 종료 시간 (HH:mm)
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StaffIncentive = typeof staffIncentives.$inferSelect;
export type InsertStaffIncentive = typeof staffIncentives.$inferInsert;

export const tableReportsRelations = relations(tableReports, ({ one, many }) => ({
  branch: one(branches, {
    fields: [tableReports.branchId],
    references: [branches.id],
  }),
  items: many(tableItems),
  staffIncentives: many(staffIncentives),
}));

export const tableItemsRelations = relations(tableItems, ({ one }) => ({
  tableReport: one(tableReports, {
    fields: [tableItems.tableReportId],
    references: [tableReports.id],
  }),
}));

export const staffIncentivesRelations = relations(staffIncentives, ({ one }) => ({
  tableReport: one(tableReports, {
    fields: [staffIncentives.tableReportId],
    references: [tableReports.id],
  }),
}));

/**
 * 주류 품목 마스터
 * 관리자가 주류명/카테고리/단가를 관리한다.
 */
export const liquorItems = mysqlTable("liquorItems", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  category: varchar("category", { length: 50 }).default("기타").notNull(),
  unitCost: decimal("unitCost", { precision: 15, scale: 0 }).default("0").notNull(),
  isActive: int("isActive").default(1).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LiquorItem = typeof liquorItems.$inferSelect;
export type InsertLiquorItem = typeof liquorItems.$inferInsert;

/**
 * 지점별 주류 현재 재고
 */
export const liquorInventories = mysqlTable("liquorInventories", {
  id: int("id").autoincrement().primaryKey(),
  branchId: int("branchId").notNull(),
  liquorItemId: int("liquorItemId").notNull(),
  currentStock: decimal("currentStock", { precision: 12, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LiquorInventory = typeof liquorInventories.$inferSelect;
export type InsertLiquorInventory = typeof liquorInventories.$inferInsert;

/**
 * 주류 입고/출고/조정 히스토리
 */
export const liquorStockMovements = mysqlTable("liquorStockMovements", {
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
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LiquorStockMovement = typeof liquorStockMovements.$inferSelect;
export type InsertLiquorStockMovement = typeof liquorStockMovements.$inferInsert;

export const liquorItemsRelations = relations(liquorItems, ({ many }) => ({
  inventories: many(liquorInventories),
  movements: many(liquorStockMovements),
}));

export const liquorInventoriesRelations = relations(liquorInventories, ({ one }) => ({
  branch: one(branches, { fields: [liquorInventories.branchId], references: [branches.id] }),
  item: one(liquorItems, { fields: [liquorInventories.liquorItemId], references: [liquorItems.id] }),
}));

export const liquorStockMovementsRelations = relations(liquorStockMovements, ({ one }) => ({
  branch: one(branches, { fields: [liquorStockMovements.branchId], references: [branches.id] }),
  item: one(liquorItems, { fields: [liquorStockMovements.liquorItemId], references: [liquorItems.id] }),
}));
