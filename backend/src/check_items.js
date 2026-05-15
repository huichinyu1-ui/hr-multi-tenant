const { createClient } = require('@libsql/client');
require('dotenv').config();

async function check() {
  const c = createClient({ url: process.env.CENTRAL_DATABASE_URL, authToken: process.env.CENTRAL_AUTH_TOKEN });
  const rs = await c.execute("SELECT db_url, db_token FROM Company WHERE code = 'TJS1'");
  const { db_url, db_token } = rs.rows[0];
  const db = createClient({ url: db_url, authToken: db_token });

  const items = await db.execute("SELECT id, code, name, calc_type, formula_expr, sort_order FROM PayrollItem ORDER BY sort_order");
  console.log('=== 所有薪資項目 ===');
  items.rows.forEach(i => console.log(`[${i.sort_order}] ${i.code} | ${i.calc_type} | ${i.formula_expr || '無公式'}`));
  await db.close(); await c.close();
}
check().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
