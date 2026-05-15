const xlsx = require('xlsx');

class ExcelParser {
  /**
   * 解析出勤 Excel 檔案
   * 預期的 Excel 欄位：employee_code, date, clock_in, clock_out
   * @param {Buffer} fileBuffer 
   * @returns {Array} 解析後的出勤資料陣列
   */
  static parseAttendance(fileBuffer) {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0]; // 預設讀取第一個工作表
      const sheet = workbook.Sheets[sheetName];
      
      const data = xlsx.utils.sheet_to_json(sheet, { raw: false }); // raw: false converts dates to strings
      return data;
    } catch (error) {
      console.error('解析 Excel 失敗:', error);
      throw new Error('無效的 Excel 檔案格式');
    }
  }
}

module.exports = ExcelParser;
