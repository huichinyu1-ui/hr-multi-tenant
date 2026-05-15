const { createClient } = require('@libsql/client');
require('dotenv').config();

async function checkTjs() {
  const db = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });
  
  try {
    const rs = await db.execute("SELECT * FROM Company WHERE code = 'TJS'");
    console.log('--- CLOUD CENTRAL DB TJS RECORD ---');
    console.log(JSON.stringify(rs.rows, null, 2));
    
    if (rs.rows.length > 0) {
      const company = rs.rows[0];
      const tenantDb = createClient({
        url: company.db_url,
        authToken: company.db_token
      });
      const empCount = await tenantDb.execute("SELECT count(*) as count FROM Employee");
      console.log('Employee count in that DB:', empCount.rows[0].count);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkTjs();
