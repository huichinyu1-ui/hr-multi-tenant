const { createClient } = require('@libsql/client');
require('dotenv').config();

async function diagnose() {
  const centralDb = createClient({ url: process.env.CENTRAL_DATABASE_URL, authToken: process.env.CENTRAL_AUTH_TOKEN });
  const rs = await centralDb.execute("SELECT db_url, db_token FROM Company WHERE code = 'TJS1'");
  const { db_url, db_token } = rs.rows[0];
  const db = createClient({ url: db_url, authToken: db_token });

  // 1. 查詢伙食津貼薪資項目
  const items = await db.execute("SELECT id, code, calc_type, formula_expr FROM PayrollItem WHERE code = 'meal_allowance'");
  console.log('=== 伙食津貼薪資項目 ===');
  console.log(JSON.stringify(items.rows, null, 2));

  // 2. 查詢員工伙食津貼值
  const emps = await db.execute("SELECT id, name, meal_allowance FROM Employee WHERE status = 'ACTIVE' LIMIT 5");
  console.log('\n=== 員工伙食津貼欄位 ===');
  console.log(JSON.stringify(emps.rows, null, 2));

  await centralDb.close();
  await db.close();
}

diagnose().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
