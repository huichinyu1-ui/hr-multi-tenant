const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.employee.findMany({
    select: { id: true, code: true, name: true, username: true, password: true, role: true }
  });
  console.table(users);
}

main().finally(() => prisma.$disconnect());
