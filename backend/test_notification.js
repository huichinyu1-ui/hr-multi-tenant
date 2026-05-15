const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const emp = await prisma.employee.findFirst();
    if (!emp) {
      console.log('No employee found');
      process.exit(1);
    }
    console.log(`Creating notification for employee ${emp.id}...`);
    const n = await prisma.notification.create({
      data: {
        employeeId: emp.id,
        title: '測試通知',
        message: '這是一則測試通知'
      }
    });
    console.log('Created:', n);
    
    const count = await prisma.notification.count();
    console.log(`Total notifications now: ${count}`);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit(0);
  }
}

test();
