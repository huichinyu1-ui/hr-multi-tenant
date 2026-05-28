const { PrismaClient } = require('@prisma/client');

async function run() {
  const tjsDbPath = 'file:C:/Users/spfst/Desktop/Antigravity files/backend/prisma/dev.db';
  const prisma = new PrismaClient({ datasourceUrl: tjsDbPath });
  
  try {
    const pl = await prisma.leaveType.findFirst({ where: { code: 'PL' } });
    console.log('dev.db PL:', pl.deduction_base);
    const emp = await prisma.employee.findFirst({ where: { name: '林順佑' } });
    console.log('dev.db Emp:', emp?.id);
    
    if (emp) {
      const pr = await prisma.payrollRecord.findFirst({
        where: { employeeId: emp.id, year_month: '2026-05' },
        include: { details: true }
      });
      if (pr) {
        pr.details.forEach(d => console.log(`  ${d.item_name}: ${d.amount} (${d.type})`));
      }
    }
  } catch (e) {
    console.log('Error dev.db:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
