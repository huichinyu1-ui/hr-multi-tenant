const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/leaves/types',
  method: 'GET',
  headers: {
    'x-company-code': 'TJS',
    'x-user-role': 'ADMIN',
    'x-user-id': '1'
  }
};

const req = http.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => { console.log('BODY:', data); });
});

req.on('error', e => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
