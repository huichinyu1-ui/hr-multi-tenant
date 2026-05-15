const { createClient } = require('@libsql/client');
const { centralClient } = require('./src/db_manager');

async function updateTenantDbs() {
  const companies = await centralClient.company.findMany();
  
  const queries = [
    `ALTER TABLE "RolePermission" ADD COLUMN "canApprove" BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE "RolePermission" ADD COLUMN "canImport" BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE "RolePermission" ADD COLUMN "canManagePayroll" BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE "RolePermission" ADD COLUMN "canManageRole" BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE "RolePermission" ADD COLUMN "canManageMetadata" BOOLEAN NOT NULL DEFAULT 0;`
  ];

  for (const company of companies) {
    if (!company.db_url || !company.db_token) continue;
    
    console.log(`\nUpdating DB for company: ${company.code} (${company.name})`);
    const client = createClient({
      url: company.db_url,
      authToken: company.db_token,
    });

    for (const q of queries) {
      try {
        await client.execute(q);
        console.log(`  [OK] ${q.split('ADD COLUMN ')[1]}`);
      } catch (e) {
        if (e.message.includes('duplicate column name')) {
          console.log(`  [SKIP] ${q.split('ADD COLUMN ')[1]} (already exists)`);
        } else {
          console.error(`  [ERROR] ${q.split('ADD COLUMN ')[1]} - ${e.message}`);
        }
      }
    }
  }
  
  console.log('\nAll done.');
  process.exit(0);
}

updateTenantDbs();
