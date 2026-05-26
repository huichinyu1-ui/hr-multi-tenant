// 直接用 https 呼叫 Vercel API，帶上正確的 headers，看 500 的實際回應
const https = require('https');

function callApi(path, headers) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'hr-api-server-eta.vercel.app',
      path: path,
      method: 'GET',
      headers: headers
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const r1 = await callApi('/api/health', {});
  console.log('Health:', r1.status);

  // Try items (Formulas page uses this)
  for (const uid of ['1','2','3','4','5']) {
    const r = await callApi('/api/items', {
      'x-company-code': 'TJS1',
      'x-user-id': uid,
      'x-user-role': 'ADMIN'
    });
    if (r.status === 200) {
      console.log(`\n/api/items (uid=${uid}): 200 OK — ${JSON.parse(r.body).length} items`);
      break;
    } else {
      console.log(`/api/items (uid=${uid}): ${r.status} ${r.body.substring(0,100)}`);
    }
  }

  // Try employees with multiple IDs
  for (const uid of ['1','2','3','4','5']) {
    const r = await callApi('/api/employees', {
      'x-company-code': 'TJS1',
      'x-user-id': uid,
      'x-user-role': 'ADMIN'
    });
    if (r.status === 200) {
      console.log(`\n/api/employees (uid=${uid}): 200 OK — ${JSON.parse(r.body).length} employees`);
      break;
    } else if (r.status === 500) {
      console.log(`/api/employees (uid=${uid}): 500 ERROR — ${r.body.substring(0,300)}`);
      break;
    } else {
      console.log(`/api/employees (uid=${uid}): ${r.status} ${r.body.substring(0,100)}`);
    }
  }

  // Try leaves/requests
  for (const uid of ['1','2','3','4','5']) {
    const r = await callApi('/api/leaves/requests?start_date=2026-01-01&end_date=2026-12-31', {
      'x-company-code': 'TJS1',
      'x-user-id': uid,
      'x-user-role': 'ADMIN'
    });
    if (r.status === 200) {
      console.log(`\n/api/leaves/requests (uid=${uid}): 200 OK — ${JSON.parse(r.body).length} records`);
      break;
    } else if (r.status === 500) {
      console.log(`/api/leaves/requests (uid=${uid}): 500 — ${r.body.substring(0,300)}`);
      break;
    } else {
      console.log(`/api/leaves/requests (uid=${uid}): ${r.status} ${r.body.substring(0,100)}`);
    }
  }
}

main().catch(console.error);
