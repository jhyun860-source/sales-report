const mysql = require('mysql2/promise');
const url = require('url');
const fs = require('fs');
const path = require('path');

(async () => {
  const dbUrl = process.env.DATABASE_URL;
  const parsed = new url.URL(dbUrl);
  
  const connection = await mysql.createConnection({
    host: parsed.hostname,
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.substring(1),
    ssl: {
      rejectUnauthorized: false
    },
    waitForConnections: true
  });
  
  console.log('백업 시작...');
  
  // 모든 테이블 목록 조회
  const [tables] = await connection.execute(
    'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()'
  );
  
  const backup = {};
  let totalRows = 0;
  
  for (const table of tables) {
    const tableName = table.TABLE_NAME;
    console.log(`[${tableName}] 백업 중...`);
    
    const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
    backup[tableName] = rows;
    totalRows += rows.length;
    console.log(`  → ${rows.length}개 행`);
  }
  
  // backups 디렉토리 생성
  const backupDir = 'backups';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // 백업 파일 저장
  const backupFile = path.join(backupDir, 'backup-2026-06-05-before-manager-wage.json');
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  
  console.log(`\n✅ 백업 완료: ${backupFile}`);
  console.log(`총 ${tables.length}개 테이블, ${totalRows}개 행`);
  
  // 각 테이블 row 수 출력
  console.log('\n=== 테이블별 행 수 ===');
  for (const table of tables) {
    const tableName = table.TABLE_NAME;
    const count = backup[tableName].length;
    console.log(`${tableName}: ${count}개`);
  }
  
  await connection.end();
})().catch(err => console.error(err.message));
