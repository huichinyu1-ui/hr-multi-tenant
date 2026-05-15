const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shift = await prisma.workShift.upsert({
    where: { code: 'NORMAL' },
    update: {},
    create: {
      code: 'NORMAL',
      name: '正常日班',
      work_start: '08:30',
      work_end: '17:30',
      rest_start: '12:00',
      rest_end: '13:00',
      overtime_start: '18:00',
      late_buffer_mins: 5,
      overtime_min_unit: 30
    }
  });

  await prisma.employee.updateMany({
    where: { workShiftId: null },
    data: { workShiftId: shift.id }
  });

  console.log('Default shift created and assigned.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
