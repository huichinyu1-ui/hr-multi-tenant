const xlsx = require('xlsx');

function formatExcelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  // Use xlsx SSF for robust date conversion
  const parsed = xlsx.SSF.parse_date_code(serial);
  if (!parsed) return null;
  return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
}

function formatExcelTime(fraction) {
  if (fraction === undefined || fraction === null) return null;
  if (typeof fraction === 'string') return fraction.replace(/[^\d:]/g, '').trim(); // Handle already string "HH:mm"
  if (typeof fraction !== 'number') return null;
  
  const totalMinutes = Math.round(fraction * 24 * 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

class AttendanceParser {
  static parseExcel(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const records = [];
    let currentEmployeeCode = null;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Detect employee block (Look in Col 0, 1 or 2 due to merged cells)
      const firstColsStr = (row[0] || row[1] || row[2] || '').toString();
      if (firstColsStr.includes('工號:')) {
        const codeMatch = firstColsStr.match(/工號:\s*([A-Za-z0-9]+)/);
        if (codeMatch) {
          currentEmployeeCode = codeMatch[1].trim();
        }
        continue;
      }

      // If we are inside an employee block and hit a date row
      // The date column is Index 0 (Left) and Index 8 (Right)
      if (currentEmployeeCode) {
        // Left side: Day 1-16 (Date at index 0, times at 2-7)
        if (row[0] instanceof Date || (typeof row[0] === 'number' && row[0] > 40000)) {
           this.extractRecord(currentEmployeeCode, row, 0, records);
        }
        // Right side: Day 17-31 (Date at index 8, times at 10-15)
        if (row[8] instanceof Date || (typeof row[8] === 'number' && row[8] > 40000)) {
           this.extractRecord(currentEmployeeCode, row, 8, records);
        }
      }
    }

    return records;
  }

  static extractRecord(empCode, row, startCol, records) {
    const dateSerial = row[startCol];
    if (!dateSerial || typeof dateSerial !== 'number') return;
    const dateStr = formatExcelDate(dateSerial);
    if (!dateStr) return;

    // 定義上班與下班的欄位索引 (相對於 startCol)
    const inCols = [2, 4, 6];
    const outCols = [3, 5, 7];

    const inTimes = [];
    const outTimes = [];

    inCols.forEach(offset => {
      const t = formatExcelTime(row[startCol + offset]);
      if (t) inTimes.push(t);
    });

    outCols.forEach(offset => {
      const t = formatExcelTime(row[startCol + offset]);
      if (t) outTimes.push(t);
    });

    if (inTimes.length > 0 || outTimes.length > 0) {
      // 上班取最早，下班取最晚
      const clockIn = inTimes.length > 0 ? inTimes.sort()[0] : null;
      const clockOut = outTimes.length > 0 ? outTimes.sort()[outTimes.length - 1] : null;

      records.push({
        employee_code: empCode,
        date: dateStr,
        clock_in: clockIn,
        clock_out: clockOut
      });
    }
  }
}

module.exports = AttendanceParser;
