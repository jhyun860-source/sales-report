import { Express, Request, Response } from "express";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { branches, dailySalesRecords, tableReports, staffIncentives, liquorStockMovements } from "../../drizzle/schema";
import { ENV } from "./env";

/**
 * 정산 데이터 타입
 */
export interface SettlementData {
  date: string;
  branchName: string;
  totalSales: number; // 총매출 (현금 + 카드)
  cash: number; // 현금
  card: number; // 카드
  liquorOutAmount: number; // 주류 출고 금액
  staffWages: number; // 직원 인건비
  parttimeWages: number; // 알바 인건비
  staffDrinkAmount: number; // 스탭 음료 금액
}

/**
 * API 키 검증 미들웨어
 */
function validateApiKey(req: Request, res: Response): boolean {
  const apiKey = req.headers["x-api-key"] as string;
  const validApiKey = ENV.settlementApiKey;

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({ error: "Unauthorized: Invalid API key" });
    return false;
  }
  return true;
}

/**
 * 지점명을 branchId로 변환
 */
async function getBranchIdByName(branchName: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const branchMap: Record<string, string> = {
    "대치점": "daechi",
    "삼성점": "samsung",
    "선릉점": "seolleung",
    "문정1호점": "munjeong1",
    "문정2호점": "munjeong2",
  };

  const branchCode = branchMap[branchName];
  if (!branchCode) return null;

  try {
    const result = await db
      .select()
      .from(branches)
      .where(eq(branches.code, branchCode))
      .limit(1);

    return result.length > 0 ? result[0].id : null;
  } catch (error) {
    console.error("[Settlements] Failed to get branch:", error);
    return null;
  }
}

/**
 * 특정 날짜의 정산 데이터 조회
 */
async function getSettlementByDate(branchId: number, date: string): Promise<SettlementData | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // 지점 정보 조회
    const branchResult = await db
      .select()
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);

    if (branchResult.length === 0) return null;
    const branchName = branchResult[0].name;

    // 일일 매출 기록 조회
    const salesResult = await db
      .select()
      .from(dailySalesRecords)
      .where(and(eq(dailySalesRecords.branchId, branchId), eq(dailySalesRecords.date, date)))
      .limit(1);

    const salesRecord = salesResult.length > 0 ? salesResult[0] : null;
    const cash = salesRecord ? Number(salesRecord.cashTotal || 0) : 0;
    const card = salesRecord ? Number(salesRecord.cardTotal || 0) : 0;
    const totalSales = cash + card;

    // 테이블 기록 조회 (직원 인건비, 스탭 음료)
    const tableResult = await db
      .select()
      .from(tableReports)
      .where(and(eq(tableReports.branchId, branchId), eq(tableReports.date, date)))
      .limit(1);

    const tableReport = tableResult.length > 0 ? tableResult[0] : null;
    const tableReportId = tableReport?.id || 0;

    let staffWages = 0;
    let parttimeWages = 0;

    if (tableReportId > 0) {
      // 직원 인센티브 조회
      const incentives = await db
        .select()
        .from(staffIncentives)
        .where(eq(staffIncentives.tableReportId, tableReportId));

      for (const incentive of incentives) {
        const amount = Number(incentive.salesIncentive || 0);
        if (incentive.staffType === "staff") {
          staffWages += amount;
        } else if (incentive.staffType === "parttime") {
          parttimeWages += amount;
        }
      }
    }

    // 주류 출고 금액 조회 (OUT 타입만)
    const liquorResult = await db
      .select()
      .from(liquorStockMovements)
      .where(
        and(
          eq(liquorStockMovements.branchId, branchId),
          eq(liquorStockMovements.date, date),
          eq(liquorStockMovements.type, "OUT")
        )
      );

    let liquorOutAmount = 0;
    for (const movement of liquorResult) {
      liquorOutAmount += Number(movement.totalCost || 0);
    }

    // 스탭 음료 금액은 현재 데이터 구조에서 별도 필드가 없으므로 0으로 설정
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
      staffDrinkAmount,
    };
  } catch (error) {
    console.error("[Settlements] Failed to get settlement by date:", error);
    return null;
  }
}

/**
 * 가장 최근 정산 데이터 조회
 */
async function getLatestSettlement(branchId: number): Promise<SettlementData | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // 가장 최근 일일 매출 기록 조회
    const salesResult = await db
      .select()
      .from(dailySalesRecords)
      .where(eq(dailySalesRecords.branchId, branchId))
      .orderBy((t) => [t.date])
      .limit(1);

    if (salesResult.length === 0) return null;

    const latestDate = salesResult[0].date;
    return await getSettlementByDate(branchId, latestDate);
  } catch (error) {
    console.error("[Settlements] Failed to get latest settlement:", error);
    return null;
  }
}

/**
 * 정산 API 라우트 등록
 */
export function registerSettlementsRoutes(app: Express) {
  /**
   * GET /api/settlements/:branchName/latest
   * 특정 지점의 가장 최근 정산 데이터 조회
   * (이 라우트를 먼저 등록해야 /latest가 :date 파라미터로 해석되지 않음)
   */
  app.get("/api/settlements/:branchName/latest", async (req: Request, res: Response) => {
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

  /**
   * GET /api/settlements/:branchName/:date
   * 특정 지점의 특정 날짜 정산 데이터 조회
   */
  app.get("/api/settlements/:branchName/:date", async (req: Request, res: Response) => {
    if (!validateApiKey(req, res)) return;

    const { branchName, date } = req.params;

    // 날짜 형식 검증 (YYYY-MM-DD)
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
