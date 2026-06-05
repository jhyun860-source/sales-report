import mysql from 'mysql2/promise';
import fs from 'fs/promises';
import { execSync } from 'child_process';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  const tables = [
    'dailySalesRecords',
    'tableReports',
    'tableItems',
    'staffIncentives',
    'liquorInventories',
    'liquorStockMovements',
    'liquorItems',
    'branchSettings'
  ];
  
  const backup = {};
  
  console.log('=== TiDB Backup Started ===\n');
  
  for (const table of tables) {
    try {
      const [rows] = await conn.execute(`SELECT * FROM ${table}`);
      backup[table] = rows;
      console.log(`✅ ${table}: ${rows.length} rows`);
    } catch (e) {
      console.error(`❌ ${table}: ${e.message}`);
      backup[table] = [];
    }
  }
  
  await conn.end();
  
  // Save to file
  const backupJson = JSON.stringify(backup, null, 2);
  await fs.writeFile('/home/ubuntu/sales-report/backup-2026-06-05.json', backupJson);
  console.log('\n✅ Backup saved to backup-2026-06-05.json');
  
  // Git operations
  console.log('\n=== Uploading to GitHub ===');
  try {
    execSync('cd /home/ubuntu/sales-report && git add backup-2026-06-05.json', { stdio: 'inherit' });
    execSync('cd /home/ubuntu/sales-report && git commit -m "Backup: 2026-06-05 full database export"', { stdio: 'inherit' });
    execSync('cd /home/ubuntu/sales-report && git push user_github main', { stdio: 'inherit' });
    console.log('✅ Uploaded to GitHub');
  } catch (e) {
    console.error('❌ Git error:', e.message);
  }
  
  console.log('\n=== Backup Summary ===');
  for (const table of tables) {
    console.log(`${table}: ${backup[table].length} rows`);
  }
}
main().catch(console.error);
