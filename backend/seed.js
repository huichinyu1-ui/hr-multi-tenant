const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient({});

async function main() {
  console.log('Seeding data...');
  
  // 1. Create Default Payroll Items
  // Removed base and meal_allowance as they are now fixed employee attributes

  const fullAttendanceBonus = await prisma.payrollItem.upsert({
    where: { code: 'full_attendance' },
    update: {},
    create: {
      code: 'full_attendance',
      name: '全勤獎金',
      type: 'ADDITION',
      calc_type: 'FORMULA',
      // If late_days is 0 and absent_days is 0, give 1000, else 0
      formula_expr: '{late_days} + {absent_days} == 0 ? 1000 : 0',
    },
  });

  const laborInsurance = await prisma.payrollItem.upsert({
    where: { code: 'labor_insurance' },
    update: {},
    create: {
      code: 'labor_insurance',
      name: '勞健保',
      type: 'DEDUCTION',
      calc_type: 'FORMULA',
      // Approx 5% of base salary
      formula_expr: '{base} * 0.05',
    },
  });

  // 2. Create Dummy Employees
  const emp1 = await prisma.employee.upsert({
    where: { code: 'A001' },
    update: {},
    create: {
      code: 'A001',
      name: '王小明',
      base_salary: 40000,
    },
  });

  const emp2 = await prisma.employee.upsert({
    where: { code: 'A002' },
    update: {},
    create: {
      code: 'A002',
      name: '陳大文',
      base_salary: 50000,
    },
  });

  // 3. Create Leave Types
  await prisma.leaveType.upsert({
    where: { code: 'PERSONAL' },
    update: {},
    create: { code: 'PERSONAL', name: '事假', is_paid: false, deduction_ratio: 1.0 },
  });
  
  await prisma.leaveType.upsert({
    where: { code: 'SICK' },
    update: {},
    create: { code: 'SICK', name: '病假', is_paid: true, deduction_ratio: 0.5 }, // 半薪
  });
  
  await prisma.leaveType.upsert({
    where: { code: 'ANNUAL' },
    update: {},
    create: { code: 'ANNUAL', name: '特別休假', is_paid: true, deduction_ratio: 0.0 }, // 不扣薪
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
