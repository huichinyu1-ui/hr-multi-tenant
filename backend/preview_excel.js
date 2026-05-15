const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../考勤明細表.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

for (let i = 29; i <= 32; i++) {
  console.log(`Row ${i}:`, data[i]);
}
