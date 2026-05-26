const { createClient } = require('@libsql/client');
const { centralClient } = require('./src/db_manager');

async function fixEmptyCarryOverDates() {
  try {
    const companies = await centralClient.company.findMany();
    
    for (const company of companies) {
      if (!company.db_url || !company.db_token) continue;
      
      console.log(`\n=== Fixing ${company.code} ===`);
      const client = createClient({ url: company.db_url, authToken: company.db_token });
      
      const res = await client.execute(`SELECT id, year, carry_over_valid_from, carry_over_valid_to FROM "LeaveQuota"`);
      console.log(`Total rows: ${res.rows.length}`);
      
      let updated = 0;
      for (const row of res.rows) {
        const id = row[0];
        const year = row[1];
        const from = row[2];
        const to = row[3];
        
        if (!from || !to || from === '' || to === '') {
          const fromDate = `${year}-01-01`;
          const toDate = `${year}-12-31`;
          
          await client.execute({
            sql: `UPDATE "LeaveQuota" SET carry_over_valid_from = ?, carry_over_valid_to = ? WHERE id = ?`,
            args: [fromDate, toDate, id]
          });
          updated++;
        }
      }
      console.log(`Updated ${updated} rows.`);
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

fixEmptyCarryOverDates();
