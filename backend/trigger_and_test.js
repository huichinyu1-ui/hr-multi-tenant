const https = require('https');

function callApi(path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'hr-api-server-eta.vercel.app',
      path: path,
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json', ...headers }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // 1. 觸發 migrate-db，讓 Vercel 修補 TJS1 的 DB
  console.log('Triggering migrate-db for TJS1...');
  const r1 = await callApi('/api/migrate-db', 'POST', {
    'x-company-code': 'TJS1'
  });
  console.log('migrate-db result:', r1.status, r1.body);

  // 2. 測試 employees
  console.log('\nTesting employees after migration...');
  for (const uid of ['2','3','4','5']) {
    const r = await callApi('/api/employees', 'GET', {
      'x-company-code': 'TJS1',
      'x-user-id': uid,
      'x-user-role': 'ADMIN'
    });
    if (r.status === 200) {
      console.log(`employees (uid=${uid}): 200 OK — ${JSON.parse(r.body).length} employees`);
      break;
    } else {
      console.log(`employees (uid=${uid}): ${r.status} — ${r.body.substring(0,200)}`);
    }
  }
}

main().catch(console.error);
