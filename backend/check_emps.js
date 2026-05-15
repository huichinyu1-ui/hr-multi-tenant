const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.employee.findMany().then(e => console.log('DB Employees:', e.map(x=>x.code))).catch(e => console.error(e)).finally(() => prisma.$disconnect());
