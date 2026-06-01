import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'sales_report',
});

try {
  console.log('Adding managerWageExpense column...');
  await connection.execute(`
    ALTER TABLE dailySalesRecords
    ADD COLUMN managerWageExpense DECIMAL(15,0) DEFAULT 0 NOT NULL;
  `);
  console.log('✓ Column added successfully');

  console.log('\nChecking column...');
  const [rows] = await connection.execute(`
    SHOW COLUMNS FROM dailySalesRecords LIKE 'managerWageExpense';
  `);
  
  console.log('\nResult:');
  console.table(rows);
} catch (error) {
  console.error('Error:', error.message);
} finally {
  await connection.end();
}
