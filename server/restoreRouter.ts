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

      return res.status(400).json({ error: "mode must be schema|data|status" });
    } catch (e: any) {
      return res.status(500).json({ error: (e?.message || String(e)).slice(0, 300) });
    } finally {
      if (conn) await conn.end().catch(() => {});
    }
  });
}
