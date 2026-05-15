const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.payrollItem.findMany().then(r => {
    console.log(JSON.stringify(r, null, 2));
}).finally(() => prisma.$disconnect());
