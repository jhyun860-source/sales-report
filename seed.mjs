import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const BRANCHES = [
  { name: '선릉점', code: 'seolleung' },
  { name: '대치점', code: 'daechi' },
  { name: '삼성점', code: 'samsung' },
  { name: '문정 1호점', code: 'munjeong1' },
  { name: '문정2호점', code: 'munjeong2' },
];

const ACCOUNTS = [
  { loginId: 's1', password: '1234', displayName: '선릉점 점장', branchCode: 'seolleung', role: 'user' },
  { loginId: 'd1', password: '1224', displayName: '대치점 점장', branchCode: 'daechi', role: 'user' },
  { loginId: 's2', password: '1234', displayName: '삼성점 점장', branchCode: 'samsung', role: 'user' },
  { loginId: 'm1', password: '1234', displayName: '문정1호점 점장', branchCode: 'munjeong1', role: 'user' },
  { loginId: 'm2', password: '1234', displayName: '문정2호점 점장', branchCode: 'munjeong2', role: 'user' },
  { loginId: 'admin', password: 'admin1234', displayName: '관리자', branchCode: null, role: 'admin' },
];

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  console.log('🌱 시드 데이터 생성 시작...\n');

  // 지점 생성
  const branchIds = {};
  for (const branch of BRANCHES) {
    // 이미 있는지 확인
    const [existing] = await conn.execute('SELECT id FROM branches WHERE code = ?', [branch.code]);
    if (existing.length > 0) {
      branchIds[branch.code] = existing[0].id;
      console.log(`✅ 지점 이미 존재: ${branch.name} (id: ${existing[0].id})`);
    } else {
      const [result] = await conn.execute(
        'INSERT INTO branches (name, code, ownerId) VALUES (?, ?, 1)',
        [branch.name, branch.code]
      );
      branchIds[branch.code] = result.insertId;
      console.log(`✅ 지점 생성: ${branch.name} (id: ${result.insertId})`);
    }
  }

  console.log('');

  // 계정 생성
  for (const account of ACCOUNTS) {
    const [existing] = await conn.execute('SELECT id FROM storeAccounts WHERE loginId = ?', [account.loginId]);
    if (existing.length > 0) {
      console.log(`⚠️  계정 이미 존재: ${account.loginId} - 비밀번호 업데이트`);
      const passwordHash = await bcrypt.hash(account.password, 10);
      await conn.execute(
        'UPDATE storeAccounts SET passwordHash = ?, displayName = ?, branchId = ?, role = ? WHERE loginId = ?',
        [passwordHash, account.displayName, account.branchCode ? branchIds[account.branchCode] : null, account.role, account.loginId]
      );
    } else {
      const passwordHash = await bcrypt.hash(account.password, 10);
      const branchId = account.branchCode ? branchIds[account.branchCode] : null;
      await conn.execute(
        'INSERT INTO storeAccounts (loginId, passwordHash, displayName, branchId, role) VALUES (?, ?, ?, ?, ?)',
        [account.loginId, passwordHash, account.displayName, branchId, account.role]
      );
      console.log(`✅ 계정 생성: ${account.loginId} (${account.displayName}) - 지점: ${account.branchCode || '없음'}`);
    }
  }

  console.log('\n🎉 시드 완료!\n');
  console.log('📋 로그인 정보:');
  console.log('─────────────────────────────────────');
  console.log('지점        | 아이디 | 비밀번호');
  console.log('─────────────────────────────────────');
  console.log('선릉점      | s1     | 1234');
  console.log('대치점      | d1     | 1224');
  console.log('삼성점      | s2     | 1234');
  console.log('문정 1호점  | m1     | 1234');
  console.log('문정2호점   | m2     | 1234');
  console.log('관리자      | admin  | admin1234');
  console.log('─────────────────────────────────────');

  await conn.end();
}

seed().catch(e => {
  console.error('❌ 시드 실패:', e);
  process.exit(1);
});
