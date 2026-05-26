const AttendanceParser = require('./src/services/AttendanceParser');
const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../考勤匯入.xlsx');
const buffer = fs.readFileSync(filePath);

const records = AttendanceParser.parseExcel(buffer);
console.log(`\n✅ Total parsed records: ${records.length}\n`);

// Show first 15 records
console.log('=== Sample Records ===');
records.slice(0, 15).forEach((r, i) => {
  console.log(`[${i+1}] emp=${r.employee_code}  date=${r.date}  in=${r.clock_in || '--'}  out=${r.clock_out || '--'}`);
});

// Count per employee
const byEmp = {};
records.forEach(r => { byEmp[r.employee_code] = (byEmp[r.employee_code] || 0) + 1; });
console.log('\n=== Records per Employee ===');
Object.entries(byEmp).forEach(([k, v]) => console.log(`  emp ${k}: ${v} records`));
