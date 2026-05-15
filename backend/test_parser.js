const fs = require('fs');
const AttendanceParser = require('./src/services/AttendanceParser');
const path = require('path');

const buffer = fs.readFileSync(path.join(__dirname, '../../考勤明細表.xlsx'));
const records = AttendanceParser.parseExcel(buffer);
console.log('Total parsed records:', records.length);
console.log('Sample records:', records.slice(0, 3));
