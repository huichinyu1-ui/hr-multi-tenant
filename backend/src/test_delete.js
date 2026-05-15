const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
require('dotenv').config();

async function testPrismaDelete() {
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute("SELECT * FROM Company WHERE code = 'TJS1'");
    const company = rs.rows[0];
    
    const libsql = createClient({
      url: company.db_url,
      authToken: company.db_token
    });
    const adapter = new PrismaLibSQL(libsql);
    const db = new PrismaClient({ adapter });

    console.log('Testing raw queries via PrismaClient...');
    
    const id = 2; // Assuming ID 2 exists or fails in a specific way
    
    try {
      console.log('Running SELECT COUNT(*)');
      const result = await db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Employee" WHERE "insurancePolicyId" = ${id}`);
      console.log('Count result:', result);
    } catch (e) {
      console.error('Count query failed:', e);
    }
    
    try {
      console.log('Running DELETE');
      await db.$executeRawUnsafe(`DELETE FROM "InsurancePolicy" WHERE "id" = ${id}`);
      console.log('Delete succeeded');
    } catch (e) {
      console.error('Delete query failed:', e);
    }

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    process.exit(0);
  }
}

testPrismaDelete();
