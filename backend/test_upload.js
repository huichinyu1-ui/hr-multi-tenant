const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const AttendanceParser = require('./src/services/AttendanceParser');
const AttendanceMatcher = require('./src/services/AttendanceMatcher');

async function testUpload() {
  const prisma = new PrismaClient();
  const req = { db: prisma };
  const buffer = fs.readFileSync('../考勤明細表.xlsx');
  const records = AttendanceParser.parseExcel(buffer);
  
  let count = 0;
  try {
    const allEmployees = await req.db.employee.findMany({ include: { workShift: true } });
    const empMap = new Map();
    allEmployees.forEach(e => {
      empMap.set(e.code, e);
      empMap.set(e.code.replace(/^0+/, ''), e);
    });

    const validDates = records.filter(r => r.date).map(r => new Date(r.date).getTime()).filter(t => !isNaN(t));
    let existingMap = new Map();
    if (validDates.length > 0) {
      const minDate = new Date(Math.min(...validDates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max(...validDates)).toISOString().split('T')[0];
      const existingRecords = await req.db.dailyRecord.findMany({
        where: { date: { gte: minDate, lte: maxDate } }
      });
      existingRecords.forEach(r => existingMap.set(`${r.employeeId}_${r.date}`, r));
    }

    const writePromises = [];

    for (const record of records) {
      const { employee_code, date, clock_in, clock_out } = record;
      if (!employee_code || !date) continue;

      const normalizedCode = employee_code.toString().replace(/^0+/, '');
      const employee = empMap.get(employee_code) || empMap.get(normalizedCode);

      if (!employee) {
        console.warn(`找不到員工: ${employee_code}`);
        continue;
      }

      const formattedDate = new Date(date).toISOString().split('T')[0];
      const existingRecord = existingMap.get(`${employee.id}_${formattedDate}`);
      
      let final_clock_in = clock_in || null;
      let final_clock_out = clock_out || null;
      let final_punch_method = 'EXCEL';

      if (existingRecord) {
        if (existingRecord.punch_method === 'WEB') {
          final_clock_in = existingRecord.clock_in ? existingRecord.clock_in : final_clock_in;
          final_clock_out = existingRecord.clock_out ? existingRecord.clock_out : final_clock_out;
          final_punch_method = 'WEB';
        }
      }

      let parsedStats = { late_mins: 0, early_leave_mins: 0, work_mins: 0, overtime1_mins: 0, overtime2_mins: 0 };
      let finalStatus = 'PRESENT';
      if (employee.workShift) {
        parsedStats = AttendanceMatcher.parseAttendance({ clock_in: final_clock_in, clock_out: final_clock_out }, employee.workShift);
        if (parsedStats.clock_in_status === 'ABSENT') finalStatus = 'ABSENT';
        else if (parsedStats.late_mins > 0) finalStatus = 'LATE';
        else if (parsedStats.early_leave_mins > 0) finalStatus = 'EARLY';
      }

      const upsertPromise = req.db.dailyRecord.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: formattedDate } },
        update: {
          clock_in: final_clock_in,
          clock_out: final_clock_out,
          status: finalStatus,
          punch_method: final_punch_method,
          ...parsedStats
        },
        create: {
          employeeId: employee.id,
          date: formattedDate,
          clock_in: final_clock_in,
          clock_out: final_clock_out,
          status: finalStatus,
          punch_method: final_punch_method,
          ...parsedStats
        }
      });
      
      writePromises.push(upsertPromise);
      count++;
    }

    await Promise.all(writePromises);
    console.log(`成功匯入並解析 ${count} 筆出勤紀錄`);
  } catch (err) {
    console.error("ERROR", err);
  } finally {
    await prisma.$disconnect();
  }
}
testUpload();
