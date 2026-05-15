const { createClient } = require('@libsql/client');
require('dotenv').config();

async function fix() {
  const c = createClient({ url: process.env.CENTRAL_DATABASE_URL, authToken: process.env.CENTRAL_AUTH_TOKEN });
  const rs = await c.execute("SELECT db_url, db_token FROM Company WHERE code = 'TJS1'");
  const { db_url, db_token } = rs.rows[0];
  const db = createClient({ url: db_url, authToken: db_token });

  // 1. 修正 meal_allowance 的 calc_type 為 FORMULA，公式引用 {meal_allowance} 但要先用不同內部名稱
  // 由於 meal_allowance 的公式引用自己的代碼，我們改讓公式引用不存在 pool 的原始欄位方式處理
  // 正確做法：將 meal_allowance 的 calc_type 改為 FORMULA，公式改為讀取員工欄位用特殊方式
  // 直接解法：改公式，讓條件為 false 時輸出固定從員工資料取的值 (用 0 + {meal_allowance} 技巧也無效)
  // 最乾淨的解法：將 meal_allowance 的 calc_type 設定為 FORMULA
  await db.execute({
    sql: "UPDATE PayrollItem SET calc_type = 'FORMULA', sort_order = 10 WHERE code = 'meal_allowance'",
    args: []
  });
  console.log('✅ meal_allowance calc_type 已更新為 FORMULA');

  // 2. 刪除重複的 meal_bonus 項目
  await db.execute({ sql: "DELETE FROM PayrollItem WHERE code = 'meal_bonus'", args: [] });
  console.log('✅ meal_bonus 已刪除');

  // 確認結果
  const items = await db.execute("SELECT code, name, calc_type, formula_expr, sort_order FROM PayrollItem ORDER BY sort_order");
  console.log('\n=== 更新後的薪資項目 ===');
  items.rows.forEach(i => console.log(`[${i.sort_order}] ${i.code} | ${i.calc_type} | ${i.formula_expr || '無公式'}`));

  await db.close(); await c.close();
}
fix().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
