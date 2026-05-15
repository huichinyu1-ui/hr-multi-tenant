const { PrismaClient } = require('@prisma/client');
const { getEmployeePermissions } = require('./controllers/roleController');
require('dotenv').config();

async function testPermissions() {
  const db = new PrismaClient();
  try {
    const admin = await db.employee.findUnique({ where: { username: 'admin' } });
    if (!admin) {
      console.log('Admin user not found!');
      return;
    }
    const perms = await getEmployeePermissions(db, admin);
    console.log('--- ADMIN PERMISSIONS OBJECT ---');
    console.log(JSON.stringify(perms.INSURANCE, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await db.$disconnect();
    process.exit(0);
  }
}

testPermissions();
