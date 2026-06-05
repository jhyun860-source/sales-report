const https = require('https');
const mysql = require('mysql2/promise');

async function main() {
  // GitHub에서 백업 파일 다운로드
  const token = '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';
  const url = 'https://api.github.com/repos/jhyun860-source/sales-report/contents/backups/backup-2026-06-04.json';
  
  const data = await new Promise((resolve, reject) => {
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
  
  const backup = JSON.parse(Buffer.from(data.content, 'base64').toString());
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
