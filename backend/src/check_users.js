const { createClient } = require('@libsql/client');
require('dotenv').config();

async function run() {
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute("SELECT * FROM Company WHERE code = 'TJS1'");
    const company = rs.rows[0];
    
    const db = createClient({
      url: company.db_url,
      authToken: company.db_token
    });

    console.log('--- Users in TJS1 ---');
    const emps = await db.execute("SELECT username, password, role FROM Employee");
    console.table(emps.rows);
  } catch (err) {
    console.error('Check failed:', err.message);
  } finally {
    process.exit(0);
  }
}

run();
