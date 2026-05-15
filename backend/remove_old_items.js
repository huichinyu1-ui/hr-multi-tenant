const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.payrollItem.deleteMany({
    where: {
      code: { in: ['base', 'meal_allowance', 'production_bonus', 'festival_bonus'] }
    }
  });
  console.log('Removed old items.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
