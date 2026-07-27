/**
 * [일회성] DB 이전 복원 라우트
 * - GET /admin/restore-db?key=...&mode=schema|data|status
 * - 새 MySQL에 테이블 생성 후 GitHub 백업 JSON을 부어넣는다.
 * - 이전 완료 후 이 파일과 라우트 등록을 제거할 것.
 */
import type { Express } from "express";
import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";

const RESTORE_KEY = "mwt-restore-20260711-xK4";
const BACKUP_FILE = "backups/backup-2026-06-05-before-manager-wage.json";
const SCHEMA_FILE = "drizzle-full/0000_zippy_carlie_cooper.sql";

// 스키마 파일에 없는 수동 생성 테이블 2개
const EXTRA_DDL = [
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
  )`,
];

function toMysqlValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    // ISO 날짜 문자열 → MySQL DATETIME 형식
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
  return mysql.createConnection({ uri: url, multipleStatements: true });
}

export function registerRestoreRoutes(app: Express) {
  app.get("/admin/restore-db", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (req.query.key !== RESTORE_KEY) {
      return res.status(403).json({ error: "invalid key" });
    }
    const mode = String(req.query.mode || "status");
    let conn: mysql.Connection | null = null;
    try {
      conn = await getConn();

      if (mode === "schema" || mode === "data") {
        // [보안] 이전 완료 후 위험한 전체 삭제/재삽입 기능을 영구 비활성화.
        //   GET 요청만으로 실행되는 구조라, 실수로 링크를 다시 열거나 브라우저가
        //   백그라운드에서 미리 불러오기만 해도 DB 전체가 백업 시점으로 되돌아가는
        //   심각한 위험이 있었음(실제로 이 문제로 최근 데이터가 유실된 것으로 추정됨).
        return res.status(410).json({
          error: "이 기능은 안전을 위해 비활성화되었습니다. 데이터를 다시 복원해야 하면 코드로 직접 요청하세요.",
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
        const sqlPath = path.resolve(process.cwd(), SCHEMA_FILE);
        const raw = fs.readFileSync(sqlPath, "utf-8");
        // drizzle 구분자 제거 후 문장 단위 실행
        const statements = raw
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter(Boolean);
        const results: string[] = [];
        await conn.query("SET FOREIGN_KEY_CHECKS=0");
        for (const stmt of statements) {
          try {
            await conn.query(stmt);
            const name = stmt.match(/`([^`]+)`/)?.[1] ?? "?";
            results.push(`ok: ${name}`);
          } catch (e: any) {
            results.push(`skip: ${(e?.message || "").slice(0, 120)}`);
          }
        }
        for (const ddl of EXTRA_DDL) {
          try {
            await conn.query(ddl);
            results.push("ok: extra");
          } catch (e: any) {
            results.push(`skip extra: ${(e?.message || "").slice(0, 120)}`);
          }
        }
        await conn.query("SET FOREIGN_KEY_CHECKS=1");
        return res.json({ mode, results });
      }

      if (mode === "data") {
        const backupPath = path.resolve(process.cwd(), BACKUP_FILE);
        const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));
        const report: Record<string, string> = {};
        await conn.query("SET FOREIGN_KEY_CHECKS=0");
        for (const [table, rows] of Object.entries(backup)) {
          if (table === "__drizzle_migrations") continue;
          if (!Array.isArray(rows) || rows.length === 0) {
            report[table] = "0행 (건너뜀)";
            continue;
          }
          try {
            await conn.query(`TRUNCATE TABLE \`${table}\``);
            // 대상 테이블의 실제 컬럼 목록 조회 → 백업의 잉여 컬럼 제거
            const [colRows] = await conn.query(
              "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
              [table]
            );
            const tableCols = new Set(
              (colRows as any[]).map((r) => r.COLUMN_NAME)
            );
            const cols = Object.keys(rows[0] as object).filter((c) =>
              tableCols.has(c)
            );
            if (cols.length === 0) {
              report[table] = "실패: 일치하는 컬럼 없음";
              continue;
            }
            const colSql = cols.map((c) => `\`${c}\``).join(",");
            const CHUNK = 300;
            let inserted = 0;
            for (let i = 0; i < rows.length; i += CHUNK) {
              const chunk = (rows as any[]).slice(i, i + CHUNK);
              const values = chunk.map((r) =>
                cols.map((c) => toMysqlValue(r[c]))
              );
              const [result]: any = await conn.query(
                `INSERT IGNORE INTO \`${table}\` (${colSql}) VALUES ?`,
                [values]
              );
              inserted += result?.affectedRows ?? chunk.length;
            }
            report[table] = `${inserted}행 복원 (원본 ${rows.length}행)`;
          } catch (e: any) {
            report[table] = `실패: ${(e?.message || "").slice(0, 150)}`;
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

      if (mode === "settlementcheck") {
        const branchIdParam = Number(req.query.branchId || 2);
        const date = String(req.query.date || "2026-07-25");
        const [rows]: any = await conn.query(
          `SELECT date, branchId, totalRevenue, staffWageExpense, managerWageExpense, partTimeWageExpense, staffDrinkExpense, salesIncentiveExpense, liquorCostExpense, totalExpenses, netProfit
           FROM dailySalesRecords WHERE branchId=? AND date=?`,
          [branchIdParam, date]
        );
        return res.json({ mode, branchId: branchIdParam, date, rows });
      }

      if (mode === "checkreport") {
        const branchIdParam = req.query.branchId;
        const dates = String(req.query.dates || "2026-07-11,2026-07-13").split(",");
        const results: any[] = [];
        for (const date of dates) {
          const [reports]: any = branchIdParam
            ? await conn.query(
                `SELECT id, branchId, date, teamCount, notes, cashAmount, cardAmount, createdAt, updatedAt FROM tableReports WHERE branchId=? AND date=?`,
                [Number(branchIdParam), date]
              )
            : await conn.query(
                `SELECT id, branchId, date, teamCount, notes, cashAmount, cardAmount, createdAt, updatedAt FROM tableReports WHERE date=?`,
                [date]
              );
          const reportsArr = Array.isArray(reports) ? reports : [];
          const perReport: any[] = [];
          for (const r of reportsArr) {
            const [it]: any = await conn.query(`SELECT id, tableNumber, amount, memo FROM tableItems WHERE tableReportId=?`, [r.id]);
            perReport.push({ ...r, itemsCount: it.length });
          }
          results.push({ date, reportsFound: reportsArr.length, reports: perReport });
        }
        return res.json({ mode, branchIdParam: branchIdParam ?? "ALL", results });
      }

      if (mode === "liquorcostcheck") {
        try {
          const branchId = Number(req.query.branchId) || 6;
          const date = String(req.query.date || new Date().toISOString().slice(0, 10));
          const { calculateLiquorCostExpense } = await import("./_core/settlementCalculations");
          const cost = await calculateLiquorCostExpense(branchId, date);
          const [rec]: any = await conn.query(
            `SELECT liquorCostExpense, totalExpenses, netProfit, totalRevenue FROM dailySalesRecords WHERE branchId=? AND date=?`,
            [branchId, date]
          );
          return res.json({ mode, branchId, date, calculatedCost: cost, dbRecord: rec?.[0] ?? null });
        } catch (e: any) {
          return res.json({ mode, ok: false, error: (e?.message ?? String(e)).slice(0, 500) });
        }
      }

      if (mode === "geminicheck") {
        try {
          const { invokeLLM } = await import("./_core/llm");
          const start = Date.now();
          const resp = await invokeLLM({
            messages: [{ role: "user", content: "hi, reply with just OK" }],
          });
          return res.json({
            mode,
            ok: true,
            elapsedMs: Date.now() - start,
            reply: resp.choices?.[0]?.message?.content ?? null,
          });
        } catch (e: any) {
          return res.json({
            mode,
            ok: false,
            error: (e?.message ?? String(e)).slice(0, 500),
          });
        }
      }

      if (mode === "accountscheck") {
        const [rows] = await conn.query(
          `SELECT id, loginId, role, branchId FROM storeAccounts ORDER BY loginId`
        );
        return res.json({ mode, rows });
      }

      if (mode === "fixliquor0721") {
        // [1회성 데이터 수정] 대치점(branchId=2) 7/21 정산에 남아있던 유령 주류원가(889000) 제거
        //   실제 출고기록 없음(calculatedCost=0) 확인됨. 이 값만 0으로 되돌리고 totalExpenses/netProfit 재계산.
        const [rows] = await conn.query(
          `SELECT id, liquorCostExpense, totalExpenses, netProfit FROM dailySalesRecords WHERE branchId = 2 AND date = '2026-07-21' LIMIT 1`
        );
        const rec = (rows as any[])[0];
        if (!rec) return res.json({ mode, result: "no record found, nothing to fix" });
        const liquorCost = Number(rec.liquorCostExpense || 0);
        const newTotalExpenses = Number(rec.totalExpenses || 0) - liquorCost;
        const newNetProfit = Number(rec.netProfit || 0) + liquorCost;
        await conn.query(
          `UPDATE dailySalesRecords SET liquorCostExpense = '0', totalExpenses = ?, netProfit = ? WHERE id = ?`,
          [String(newTotalExpenses), String(newNetProfit), rec.id]
        );
        return res.json({ mode, result: "fixed", before: rec, after: { liquorCostExpense: "0", totalExpenses: String(newTotalExpenses), netProfit: String(newNetProfit) } });
      }

      if (mode === "dupitems") {
        const [rows] = await conn.query(
          `SELECT name, COUNT(*) as cnt, GROUP_CONCAT(id) as ids
           FROM liquorItems
           GROUP BY name
           HAVING cnt > 1`
        );
        return res.json({ mode, duplicates: rows });
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
        const [branch1Count]: any = await conn.query(
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
          activeProvider: gkey ? "gemini" : key ? "openai" : "none",
        });
      }

      if (mode === "staffcheck") {
        const [rows] = await conn.query(
          `SELECT si.id, si.staffName, si.staffType, si.workStart, si.workEnd,
                  tr.date, tr.branchId
           FROM staffIncentives si
           JOIN tableReports tr ON tr.id = si.tableReportId
           WHERE tr.branchId = 2 AND tr.date BETWEEN '2026-06-29' AND '2026-07-05'
             AND si.staffName IN ('유주','가을')
           ORDER BY tr.date, si.staffName`
        );
        return res.json({ mode, rows });
      }

      return res.status(400).json({ error: "mode must be schema|data|status|verify|staffcheck" });
    } catch (e: any) {
      return res.status(500).json({ error: (e?.message || String(e)).slice(0, 300) });
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  });
}
