const xlsx = require('xlsx');

function formatExcelDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  const parsed = xlsx.SSF.parse_date_code(serial);
  if (!parsed) return null;
  return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
}

function formatExcelTime(val) {
  if (val === undefined || val === null || val === '') return null;
  // Already a string like "07:24"
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d:]/g, '').trim();
    return cleaned.length >= 3 ? cleaned : null;
  }
  // Numeric fraction (Excel time serial)
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }
  return null;
}

// Resolve "05-01" + year => "2026-05-01"
function resolveDateString(val, year) {
  if (!val) return null;
  const str = String(val).trim();
  // Already full date YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // MM-DD format
  if (/^\d{2}-\d{2}$/.test(str)) {
    return `${year}-${str}`;
  }
  // Numeric serial
  if (typeof val === 'number' && val > 40000) return formatExcelDate(val);
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  return null;
}

// Extract year from employee header string, e.g. "日期:2026-05-01 ~ 2026-05-22"
function extractYearFromHeader(rowStr) {
  const m = rowStr.match(/(\d{4})-\d{2}-\d{2}/);
  if (m) return parseInt(m[1]);
  return new Date().getFullYear(); // fallback to current year
}

class AttendanceParser {
  static parseExcel(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const records = [];
    let currentEmployeeCode = null;
    let currentYear = new Date().getFullYear();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Build a combined string of the first few columns to detect header rows
      const rowStr = [row[0], row[1], row[2], row[10], row[13]]
        .map(v => String(v || '')).join(' ');

      // --- Detect employee block header ---
      if (rowStr.includes('工號:')) {
        const codeMatch = rowStr.match(/工號:\s*([A-Za-z0-9]+)/);
        if (codeMatch) {
          currentEmployeeCode = codeMatch[1].trim();
        }
        // Try to extract year from date range in this row
        currentYear = extractYearFromHeader(rowStr);
        continue;
      }

      // Skip non-data rows (headers, summary, empty)
      if (!currentEmployeeCode) continue;

      // --- Try to parse left side (date at col 0) ---
      const leftDate = resolveDateString(row[0], currentYear);
      if (leftDate) {
        this.extractRecord(currentEmployeeCode, row, 0, leftDate, records);
      }

      // --- Try to parse right side (date at col 8) ---
      const rightDate = resolveDateString(row[8], currentYear);
      if (rightDate) {
        this.extractRecord(currentEmployeeCode, row, 8, rightDate, records);
      }
    }

    return records;
  }

  static extractRecord(empCode, row, startCol, dateStr, records) {
    if (!dateStr) return;

    // Time column offsets relative to dateCol:
    // Left side (startCol=0):  上班[2,4,6], 下班[3,5,7]
    // Right side (startCol=8): 上班[10,12,14], 下班[11,13,15]
    let inOffsets, outOffsets;
    if (startCol === 0) {
      inOffsets  = [2, 4, 6];
      outOffsets = [3, 5, 7];
    } else {
      inOffsets  = [2, 4, 6];   // relative to startCol
      outOffsets = [3, 5, 7];
    }

    const inTimes  = [];
    const outTimes = [];

    inOffsets.forEach(offset => {
      const t = formatExcelTime(row[startCol + offset]);
      if (t) inTimes.push(t);
    });
    outOffsets.forEach(offset => {
      const t = formatExcelTime(row[startCol + offset]);
      if (t) outTimes.push(t);
    });

    if (inTimes.length > 0 || outTimes.length > 0) {
      const clockIn  = inTimes.length  > 0 ? inTimes.sort()[0]  : null;
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
