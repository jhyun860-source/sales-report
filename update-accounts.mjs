import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

const conn = await mysql.createConnection(DATABASE_URL);

// 1. 관리자 계정: loginId를 admin → v1, 비밀번호 → 1234
const adminHash = await bcrypt.hash('1234', 10);
const [adminResult] = await conn.execute(
  "UPDATE storeAccounts SET loginId = 'v1', passwordHash = ? WHERE loginId = 'admin'",
  [adminHash]
);
console.log('관리자 계정 변경:', adminResult.affectedRows, '행 업데이트');

// 2. 대치점(d1) 비밀번호: 1224 → 1234
const dachiHash = await bcrypt.hash('1234', 10);
const [dachiResult] = await conn.execute(
  "UPDATE storeAccounts SET passwordHash = ? WHERE loginId = 'd1'",
  [dachiHash]
);
console.log('대치점 비밀번호 변경:', dachiResult.affectedRows, '행 업데이트');

// 결과 확인
const [accounts] = await conn.execute(
  "SELECT id, loginId, displayName, role FROM storeAccounts ORDER BY id"
);
console.log('\n현재 계정 목록:');
for (const acc of accounts) {
  console.log(`  - ${acc.loginId} (${acc.displayName}) [${acc.role}]`);
}

await conn.end();
console.log('\n완료!');
