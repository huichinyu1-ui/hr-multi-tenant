const { PrismaClient } = require('@prisma/client');
const prismaDev = new PrismaClient({ datasources: { db: { url: 'file:C:\\Users\\spfst\\Desktop\\Antigravity files\\backend\\prisma\\dev.db' } } });
const prismaTjs1 = new PrismaClient({ datasources: { db: { url: 'file:C:\\Users\\spfst\\Desktop\\Antigravity files\\backend\\prisma\\tjs1.db' } } });

async function main() {
  console.log('--- DEV DB ---');
  console.log('Employees:', await prismaDev.employee.count());
  console.log('Quotas:', await prismaDev.leaveQuota.count());
  console.log('Leave Types:', await prismaDev.leaveType.count());
  console.log('--- TJS1 DB ---');
  console.log('Employees:', await prismaTjs1.employee.count());
  console.log('Quotas:', await prismaTjs1.leaveQuota.count());
}
main().catch(console.error).finally(() => {
  prismaDev.$disconnect();
  prismaTjs1.$disconnect();
});
