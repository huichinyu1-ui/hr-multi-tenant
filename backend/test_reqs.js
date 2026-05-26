process.env.DATABASE_URL = "file:c:/Users/spfst/Desktop/Antigravity files/backend/prisma/tjs1.db";
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const employees = await prisma.employee.findMany();
  console.log('Employees count:', employees.length);
}
main().catch(console.error);
