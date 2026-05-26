const { createClient } = require('@libsql/client');
const { centralClient } = require('./src/db_manager');

async function fixNullCarryOverDates() {
  try {
    const companies = await centralClient.company.findMany();
    
    for (const company of companies) {
      if (!company.db_url || !company.db_token) continue;
      
      console.log(`\n=== Fixing ${company.code} ===`);
      const client = createClient({ url: company.db_url, authToken: company.db_token });
      
      // 找出所有 carry_over_valid_from 為空的紀錄
      const res = await client.execute(`SELECT id, year FROM "LeaveQuota" WHERE carry_over_valid_from IS NULL OR carry_over_valid_to IS NULL`);
      console.log(`Found ${res.rows.length} rows with NULL carry-over dates.`);
      
      let updated = 0;
      for (const row of res.rows) {
        const id = row[0];
        const year = row[1];
        const fromDate = `${year}-01-01`;
        const toDate = `${year}-12-31`;
        
        await client.execute({
          sql: `UPDATE "LeaveQuota" SET carry_over_valid_from = ?, carry_over_valid_to = ? WHERE id = ?`,
          args: [fromDate, toDate, id]
        });
        updated++;
      }
      console.log(`Updated ${updated} rows.`);
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

fixNullCarryOverDates();
