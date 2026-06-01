import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'sales_report',
});

try {
  const [rows] = await connection.execute(`SHOW COLUMNS FROM dailySalesRecords;`);
  console.log('\n=== dailySalesRecords 모든 컬럼 ===\n');
  rows.forEach((row, index) => {
    console.log(`${String(index).padStart(2, '0')}. ${row.Field}`);
  });
  console.log(`\n총 ${rows.length}개 컬럼\n`);
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
