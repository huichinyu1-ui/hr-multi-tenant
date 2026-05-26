const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.resolve(__dirname, '../考勤匯入.xlsx');
console.log('Reading file:', filePath);
console.log('File exists:', fs.existsSync(filePath));

const workbook = xlsx.read(fs.readFileSync(filePath), { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
console.log('\n=== Sheet Names ===');
console.log(workbook.SheetNames);

const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log(`\n=== First 30 Rows of Sheet: "${sheetName}" ===`);
for (let i = 0; i < Math.min(30, data.length); i++) {
  const row = data[i];
  if (!row || row.length === 0) {
    console.log(`Row ${i}: [empty]`);
    continue;
  }
  // Show column index and value
  const parts = [];
  for (let j = 0; j < Math.min(20, row.length); j++) {
    if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
      parts.push(`[${j}]=${JSON.stringify(row[j])}`);
    }
  }
  console.log(`Row ${i}: ${parts.join('  ')}`);
}

// Also check if any row contains "工號"
console.log('\n=== Searching for "工號" in all rows ===');
let found = false;
for (let i = 0; i < data.length; i++) {
  const row = data[i];
  if (!row) continue;
  for (let j = 0; j < row.length; j++) {
    const val = String(row[j] || '');
    if (val.includes('工號')) {
      console.log(`Found "工號" at Row ${i}, Col ${j}: "${val}"`);
      found = true;
    }
  }
}
if (!found) console.log('NO "工號" found in entire sheet!');
