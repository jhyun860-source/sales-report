import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB 연결 실패');
      process.exit(1);
    }

    console.log('[staffIncentives - branchId=5, date=2026-05-01]\n');
    
    const result = await db.execute(sql.raw(`
      SELECT si.* FROM staffIncentives si
      JOIN tableReports tr ON si.tableReportId = tr.id
      WHERE tr.branchId = 5 AND tr.date = '2026-05-01'
    `));
    
    const rows = Array.isArray(result) ? (Array.isArray(result[0]) ? result[0] : result) : result;
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log(`조회 결과: ${rows.length}명\n`);
      rows.forEach((row, idx) => {
        console.log(`[${idx + 1}] ${JSON.stringify(row, null, 2)}`);
      });
    } else {
      console.log('(조회 결과 없음)');
    }

    process.exit(0);
  } catch (error) {
    console.error('에러:', error.message);
    process.exit(1);
  }
}

main();
