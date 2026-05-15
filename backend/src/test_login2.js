const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing Login with TJS1 and Stanley...');
    const res = await axios.post('http://localhost:3001/api/employees/login', {
      username: 'Stanley',
      password: 'password123', // I will test password123 first, wait, the DB said 12311231
      companyCode: 'TJS1'
    });
    console.log('Login Result:', res.data);
  } catch (err) {
    console.error('Login Failed:', err.response?.data || err.message);
  }
}

testLogin();
