const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const count = await prisma.notification.count();
  console.log(`Total notifications: ${count}`);
  
  const latest = await prisma.notification.findMany({
    orderBy: { created_at: 'desc' },
    take: 5
  });
  console.log('Latest 5 notifications:', JSON.stringify(latest, null, 2));
  
  const finalizedPayrolls = await prisma.payrollRecord.findMany({
    where: { status: 'FINALIZED' },
    select: { year_month: true, employeeId: true }
  });
  console.log(`Finalized payrolls: ${finalizedPayrolls.length}`);
  console.log(finalizedPayrolls);
  
  process.exit(0);
}

check();
