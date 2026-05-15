const { createClient } = require('@libsql/client');
require('dotenv').config();

async function seedExtraItems() {
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

    console.log('--- Seeding Extra Items on TJS1 ---');
    
    const items = [
      { name: '全勤獎金', code: 'full_attendance_bonus', type: 'ADDITION', calc_type: 'FIXED' },
      { name: '績效獎金', code: 'production_bonus', type: 'ADDITION', calc_type: 'VARIABLE' }
    ];

    for (const item of items) {
      await db.execute({
        sql: "INSERT OR IGNORE INTO PayrollItem (name, code, type, calc_type, is_active, is_global, sort_order) VALUES (?, ?, ?, ?, 1, 1, 10)",
        args: [item.name, item.code, item.type, item.calc_type]
      });
    }

    console.log('Items seeded.');
  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    process.exit(0);
  }
}

seedExtraItems();
