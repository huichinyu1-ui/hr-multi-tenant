const axios = require('axios');

async function testCors() {
  try {
    console.log('Testing OPTIONS preflight to backend...');
    const res = await axios.options('https://hr-api-server-eta.vercel.app/api/employees/login', {
      headers: {
        'Origin': 'https://frontend-dusky-three-40.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type,x-company-code'
      }
    });
    console.log('Status:', res.status);
    console.log('CORS Headers:');
    console.log('  Access-Control-Allow-Origin:', res.headers['access-control-allow-origin']);
    console.log('  Access-Control-Allow-Methods:', res.headers['access-control-allow-methods']);
    console.log('  Access-Control-Allow-Headers:', res.headers['access-control-allow-headers']);
    console.log('All headers:', JSON.stringify(res.headers, null, 2));
  } catch (err) {
    console.error('Error status:', err.response?.status);
    console.error('Error headers:', JSON.stringify(err.response?.headers, null, 2));
    console.error('Error data:', err.response?.data);
  }
}

testCors();
