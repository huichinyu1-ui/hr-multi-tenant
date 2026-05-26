const { createClient } = require('@libsql/client');
const { centralClient } = require('./src/db_manager');

async function checkTursoSchema() {
  try {
    const companies = await centralClient.company.findMany();
    
    for (const company of companies) {
      if (!company.db_url || !company.db_token) {
        console.log(`[SKIP] ${company.code}: no db_url or db_token`);
        continue;
      }
      
      console.log(`\n=== Checking ${company.code} ===`);
      const client = createClient({ url: company.db_url, authToken: company.db_token });
      
      // Check Employee table columns
      try {
        const empCols = await client.execute(`PRAGMA table_info("Employee")`);
        const empColNames = empCols.rows.map(r => r[1]);
        console.log('Employee cols:', empColNames.join(', '));
      } catch(e) {
        console.error('Employee PRAGMA error:', e.message);
      }
      
      // Check LeaveQuota table columns
      try {
        const lqCols = await client.execute(`PRAGMA table_info("LeaveQuota")`);
        const lqColNames = lqCols.rows.map(r => r[1]);
        console.log('LeaveQuota cols:', lqColNames.join(', '));
        
        // Check specifically for new cols
        const hasCarryFrom = lqColNames.includes('carry_over_valid_from');
        const hasCarryTo = lqColNames.includes('carry_over_valid_to');
        console.log(`  carry_over_valid_from: ${hasCarryFrom ? 'OK ✓' : 'MISSING ✗'}`);
        console.log(`  carry_over_valid_to:   ${hasCarryTo ? 'OK ✓' : 'MISSING ✗'}`);
      } catch(e) {
        console.error('LeaveQuota PRAGMA error:', e.message);
      }
      
      // Try actual query that employees endpoint does
      try {
        await client.execute(`SELECT id, code, name FROM "Employee" LIMIT 1`);
        console.log('Employee SELECT: OK');
      } catch(e) {
        console.error('Employee SELECT error:', e.message);
      }
      
      try {
        await client.execute(`SELECT id, carry_over_valid_from, carry_over_valid_to FROM "LeaveQuota" LIMIT 1`);
        console.log('LeaveQuota SELECT new cols: OK');
      } catch(e) {
        console.error('LeaveQuota new cols SELECT error:', e.message);
      }
    }
  } catch(e) {
    console.error('Main error:', e.message);
  }
  process.exit(0);
}

checkTursoSchema();
