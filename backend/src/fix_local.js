const { createClient } = require('@libsql/client');
require('dotenv').config();

async function fixLocal() {
  const db = createClient({
    url: process.env.DATABASE_URL || 'file:prisma/dev.db'
  });
  
  try {
    console.log('Migrating local database...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS InsurancePolicy (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        name TEXT UNIQUE, 
        description TEXT, 
        hasLabor BOOLEAN DEFAULT 1, 
        hasHealth BOOLEAN DEFAULT 1, 
        hasPension BOOLEAN DEFAULT 1, 
        hasJobIns BOOLEAN DEFAULT 1
      )
    `);
    
    try {
      await db.execute('ALTER TABLE Employee ADD COLUMN insurancePolicyId INTEGER');
      console.log('Added insurancePolicyId to Employee');
    } catch (e) {
      console.log('Column insurancePolicyId might already exist, skipping.');
    }
    
    console.log('Local Migration successful.');
  } catch (err) {
    console.error('Local migration failed:', err);
  } finally {
    process.exit(0);
  }
}

fixLocal();
