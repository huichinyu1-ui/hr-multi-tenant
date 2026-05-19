const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const emps = await prisma.employee.count();
  console.log('Employees:', emps);
  const quotas = await prisma.leaveQuota.count();
  console.log('Quotas:', quotas);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
