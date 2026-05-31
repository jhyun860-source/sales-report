/**
 * 지점별 초기 설정값 세팅 스크립트
 * 실행: node scripts/setup-branch-settings.mjs
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL 환경변수가 필요합니다');
  process.exit(1);
}

// DATABASE_URL 파싱
const url = new URL(DATABASE_URL.replace('mysql://', 'http://'));
const connection = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', '').split('?')[0],
  ssl: { rejectUnauthorized: true },
});

console.log('✅ DB 연결 성공');

// 지점별 설정값
const branchSettings = [
  {
    name: '대치점',
    monthlyRent: 9000000,
    managementFee: 0,
    staffDailyWage: 136363,
    partTimeHourlyWage: 20000,
    commissionRate: 0.17,
    hasManager: 1,
    managerDailyWage: 272727,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
  {
    name: '선릉점',
    monthlyRent: 6500000,
    managementFee: 0,
    staffDailyWage: 136363,
    partTimeHourlyWage: 20000,
    commissionRate: 0.17,
    hasManager: 1,
    managerDailyWage: 250000,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
  {
    name: '삼성점',
    monthlyRent: 6500000,
    managementFee: 0,
    staffDailyWage: 159090,
    partTimeHourlyWage: 20000,
    commissionRate: 0.17,
    hasManager: 1,
    managerDailyWage: 181818,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
  {
    name: '문정1호점',
    monthlyRent: 4500000,
    managementFee: 0,
    staffDailyWage: 136363,
    partTimeHourlyWage: 20000,
    commissionRate: 0.17,
    hasManager: 1,
    managerDailyWage: 204545,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
  {
    name: '문정2호점',
    monthlyRent: 4500000,
    managementFee: 30000,
    staffDailyWage: 136363,
    partTimeHourlyWage: 20000,
    commissionRate: 0.17,
    hasManager: 0,        // 점장 없음
    managerDailyWage: 0,
    glassUnitPrice: 5000,
    bottleUnitPrice: 10000,
    beerBottleUnitPrice: 3000,
  },
];

for (const branch of branchSettings) {
  const [rows] = await connection.execute(
    'SELECT id, name FROM branches WHERE name = ?',
    [branch.name]
  );

  if (rows.length === 0) {
    console.log(`⚠️  지점 없음: ${branch.name} (건너뜀)`);
    continue;
  }

  await connection.execute(
    `UPDATE branches SET
      monthlyRent = ?,
      managementFee = ?,
      staffDailyWage = ?,
      partTimeHourlyWage = ?,
      commissionRate = ?,
      hasManager = ?,
      managerDailyWage = ?,
      glassUnitPrice = ?,
      bottleUnitPrice = ?,
      beerBottleUnitPrice = ?
    WHERE name = ?`,
    [
      branch.monthlyRent,
      branch.managementFee,
      branch.staffDailyWage,
      branch.partTimeHourlyWage,
      branch.commissionRate,
      branch.hasManager,
      branch.managerDailyWage,
      branch.glassUnitPrice,
      branch.bottleUnitPrice,
      branch.beerBottleUnitPrice,
      branch.name,
    ]
  );

  console.log(`✅ ${branch.name} 설정 완료`);
}

// 결과 확인
const [result] = await connection.execute(
  'SELECT name, monthlyRent, managementFee, staffDailyWage, partTimeHourlyWage, hasManager, managerDailyWage FROM branches ORDER BY name'
);
console.log('\n📋 설정 결과:');
console.table(result);

await connection.end();
console.log('\n✅ 완료!');
