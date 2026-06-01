/**
 * DB 자동 백업 스케줄러
 * - 매일 자정(KST 00:05) DB 스냅샷을 GitHub backups/ 폴더에 커밋
 * - 백업 대상: dailySalesRecords, tableReports, tableItems, staffIncentives,
 *              liquorInventories, liquorStockMovements, liquorHiddenItems, liquorItems
 * - 복구: Claude에게 "YYYY-MM-DD로 복구해줘" 요청
 */

import { getDb } from './db';
import { sql } from 'drizzle-orm';

const GITHUB_TOKEN = process.env.GITHUB_BACKUP_TOKEN ?? '';
const GITHUB_REPO = 'jhyun860-source/sales-report';
const BACKUP_BRANCH = 'main';

// KST 기준 오늘 날짜 문자열
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// GitHub API: 파일 존재 여부 + sha 조회
async function getFileSha(path: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}?ref=${BACKUP_BRANCH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { sha: string };
    return data.sha ?? null;
  } catch {
    return null;
  }
}

// GitHub API: 파일 생성 또는 업데이트
async function pushToGitHub(path: string, content: string, message: string): Promise<boolean> {
  if (!GITHUB_TOKEN) {
    console.warn('[backup] GITHUB_BACKUP_TOKEN 미설정 - 백업 스킵');
    return false;
  }
  const sha = await getFileSha(path);
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch: BACKUP_BRANCH,
  };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  return res.ok;
}

// DB 전체 스냅샷 추출
async function takeSnapshot(): Promise<Record<string, unknown[]>> {
  const db = await getDb();
  if (!db) throw new Error('DB 연결 실패');

  const tables = [
    'branches',
    'dailySalesRecords',
    'tableReports',
    'tableItems',
    'staffIncentives',
    'liquorItems',
    'liquorInventories',
    'liquorStockMovements',
    'liquorHiddenItems',
  ];

  const snapshot: Record<string, unknown[]> = {};
  for (const table of tables) {
    const rows = await db.execute(sql.raw(`SELECT * FROM \`${table}\``));
    // TiDB 드라이버는 [rows, fields] 형태로 반환
    const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
    snapshot[table] = (data as unknown[]);
  }
  return snapshot;
}

// 메인 백업 함수 (외부에서도 호출 가능)
export async function runDailyBackup(): Promise<void> {
  const dateStr = todayKST();
  console.log(`[backup] ${dateStr} 백업 시작`);

  try {
    const snapshot = await takeSnapshot();
    const json = JSON.stringify(snapshot, null, 2);

    // 1) 날짜별 파일 저장: backups/2026-06-01.json
    const dailyPath = `backups/${dateStr}.json`;
    const ok1 = await pushToGitHub(
      dailyPath,
      json,
      `[backup] ${dateStr} 자동 DB 스냅샷`
    );

    // 2) latest.json 항상 최신 유지
    const ok2 = await pushToGitHub(
      'backups/latest.json',
      json,
      `[backup] latest 갱신 (${dateStr})`
    );

    // 3) 백업 인덱스 파일 업데이트
    const indexPath = 'backups/index.json';
    const existingIndexSha = await getFileSha(indexPath);
    let indexData: { date: string; file: string; createdAt: string }[] = [];
    if (existingIndexSha) {
      const res = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${indexPath}?ref=${BACKUP_BRANCH}`,
        { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
      );
      const d = await res.json() as { content: string };
      try {
        indexData = JSON.parse(Buffer.from(d.content, 'base64').toString('utf-8'));
      } catch {}
    }
    // 중복 날짜 제거 후 추가
    indexData = indexData.filter(e => e.date !== dateStr);
    indexData.unshift({ date: dateStr, file: dailyPath, createdAt: new Date().toISOString() });
    // 최근 90일치만 유지
    indexData = indexData.slice(0, 90);
    await pushToGitHub(
      indexPath,
      JSON.stringify(indexData, null, 2),
      `[backup] index 갱신 (${dateStr})`
    );

    if (ok1 && ok2) {
      console.log(`[backup] ${dateStr} 백업 완료 → backups/${dateStr}.json`);
    } else {
      console.error(`[backup] ${dateStr} 백업 일부 실패 (ok1=${ok1}, ok2=${ok2})`);
    }
  } catch (err) {
    console.error('[backup] 백업 오류:', err);
  }
}

// 매일 KST 00:05에 실행하는 스케줄러
export function startBackupScheduler(): void {
  console.log('[backup] 자동 백업 스케줄러 시작');

  function scheduleNext() {
    const now = new Date();
    // KST = UTC+9 → 목표: 다음 KST 00:05 = UTC 전날 15:05
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const nextRun = new Date(kstNow);
    nextRun.setUTCHours(0, 5, 0, 0); // KST 00:05
    if (nextRun <= kstNow) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }
    // UTC 기준으로 변환
    const nextRunUTC = new Date(nextRun.getTime() - 9 * 60 * 60 * 1000);
    const msUntilRun = nextRunUTC.getTime() - now.getTime();

    console.log(`[backup] 다음 백업 예정: ${nextRun.toISOString().slice(0, 16)} KST (${Math.round(msUntilRun / 60000)}분 후)`);

    setTimeout(async () => {
      await runDailyBackup();
      scheduleNext(); // 다음 날 예약
    }, msUntilRun);
  }

  scheduleNext();
}
