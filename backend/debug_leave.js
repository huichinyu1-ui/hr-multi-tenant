const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasourceUrl: 'file:c:/Users/spfst/Desktop/Antigravity files/backend/prisma/tjs1.db'
});

async function run() {
  const pl = await prisma.leaveType.findFirst({ where: { code: 'PL' } });
  console.log('PL deduction base:', pl?.deduction_base);
  
  const emp = await prisma.employee.findFirst({ where: { name: '林順佑' } });
  console.log('Employee base:', emp?.base_salary);

  const pr = await prisma.payrollRecord.findFirst({
    where: { employeeId: emp?.id, year_month: '2026-05' },
    include: { details: true }
  });
  
  console.log('May Payroll Details:');
  if (pr) {
    pr.details.forEach(d => console.log(`  ${d.item_name}: ${d.amount} (${d.type})`));
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
