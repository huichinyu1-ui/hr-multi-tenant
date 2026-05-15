const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const AttendanceMatcher = require('./src/services/AttendanceMatcher');

async function run() {
  const employees = await prisma.employee.findMany({ include: { workShift: true } });
  for (const emp of employees) {
    if (!emp.workShift) continue;
    const records = await prisma.dailyRecord.findMany({ where: { employeeId: emp.id } });
    for (const rec of records) {
      if (rec.clock_in) {
        const parsed = AttendanceMatcher.parseAttendance(rec, emp.workShift);
        if (isNaN(parsed.work_mins) || isNaN(parsed.late_mins) || parsed.work_mins === undefined) {
           console.log('BAD PARSED:', parsed, 'for record:', rec, 'shift:', emp.workShift);
        }
      }
    }
  }
}
run().finally(() => prisma.$disconnect());
