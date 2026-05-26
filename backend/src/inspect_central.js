const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
require('dotenv').config();

async function inspect() {
  // Connect to local central.db to get company info
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.CENTRAL_DATABASE_URL } }
  });
  
  const companies = await prisma.company.findMany();
  console.log('Companies in central DB:');
  companies.forEach(c => {
    console.log(`  ${c.code}: db_url=${c.db_url}`);
    console.log(`  token=${c.db_token ? c.db_token.substring(0,40)+'...' : 'NONE'}`);
  });

  // Try to connect directly to TJS1 if found
  const tjs1 = companies.find(c => c.code === 'TJS1');
  if (tjs1) {
    console.log('\nTesting TJS1 connection...');
    try {
      const db = createClient({ url: tjs1.db_url, authToken: tjs1.db_token });
      const r = await db.execute('SELECT name FROM sqlite_master WHERE type="table" AND name="LeaveType"');
      console.log('Table check:', r.rows);
      const cols = await db.execute("PRAGMA table_info('LeaveType')");
      console.log('LeaveType columns:', cols.rows.map(r => r.name));
    } catch(e) {
      console.error('TJS1 connection error:', e.message);
    }
  }
  
  await prisma.$disconnect();
}
inspect();
