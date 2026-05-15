const { createClient } = require('@libsql/client');
require('dotenv').config();

async function migrateEmployeeFields() {
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

    console.log('--- Migrating TJS1 Employee Fields ---');
    
    const cols = await db.execute("PRAGMA table_info(Employee)");
    const colNames = cols.rows.map(c => c.name);

    if (!colNames.includes('pension_rate')) {
        console.log('Adding pension_rate...');
        await db.execute('ALTER TABLE Employee ADD COLUMN pension_rate REAL DEFAULT 0');
    }
    
    if (!colNames.includes('health_dependents')) {
        console.log('Adding health_dependents...');
        await db.execute('ALTER TABLE Employee ADD COLUMN health_dependents INTEGER DEFAULT 0');
    }

    console.log('Migration completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

migrateEmployeeFields();
