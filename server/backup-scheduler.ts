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
const BACKUP_BRANCH = 'backups';

// KST 기준 오늘 날짜 문자열
function todayKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// KST 기준 현재 시:분 (HH-mm, 파일명용)
function nowTimeKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(11, 16).replace(':', '-');
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
    lastPushError = 'GITHUB_BACKUP_TOKEN 미설정';
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
  if (!res.ok) {
    lastPushError = res.status === 401 ? 'GitHub 인증 실패 (토큰 만료 가능성)' : `GitHub 업로드 실패 (HTTP ${res.status})`;
  }
  return res.ok;
}

// [백업 상태 기록] 마지막 성공/실패 시각과 사유를 DB에 남겨 관리자 화면에서 확인할 수 있게 함
let lastPushError = '';
async function recordBackupStatus(ok: boolean, error: string): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.execute(sql`CREATE TABLE IF NOT EXISTS backupStatus (
      id INT PRIMARY KEY,
      lastAttemptAt DATETIME NULL,
      lastSuccessAt DATETIME NULL,
      lastError VARCHAR(500) NULL
    )`);
    if (ok) {
      await db.execute(sql`INSERT INTO backupStatus (id, lastAttemptAt, lastSuccessAt, lastError) VALUES (1, NOW(), NOW(), NULL)
        ON DUPLICATE KEY UPDATE lastAttemptAt = NOW(), lastSuccessAt = NOW(), lastError = NULL`);
    } else {
      await db.execute(sql`INSERT INTO backupStatus (id, lastAttemptAt, lastSuccessAt, lastError) VALUES (1, NOW(), NULL, ${error.slice(0, 500)})
        ON DUPLICATE KEY UPDATE lastAttemptAt = NOW(), lastError = ${error.slice(0, 500)}`);
    }
  } catch (e) {
    console.error('[backup] 상태 기록 실패:', e);
  }
}

export async function getBackupStatus(): Promise<{ lastAttemptAt: string | null; lastSuccessAt: string | null; lastError: string | null; hoursSinceSuccess: number | null }> {
  const db = await getDb();
  if (!db) return { lastAttemptAt: null, lastSuccessAt: null, lastError: 'DB 연결 실패', hoursSinceSuccess: null };
  await db.execute(sql`CREATE TABLE IF NOT EXISTS backupStatus (
    id INT PRIMARY KEY, lastAttemptAt DATETIME NULL, lastSuccessAt DATETIME NULL, lastError VARCHAR(500) NULL
  )`);
  const rows: any = await db.execute(sql`SELECT lastAttemptAt, lastSuccessAt, lastError FROM backupStatus WHERE id = 1 LIMIT 1`);
  const data = Array.isArray(rows) && Array.isArray(rows[0]) ? rows[0] : rows;
  const row = (data as any[])?.[0];
  if (!row) return { lastAttemptAt: null, lastSuccessAt: null, lastError: '백업 기록 없음', hoursSinceSuccess: null };
  const toIso = (v: any) => (v ? new Date(v).toISOString() : null);
  const lastSuccessAt = toIso(row.lastSuccessAt);
  const hoursSinceSuccess = lastSuccessAt ? (Date.now() - new Date(lastSuccessAt).getTime()) / 3600000 : null;
  return { lastAttemptAt: toIso(row.lastAttemptAt), lastSuccessAt, lastError: row.lastError ?? null, hoursSinceSuccess };
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
export async function runDailyBackup(): Promise<{ ok: boolean; error?: string }> {
  const dateStr = todayKST();
  console.log(`[backup] ${dateStr} 백업 시작`);
  lastPushError = '';

  try {
    const snapshot = await takeSnapshot();
    const json = JSON.stringify(snapshot, null, 2);
    const timeStr = nowTimeKST();

    // 0) 시각별 스냅샷 저장: backups/snapshots/2026-07-14_08-05.json (하루 여러 번, 서로 덮어쓰지 않음)
    const snapshotPath = `backups/snapshots/${dateStr}_${timeStr}.json`;
    await pushToGitHub(
      snapshotPath,
      json,
      `[backup] 스냅샷 ${dateStr} ${timeStr} KST`
    );

    // 1) 날짜별 파일 저장: backups/2026-06-01.json (그날의 가장 최신 상태로 계속 갱신)
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
      await recordBackupStatus(true, '');
      return { ok: true };
    } else {
      const error = lastPushError || `백업 일부 실패 (daily=${ok1}, latest=${ok2})`;
      console.error(`[backup] ${dateStr} ${error}`);
      await recordBackupStatus(false, error);
      return { ok: false, error };
    }
  } catch (err: any) {
    const error = `백업 오류: ${err?.message || String(err)}`;
    console.error('[backup]', error);
    await recordBackupStatus(false, error);
    return { ok: false, error };
  }
}

// 2시간마다 실행하는 스케줄러 (최악의 경우에도 데이터 손실 범위를 2시간 이내로 제한)
export function startBackupScheduler(): void {
  console.log('[backup] 자동 백업 스케줄러 시작 (2시간 간격)');

  const INTERVAL_MS = 2 * 60 * 60 * 1000; // 2시간

  async function runAndReschedule() {
    await runDailyBackup();
    const nextRun = new Date(Date.now() + INTERVAL_MS);
    console.log(`[backup] 다음 백업 예정: ${nextRun.toISOString()} (약 2시간 후)`);
    setTimeout(runAndReschedule, INTERVAL_MS);
  }

  // [긴급수정] 서버 기동 즉시 백업하면, 그 백업 커밋이 새 배포를 유발하고
  //   그 새 배포가 켜지자마자 또 즉시 백업하는 식으로 배포가 꼬리를 무는
  //   무한루프가 발생할 수 있음이 확인됨. 기동 후 10분 지연 후 첫 백업 실행.
  setTimeout(runAndReschedule, 10 * 60 * 1000);
}
