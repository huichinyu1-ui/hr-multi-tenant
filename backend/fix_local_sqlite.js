const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

async function fixLocalSqlite() {
  const dbs = ['tjs.db', 'tjs1.db'];
  
  for (const dbName of dbs) {
    console.log(`\nFixing ${dbName}...`);
    const dbPath = path.join(__dirname, 'prisma', dbName);
    if (!fs.existsSync(dbPath)) continue;
    
    try {
      // Direct sqlite3 command to update
      execSync(`sqlite3 "${dbPath}" "UPDATE LeaveQuota SET carry_over_valid_from = year || '-01-01', carry_over_valid_to = year || '-12-31' WHERE carry_over_valid_from IS NULL OR carry_over_valid_to IS NULL OR carry_over_valid_from = '' OR carry_over_valid_to = '';"`);
      console.log(`Successfully updated ${dbName} using sqlite3 CLI`);
    } catch(e) {
      console.error(`Error updating ${dbName}:`, e.message);
    }
  }
}

fixLocalSqlite();
