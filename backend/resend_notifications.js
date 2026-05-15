const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resend() {
  const months = ['2023-10', '2023-11', '2023-12'];
  for (const year_month of months) {
    const records = await prisma.payrollRecord.findMany({
      where: { year_month, status: 'FINALIZED' }
    });
    console.log(`Processing ${year_month}: ${records.length} records`);
    for (const record of records) {
      await prisma.notification.create({
        data: {
          employeeId: record.employeeId,
          title: '薪資單已發佈 (補發)',
          message: `${year_month} 月份的薪資單已經結案並發佈，您可以前往薪資查詢查看明細。`
        }
      });
    }
  }
  const count = await prisma.notification.count();
  console.log(`Total notifications now: ${count}`);
  process.exit(0);
}

resend();
