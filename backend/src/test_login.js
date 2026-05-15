const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing Login with TJS...');
    const res = await axios.post('http://localhost:3001/api/employees/login', {
      username: 'admin', // Assume there's an admin user in TJS
      password: 'password123',
      companyCode: 'TJS'
    });
    console.log('Login Result:', res.data);
  } catch (err) {
    console.error('Login Failed:', err.response?.data || err.message);
  }
}

// Note: This requires the server to be running.
// Since the server is not running in the background yet, I'll start it or test the logic directly.

testLogin();
