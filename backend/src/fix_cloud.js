const { createClient } = require('@libsql/client');
require('dotenv').config();

async function fixCloud() {
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

    console.log('--- Fixing Cloud TJS1 Schema ---');
    
    // 強制重建表格以確保欄位完全符合
    await db.execute('DROP TABLE IF EXISTS InsurancePolicy');
    await db.execute(`
      CREATE TABLE InsurancePolicy (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT UNIQUE, 
        description TEXT, 
        hasLabor BOOLEAN DEFAULT 1, 
        hasHealth BOOLEAN DEFAULT 1, 
        hasPension BOOLEAN DEFAULT 1, 
        hasJobIns BOOLEAN DEFAULT 1
      )
    `);
    
    console.log('Cloud TJS1 Schema Fixed.');
  } catch (err) {
    console.error('Cloud fix failed:', err);
  } finally {
    process.exit(0);
  }
}

fixCloud();
