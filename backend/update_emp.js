const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employee.findFirst();
  if (emp) {
    await prisma.employee.update({
      where: { id: emp.id },
      data: { code: '5', name: '鍾佩璇' }
    });
    console.log('Updated first employee to code 5 (鍾佩璇)');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
