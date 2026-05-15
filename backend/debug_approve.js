const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
  console.log('Testing Missed Punch Approval Logic...');
  try {
    const id = 4; // 根據您的報錯，出問題的是 ID 4
    const status = 'APPROVED';
    
    const request = await prisma.missedPunchRequest.findUnique({
      where: { id },
      include: { employee: true }
    });

    if (!request) {
      console.error('Request not found');
      return;
    }

    const { employeeId, date, punch_type, target_time } = request;
    const is_in = punch_type === 'IN';

    console.log('Upserting DailyRecord...');
    await prisma.dailyRecord.upsert({
      where: { employeeId_date: { employeeId, date } },
      update: { [is_in ? 'clock_in' : 'clock_out']: target_time },
      create: {
        employeeId,
        date,
        clock_in: is_in ? target_time : null,
        clock_out: is_in ? null : target_time,
        status: 'PRESENT'
      }
    });

    console.log('Loading AttendanceMatcher...');
    const AttendanceMatcher = require('./src/services/AttendanceMatcher');
    console.log('Triggering Matcher...');
    await AttendanceMatcher.matchAttendance(date.substring(0, 7));

    console.log('Creating Notification...');
    await prisma.notification.create({
      data: {
        employeeId: request.employeeId,
        title: '補打卡申請審核結果',
        message: `您在 ${request.date} 的補打卡申請已被標記為: ${status}`
      }
    });

    console.log('Debug Finished Successfully!');
  } catch (e) {
    console.error('DEBUG FAILED!');
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

debug();
