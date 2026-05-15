const { createClient } = require('@libsql/client');
require('dotenv').config();

async function diagnoseDelete() {
  const db = createClient({
    url: process.env.DATABASE_URL || 'file:prisma/dev.db'
  });
  
  try {
    console.log('--- Database Schema Check ---');
    const tableInfo = await db.execute("PRAGMA table_info(InsurancePolicy)");
    console.table(tableInfo.rows);

    const data = await db.execute("SELECT * FROM InsurancePolicy");
    console.log('Current Policies:', data.rows.length);
    if (data.rows.length > 0) {
        const firstId = data.rows[0].id;
        console.log(`Attempting to dry-run delete ID: ${firstId}`);
        // 使用 TRANSACTION 確保不會真的刪除，只是測試語法
        await db.execute('BEGIN TRANSACTION');
        try {
            await db.execute(`DELETE FROM "InsurancePolicy" WHERE "id" = ${firstId}`);
            console.log('Delete command SQL syntax is OK.');
        } catch (e) {
            console.error('DELETE SQL FAILED:', e.message);
        }
        await db.execute('ROLLBACK');
    } else {
        console.log('No data to test delete with.');
    }
    
  } catch (err) {
    console.error('Diagnosis failed:', err);
  } finally {
    process.exit(0);
  }
}

diagnoseDelete();
