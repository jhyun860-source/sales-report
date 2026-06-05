import https from 'https';
import mysql from 'mysql2/promise';

async function main() {
  const token = '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';
  const url = 'https://api.github.com/repos/jhyun860-source/sales-report/contents/backups/backup-2026-06-04.json';
  
  // Step 1: Get file metadata
  const metadata = await new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: { 'Authorization': 'token ' + token, 'User-Agent': 'node' }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
  
  console.log('File size:', metadata.size);
  
  // Step 2: Download actual file from download_url
  const backup = await new Promise((resolve, reject) => {
    const req = https.request(metadata.download_url, {
      headers: { 'User-Agent': 'node' }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
  
  const records = backup.dailySalesRecords;
  console.log('복구할 레코드 수:', records.length);
  
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  let success = 0;
  for (const r of records) {
    if (!r.totalRevenue || Number(r.totalRevenue) === 0) continue;
    try {
      await conn.execute(
        'UPDATE dailySalesRecords SET totalRevenue=?, commissionExpense=?, rentExpense=?, managementFeeExpense=?, staffWageExpense=?, managerWageExpense=?, partTimeWageExpense=?, liquorCostExpense=?, staffDrinkExpense=?, otherExpense=?, totalExpenses=?, netProfit=?, staffCount=?, partTimeCount=?, cash=?, card=? WHERE id=?',
        [r.totalRevenue, r.commissionExpense, r.rentExpense, r.managementFeeExpense, r.staffWageExpense, r.managerWageExpense, r.partTimeWageExpense, r.liquorCostExpense, r.staffDrinkExpense, r.otherExpense, r.totalExpenses, r.netProfit, r.staffCount, r.partTimeCount, r.cash, r.card, r.id]
      );
      success++;
    } catch(e) {}
  }
  
  console.log('복구 완료:', success, '건');
  await conn.end();
}
main().catch(console.error);
