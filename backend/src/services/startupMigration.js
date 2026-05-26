const { createClient } = require('@libsql/client');

/**
 * 自動遷移：確保所有租戶資料庫都有最新的欄位
 * 每次伺服器啟動時執行，自動補齊缺少的欄位（使用 ALTER TABLE IF NOT EXISTS 邏輯）
 */
async function runStartupMigrations(centralClient) {
  const migrations = [
    // LeaveType 週年制欄位
    `ALTER TABLE "LeaveType" ADD COLUMN "calculation_mode" TEXT DEFAULT 'CALENDAR'`,
    // LeaveQuota 有效起訖日
    `ALTER TABLE "LeaveQuota" ADD COLUMN "valid_from" TEXT`,
    `ALTER TABLE "LeaveQuota" ADD COLUMN "valid_to" TEXT`,
    `ALTER TABLE "LeaveQuota" ADD COLUMN "carry_over_valid_from" TEXT`,
    `ALTER TABLE "LeaveQuota" ADD COLUMN "carry_over_valid_to" TEXT`,
  ];

  try {
    // 取得中央 DB 中所有公司
    const rs = await centralClient.$queryRawUnsafe('SELECT code, db_url, db_token FROM "Company" WHERE status = \'ACTIVE\'');
    
    for (const company of rs) {
      // 跳過本地 SQLite 檔案 (開發環境)
      if (!company.db_url || company.db_url.startsWith('file:')) continue;

      const tenantDb = createClient({
        url: company.db_url,
        authToken: company.db_token,
      });

      for (const sql of migrations) {
        try {
          await tenantDb.execute(sql);
        } catch (e) {
          // 欄位已存在 → 忽略
          if (!e.message || !e.message.includes('duplicate column name')) {
            console.warn(`[Migration][${company.code}] ${e.message}`);
          }
        }
      }
    }
  } catch (e) {
    // 啟動遷移失敗不應阻止伺服器運行
    console.warn('[Startup Migration] Error:', e.message);
  }
}

module.exports = { runStartupMigrations };
