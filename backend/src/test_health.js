const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://hr-api-server-eta.vercel.app/api/health');
    console.log('Status:', res.status);
    console.log('Data:', res.data);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response) {
      console.error('Data:', err.response.data);
    }
  }
}
test();
