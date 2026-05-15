const { PrismaClient } = require('@prisma/client');

async function debugAPI() {
  const db = new PrismaClient({
    datasources: { db: { url: 'file:./prisma/dev.db' } }
  });

  try {
    console.log('--- Debugging InsuranceGrade Table ---');
    const grades = await db.insuranceGrade.findMany();
    console.log('Success! Grades found:', grades.length);
  } catch (err) {
    console.error('FAILED to query insuranceGrade:', err.message);
    if (err.message.includes('unknown field')) {
      console.log('HINT: Prisma Client is not updated with insuranceGrade model.');
    } else if (err.message.includes('no such table')) {
      console.log('HINT: Database table insuranceGrade does not exist.');
    }
  } finally {
    await db.$disconnect();
  }
}

debugAPI();
