const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.payrollItem.findMany().then(r => {
    console.log('Current Payroll Items:');
    r.forEach(item => console.log(`- Code: ${item.code}, Name: ${item.name}`));
}).finally(() => prisma.$disconnect());
