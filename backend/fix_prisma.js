process.env.DATABASE_URL = 'file:C:/Users/spfst/Desktop/Antigravity files/backend/prisma/tjs.db';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPrisma() {
  try {
    const quotas = await prisma.leaveQuota.findMany();
    let updated = 0;
    for (const q of quotas) {
      if (!q.carry_over_valid_from || !q.carry_over_valid_to || q.carry_over_valid_from === '' || q.carry_over_valid_to === '') {
        const fromDate = `${q.year}-01-01`;
        const toDate = `${q.year}-12-31`;
        await prisma.leaveQuota.update({
          where: { id: q.id },
          data: { carry_over_valid_from: fromDate, carry_over_valid_to: toDate }
        });
        updated++;
      }
    }
    console.log(`Updated ${updated} LeaveQuotas via Prisma.`);
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

fixPrisma();
