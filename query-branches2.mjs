import { getDb } from './server/db.ts';
import { branches } from './drizzle/schema.ts';

async function main() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('DB 연결 실패');
      process.exit(1);
    }

    // 1. branches 테이블 조회 (Drizzle ORM)
    console.log('[branches 테이블]\n');
    const branchesData = await db.select().from(branches);
    
    console.log('id | name');
    console.log('---|-----');
    branchesData.forEach(row => {
      console.log(`${row.id} | ${row.name}`);
    });

    // 2. 문정2호점 찾기
    const munjeong2 = branchesData.find(b => b.name === '문정2호점');
    if (!munjeong2) {
      console.error('\n✗ 문정2호점을 찾을 수 없습니다');
      process.exit(1);
    }
    
    const munjeong2BranchId = munjeong2.id;
    console.log(`\n✓ 문정2호점 branchId: ${munjeong2BranchId}`);

    // 3. 2026-05-01 dailySalesRecords 조회
    console.log(`\n[dailySalesRecords - 2026-05-01, branchId=${munjeong2BranchId}]\n`);
    
    const { dailySalesRecords } = await import('./drizzle/schema.ts');
    const { eq } = await import('drizzle-orm');
    
    const records = await db.select().from(dailySalesRecords)
      .where(eq(dailySalesRecords.date, '2026-05-01'))
      .where(eq(dailySalesRecords.branchId, munjeong2BranchId));
    
    if (records.length > 0) {
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
