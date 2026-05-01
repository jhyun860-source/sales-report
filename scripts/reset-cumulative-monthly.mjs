/**
 * 매월 1일 누적금액 리셋 스크립트
 * 5월 1일 00:00:00 (KST)에 실행되어 모든 지점의 현금/카드 누적금액을 리셋합니다.
 * 
 * 사용법:
 * node scripts/reset-cumulative-monthly.mjs
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('❌ DATABASE_URL 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// MySQL 연결 문자열 파싱
function parseDbUrl(url) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!match) {
    throw new Error('Invalid DATABASE_URL format');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

async function resetCumulativeAmounts() {
  let connection;
  
  try {
    const config = parseDbUrl(DB_URL);
    connection = await mysql.createConnection(config);
    
    console.log('📊 매월 누적금액 리셋 작업 시작...');
    console.log(`⏰ 현재 시간: ${new Date().toISOString()}`);
    
    // 1. 모든 지점의 현금/카드 누적금액을 0으로 리셋
    const [result] = await connection.execute(`
      UPDATE dailySalesRecords 
      SET 
        cashTotal = 0,
        cardTotal = 0,
        updatedAt = NOW()
      WHERE DATE_FORMAT(date, '%m-%d') = '05-01'
    `);
    
    console.log(`✅ 5월 1일 기록 업데이트: ${result.affectedRows}건`);
    
    // 2. 5월 1일 이후의 모든 기록 조회
    const [records] = await connection.execute(`
      SELECT id, branchId, date, cash, card 
      FROM dailySalesRecords 
      WHERE date >= DATE_FORMAT(CURDATE(), '%Y-05-01')
      ORDER BY branchId, date ASC
    `);
    
    console.log(`📝 재계산 대상 기록: ${records.length}건`);
    
    // 3. 각 지점별로 누적금액 재계산
    const branchMap = new Map();
    
    for (const record of records) {
      const { id, branchId, date, cash, card } = record;
      const cashNum = parseInt(cash || 0);
      const cardNum = parseInt(card || 0);
      
      // 지점별 누적값 초기화
      if (!branchMap.has(branchId)) {
        branchMap.set(branchId, { cashTotal: 0, cardTotal: 0 });
      }
      
      const branch = branchMap.get(branchId);
      
      // 일요일 체크
      const dateObj = new Date(date + 'T12:00:00');
      const isSunday = dateObj.getDay() === 0;
      
      // 일요일이 아니면 누적
      if (!isSunday) {
        branch.cashTotal += cashNum;
        branch.cardTotal += cardNum;
      }
      
      // DB 업데이트
      await connection.execute(
        `UPDATE dailySalesRecords SET cashTotal = ?, cardTotal = ?, updatedAt = NOW() WHERE id = ?`,
        [branch.cashTotal, branch.cardTotal, id]
      );
    }
    
    console.log(`\n✨ 누적금액 재계산 완료`);
    console.log(`📊 처리된 지점 수: ${branchMap.size}개`);
    
    // 4. 결과 확인
    const [summary] = await connection.execute(`
      SELECT 
        branchId,
        COUNT(*) as recordCount,
        MAX(cashTotal) as maxCashTotal,
        MAX(cardTotal) as maxCardTotal
      FROM dailySalesRecords
      WHERE date >= DATE_FORMAT(CURDATE(), '%Y-05-01')
      GROUP BY branchId
      ORDER BY branchId
    `);
    
    console.log('\n📈 지점별 현황:');
    for (const row of summary) {
      console.log(
        `  지점 ${row.branchId}: ${row.recordCount}건, ` +
        `현금누적 ${row.maxCashTotal}, 카드누적 ${row.maxCardTotal}`
      );
    }
    
    console.log('\n✅ 매월 누적금액 리셋 작업 완료!');
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 실행
resetCumulativeAmounts();
