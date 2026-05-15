const { createClient } = require('@libsql/client');
require('dotenv').config();

async function checkData() {
  const db = createClient({
    url: 'libsql://hr-tjs1-ustan.aws-ap-northeast-1.turso.io',
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });
  
  try {
    const r = await db.execute('SELECT type, COUNT(*) as count FROM InsuranceGrade GROUP BY type');
    console.log('--- DB Data Snapshot for TJS1 ---');
    console.table(r.rows);
    
    const sample = await db.execute('SELECT * FROM InsuranceGrade LIMIT 3');
    console.log('--- Sample Data ---');
    console.table(sample.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkData();
