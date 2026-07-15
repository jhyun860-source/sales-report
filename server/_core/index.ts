import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerSettlementsRoutes } from "./settlements";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { startBackupScheduler } from "../backup-scheduler";
// [수정] 서버 시작 시 자동 월초 리셋은 운영 방식과 맞지 않아 비활성화한다.
// 운영팀은 새벽에 전날 매출을 입력하므로 "현재시간"이 아닌 "selectedDate" 기준으로
// 누적이 계산되어야 한다. computeCumulativesForDate()가 selectedDate 기준 월별 합산을
// 책임지므로 서버 부팅 시 자동 리셋은 더 이상 필요 없다.
// import { checkAndResetMonthlyAmounts } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // [수정] 서버 시작 시 자동 누적 리셋 호출 제거.
  //   - 기존: await checkAndResetMonthlyAmounts();
  //   - 이유: "현재시간 1일 00시" 기준으로 모든 지점 누적을 일괄 재계산하면
  //           새벽에 전날(전월 말일) 매출을 입력하기 전에 리셋이 돌아 전월 마감
  //           누적이 사라지거나, 운영 의도와 다른 리셋이 발생할 수 있음.
  //   - 대안: computeCumulativesForDate()가 selectedDate가 속한 월의 1일~selectedDate
  //           직전까지만 SQL로 합산하여 항상 selectedDate 기준의 누적을 계산한다.
  //           수동 리셋이 필요한 경우 systemRouter.manualResetCumulativeAmounts 사용.

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // [일회성] DB 이전 복원 라우트 (이전 완료 후 제거)
  const { registerRestoreRoutes } = await import("../restoreRouter");
  registerRestoreRoutes(app);
  // [진단용] 배포 버전 + DB 연결 상태 확인 (캐시 우회)
  app.get("/version", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    let dbStatus = "unknown";
    let dataCheck: any = null;
    try {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (db) {
        await db.execute("SELECT 1");
        dbStatus = "connected";
        const [b]: any = await db.execute("SELECT COUNT(*) AS c FROM branches");
        const [a]: any = await db.execute("SELECT loginId FROM storeAccounts ORDER BY id LIMIT 20");
        dataCheck = {
          branches: b?.[0]?.c ?? b,
          loginIds: Array.isArray(a) ? a.map((r: any) => r.loginId) : a,
        };
      } else {
        dbStatus = "no DATABASE_URL";
      }
    } catch (e: any) {
      const cause = e?.cause?.message || e?.cause?.code || "";
      dbStatus = "error: " + (cause || (e?.message ?? String(e))).slice(0, 200);
    }
    // 접속 대상 호스트도 표시 (비밀번호 제외)
    let dbHost = "unset";
    try {
      const u = new URL(process.env.DATABASE_URL || "");
      dbHost = `${u.hostname}:${u.port}`;
    } catch { dbHost = "parse-fail"; }
    res.json({
      build: "2026-07-11-v5-railway",
      db: dbStatus,
      dbHost,
      dataCheck,
      time: new Date().toISOString(),
    });
  });
  registerSettlementsRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
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
    // 매일 KST 00:05 자동 DB 백업 스케줄러 시작
    if (process.env.NODE_ENV === 'production') {
      // [긴급 임시조치] 백업 자동커밋이 재배포를 계속 유발하는 문제로 인해
      //   배포 폭풍이 발생, 앱이 계속 다운되는 상황이라 백업 기능을 임시로 완전히 중단함.
      //   앱이 안정화된 후 안전한 방식으로 다시 켤 예정.
      startBackupScheduler();
      console.log('[backup] 임시 비활성화 상태 (배포 안정화 대기중)');
    }
  });
}

startServer().catch(console.error);
// force-redeploy-1784045031
// trigger-fresh-deploy-1784052798
