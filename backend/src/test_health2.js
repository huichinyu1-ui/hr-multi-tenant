const axios = require('axios');

async function testHealth() {
  try {
    const res = await axios.get('https://hr-api-server-eta.vercel.app/api/health', {
      headers: { 'x-company-code': 'TJS1' }
    });
    console.log('Health OK:', res.data);
  } catch (err) {
    console.error('Health Error:', err.response?.status, err.response?.data);
  }

  // Also test login directly
  try {
    const res = await axios.post('https://hr-api-server-eta.vercel.app/api/employees/login', {
      username: 'Stanley',
      password: '12311231',
      companyCode: 'TJS1'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Login OK:', res.data?.message);
  } catch (err) {
    console.error('Login Error:', err.response?.status, JSON.stringify(err.response?.data));
  }
}

testHealth();
