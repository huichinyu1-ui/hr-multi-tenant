const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testFlow() {
  try {
    // 1. Generate Calendar for 2023-10
    console.log('Generating calendar...');
    await axios.post('http://localhost:3001/api/calendar/generate', { year: 2023, month: 10 });
    
    // 2. Create Leave Request for A001 on 2023-10-04 (PERSONAL leave)
    console.log('Creating leave request...');
    const emps = await axios.get('http://localhost:3001/api/employees');
    const a001 = emps.data.find(e => e.code === 'A001');
    const types = await axios.get('http://localhost:3001/api/leaves/types');
    const personalType = types.data.find(t => t.code === 'PERSONAL');
    
    await axios.post('http://localhost:3001/api/leaves/requests', {
      employeeId: a001.id,
      leaveTypeId: personalType.id,
      start_date: '2023-10-04',
      end_date: '2023-10-04',
      reason: 'test'
    });

    // 3. Upload Excel
    console.log('Uploading excel...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(path.join(__dirname, 'sample_daily_attendance.xlsx')));
    await axios.post('http://localhost:3001/api/attendances/upload', formData, {
      headers: formData.getHeaders()
    });

    // 4. Calculate Payroll
    console.log('Calculating payroll...');
    const res = await axios.post('http://localhost:3001/api/payrolls/calculate', { year_month: '2023-10' });
    console.log('Payroll Result:', JSON.stringify(res.data, null, 2));

    // 5. Fetch Daily Records
    console.log('Fetching daily records...');
    const records = await axios.get('http://localhost:3001/api/attendances?year_month=2023-10');
    console.log('Daily Records:', JSON.stringify(records.data.filter(r => r.date === '2023-10-04' || r.date === '2023-10-02'), null, 2));

  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}
testFlow();
