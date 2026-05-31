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

async function runMigrations() {
  try {
    const { execSync } = await import('child_process');
    console.log('[DB] Running migrations...');
    execSync('npx drizzle-kit push --force', {
      env: { ...process.env },
      stdio: 'inherit',
    });
    console.log('[DB] Migrations complete');
  } catch (e) {
    console.warn('[DB] Migration warning (continuing):', e instanceof Error ? e.message : e);
  }
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
  app.use((req, res, next) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    next();
  });
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
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

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

runMigrations().then(() => startServer()).catch(console.error);
