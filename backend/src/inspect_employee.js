const { createClient } = require('@libsql/client');
require('dotenv').config();

async function inspectAndFix() {
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

    console.log('--- Inspecting Employee Table on TJS1 ---');
    const cols = await db.execute("PRAGMA table_info(Employee)");
    console.table(cols.rows.map(c => c.name));

    const hasColumn = cols.rows.some(c => c.name === 'insurancePolicyId');
    if (!hasColumn) {
        console.log('Missing insurancePolicyId! Adding it now...');
        await db.execute('ALTER TABLE Employee ADD COLUMN insurancePolicyId INTEGER');
        console.log('Column added.');
    } else {
        console.log('Column already exists.');
    }
    
  } catch (err) {
    console.error('Inspection failed:', err.message);
  } finally {
    process.exit(0);
  }
}

inspectAndFix();
