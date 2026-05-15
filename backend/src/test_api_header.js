const axios = require('axios');

async function testHeaderRequest() {
  try {
    console.log('Testing GET /api/employees with TJS header...');
    const res = await axios.get('http://localhost:3001/api/employees', {
      headers: {
        'x-company-code': 'TJS',
        'x-user-role': 'ADMIN',
        'x-user-id': '1'
      }
    });
    console.log('Employees found:', res.data.length);
    console.log('First employee:', res.data[0]?.name);
  } catch (err) {
    console.error('Request Failed:', err.response?.data || err.message);
  }
}

testHeaderRequest();
