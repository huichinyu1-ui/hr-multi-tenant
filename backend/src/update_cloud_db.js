const { createClient } = require('@libsql/client');
require('dotenv').config();

async function updateCloudDb() {
  console.log('Connecting to Central DB...');
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute('SELECT * FROM "Company"');
    for (const company of rs.rows) {
      console.log(`Updating schema for Company: ${company.code}...`);
      try {
        const tenantDb = createClient({
          url: company.db_url,
          authToken: company.db_token
        });

        // Add overtime_end column
        await tenantDb.execute('ALTER TABLE "WorkShift" ADD COLUMN "overtime_end" TEXT;').catch(e => {
          if (e.message.includes('duplicate column name')) {
            console.log(`  - overtime_end column already exists in ${company.code}`);
          } else {
            throw e;
          }
        });
        
        console.log(`  - Successfully added overtime_end to ${company.code}`);
      } catch (err) {
        console.error(`  - Failed to update ${company.code}:`, err.message);
      }
    }
    console.log('All companies updated!');
  } catch (err) {
    console.error('Error updating cloud DB:', err);
  }
}

updateCloudDb();
