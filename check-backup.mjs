import https from 'https';

async function main() {
  const token = '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';
  const url = 'https://api.github.com/repos/jhyun860-source/sales-report/contents/backups/backup-2026-06-04.json';
  
  const data = await new Promise((resolve, reject) => {
    const req = https.request(url, {
      headers: { 'Authorization': 'token ' + token, 'User-Agent': 'node' }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        resolve(body);
      });
    });
    req.on('error', reject);
    req.end();
  });
  
  console.log('Response length:', data.length);
  console.log('First 500 chars:', data.substring(0, 500));
}
main().catch(console.error);
