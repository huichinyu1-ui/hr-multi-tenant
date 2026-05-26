// Wait for Vercel to deploy (~90s), then call the migration endpoint
const http = require('https');

function callMigration() {
  return new Promise((resolve) => {
    const body = JSON.stringify({});
    const options = {
      hostname: 'hr-api-server-eta.vercel.app',
      path: '/api/super-admin/run-anniversary-migration',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': body.length
      }
    };

    const req = http.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        console.log('STATUS:', res.statusCode);
        try { console.log(JSON.stringify(JSON.parse(d), null, 2)); }
        catch(e) { console.log(d); }
        resolve();
      });
    });

    req.on('error', e => { console.error(e.message); resolve(); });
    req.write(body);
    req.end();
  });
}

console.log('Waiting 90 seconds for Vercel to deploy...');
setTimeout(async () => {
  console.log('Calling anniversary migration endpoint...');
  await callMigration();
  console.log('Done!');
}, 90000);
