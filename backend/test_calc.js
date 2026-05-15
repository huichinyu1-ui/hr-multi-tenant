const axios = require('axios');
axios.post('http://localhost:3001/api/payrolls/calculate', { year_month: '2026-04' })
  .then(res => console.log('Success:', res.data.length))
  .catch(err => {
    if (err.response) {
      console.error('Data:', err.response.data);
    } else {
      console.error('Message:', err.message);
    }
  });
