const { createClient } = require('@libsql/client');
const { centralClient } = require('./src/db_manager');

async function dumpTursoQuotas() {
  try {
    const companies = await centralClient.company.findMany();
    
    for (const company of companies) {
      if (company.code !== 'TJS') continue;
      
      console.log(`\n=== Quotas for ${company.code} ===`);
      const client = createClient({ url: company.db_url, authToken: company.db_token });
      
      const res = await client.execute(`SELECT id, employeeId, year, carried_over_hours, carry_over_valid_from, carry_over_valid_to FROM "LeaveQuota"`);
      console.log(`Total rows: ${res.rows.length}`);
      
      for (const row of res.rows) {
        console.log(`ID: ${row[0]}, Emp: ${row[1]}, Year: ${row[2]}, Carried: ${row[3]}, From: '${row[4]}', To: '${row[5]}'`);
      }
    }
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

dumpTursoQuotas();
