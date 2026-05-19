const { createClient } = require('@libsql/client');
require('dotenv').config();

async function updateLeaveSchema() {
  console.log('--- Syncing Leave Schema to Cloud Databases ---');
  
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute('SELECT * FROM "Company"');
    console.log(`Found ${rs.rows.length} companies in Cloud Central DB.`);

    for (const tjs of rs.rows) {
      console.log(`\nSyncing Company: ${tjs.code}...`);
      const tenantDb = createClient({
        url: tjs.db_url,
        authToken: tjs.db_token
      });

      // 1. Add columns to LeaveType
      const leaveTypeCols = [
        { name: 'is_carry_over_enabled', type: 'BOOLEAN NOT NULL DEFAULT 0' },
        { name: 'carry_over_expiry_months', type: 'INTEGER' }
      ];
      
      for (const col of leaveTypeCols) {
        try {
          await tenantDb.execute(`ALTER TABLE "LeaveType" ADD COLUMN "${col.name}" ${col.type}`);
          console.log(` - Added column ${col.name} to LeaveType.`);
        } catch (e) {
          if (e.message.includes('duplicate column name')) {
            console.log(` - Column ${col.name} already exists in LeaveType.`);
          } else {
            console.error(` - Error adding ${col.name}:`, e.message);
          }
        }
      }

      // 2. Add columns to LeaveQuota
      const leaveQuotaCols = [
        { name: 'carried_over_hours', type: 'REAL NOT NULL DEFAULT 0' },
        { name: 'annual_hours', type: 'REAL NOT NULL DEFAULT 0' }
      ];
      
      for (const col of leaveQuotaCols) {
        try {
          await tenantDb.execute(`ALTER TABLE "LeaveQuota" ADD COLUMN "${col.name}" ${col.type}`);
          console.log(` - Added column ${col.name} to LeaveQuota.`);
        } catch (e) {
          if (e.message.includes('duplicate column name')) {
            console.log(` - Column ${col.name} already exists in LeaveQuota.`);
          } else {
            console.error(` - Error adding ${col.name}:`, e.message);
          }
        }
      }
      
      console.log(`Company ${tjs.code} sync complete.`);
    }

  } catch (err) {
    console.error('Fatal Sync Error:', err);
  } finally {
    console.log('\n--- Sync Finished ---');
  }
}

updateLeaveSchema();
