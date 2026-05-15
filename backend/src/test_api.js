const axios = require('axios');

async function testApi() {
  try {
    const res = await axios.delete('http://localhost:3001/api/insurance/policies/3', {
      headers: {
        'x-company-code': 'TJS1'
      }
    });
    console.log('Success:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('API Error Status:', err.response.status);
      console.error('API Error Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testApi();
