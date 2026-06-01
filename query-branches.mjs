import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB 연결 실패');
      process.exit(1);
    }

    // 1. branches 테이블 조회
    console.log('[branches 테이블]\n');
    const branchesResult = await db.execute(sql.raw(`
      SELECT id, branchId, name FROM branches
    `));
    
    const branches = Array.isArray(branchesResult) ? (Array.isArray(branchesResult[0]) ? branchesResult[0] : branchesResult) : branchesResult;
    console.log('id | branchId | name');
    console.log('---|----------|-----');
    if (Array.isArray(branches)) {
      branches.forEach(row => {
        console.log(`${row.id} | ${row.branchId} | ${row.name}`);
      });
    }

    // 2. 문정2호점 찾기
    let munjeong2BranchId = null;
    if (Array.isArray(branches)) {
      const munjeong2 = branches.find(b => b.name === '문정2호점');
      if (munjeong2) {
        munjeong2BranchId = munjeong2.branchId || munjeong2.id;
        console.log(`\n✓ 문정2호점 branchId: ${munjeong2BranchId}`);
      }
    }

    if (!munjeong2BranchId) {
      console.error('\n✗ 문정2호점을 찾을 수 없습니다');
      process.exit(1);
    }

    // 3. 2026-05-01 dailySalesRecords 조회
    console.log(`\n[dailySalesRecords - 2026-05-01, branchId=${munjeong2BranchId}]\n`);
    const recordsResult = await db.execute(sql.raw(`
      SELECT id, branchId, date, cash, card FROM dailySalesRecords 
      WHERE date = '2026-05-01' AND branchId = ${munjeong2BranchId}
    `));
    
    const records = Array.isArray(recordsResult) ? (Array.isArray(recordsResult[0]) ? recordsResult[0] : recordsResult) : recordsResult;
    
    if (Array.isArray(records) && records.length > 0) {
      console.log('id | branchId | date | cash | card');
      console.log('---|----------|------|------|-----');
      records.forEach(row => {
        console.log(`${row.id} | ${row.branchId} | ${row.date} | ${row.cash} | ${row.card}`);
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
