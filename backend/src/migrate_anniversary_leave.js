const { createClient } = require('@libsql/client');
require('dotenv').config();

const sqlStatements = [
  `ALTER TABLE "LeaveType" ADD COLUMN "calculation_mode" TEXT DEFAULT 'CALENDAR'`,
  `ALTER TABLE "LeaveQuota" ADD COLUMN "valid_from" TEXT`,
  `ALTER TABLE "LeaveQuota" ADD COLUMN "valid_to" TEXT`
];

async function migrateAll() {
  console.log('Connecting to Central DB...');
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute('SELECT * FROM "Company"');
    console.log(`Found ${rs.rows.length} companies. Starting migration...`);

    for (const company of rs.rows) {
      console.log(`\nMigrating company: ${company.name} (${company.code})`);
      const tenantDb = createClient({
        url: company.db_url,
        authToken: company.db_token
      });

      for (const sql of sqlStatements) {
        try {
          await tenantDb.execute(sql);
          console.log(`✅ Success: ${sql}`);
        } catch (err) {
          // Ignore if column already exists
          if (err.message && err.message.includes('duplicate column name')) {
            console.log(`⚠️ Skipped (already exists): ${sql}`);
          } else {
            console.error(`❌ Error on ${sql}:`, err.message);
          }
        }
      }
    }
    console.log('\nMigration complete.');
  } catch (err) {
    console.error('Error during migration:', err);
  }
}

migrateAll();
