const { createClient } = require('@libsql/client');
require('dotenv').config();

async function syncAllCloudSchemas() {
  console.log('--- Global Cloud Sync Starting ---');
  
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute('SELECT * FROM "Company"');
    console.log(`Found ${rs.rows.length} companies to sync.`);

    for (const company of rs.rows) {
      console.log(`\n[${company.code}] Syncing...`);
      const tenantDb = createClient({
        url: company.db_url,
        authToken: company.db_token
      });

      // 1. Create InsuranceGrade table
      await tenantDb.execute(`
        CREATE TABLE IF NOT EXISTS "InsuranceGrade" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "type" TEXT NOT NULL,
            "grade" INTEGER NOT NULL,
            "salary_range_start" REAL NOT NULL,
            "salary_range_end" REAL NOT NULL,
            "insured_salary" REAL NOT NULL,
            "employee_ratio" REAL NOT NULL DEFAULT 0,
            "employer_ratio" REAL NOT NULL DEFAULT 0,
            "note" TEXT
        )
      `);
      await tenantDb.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceGrade_type_grade_key" ON "InsuranceGrade"("type", "grade")`);

      // 2. Add missing columns to RolePermission
      const cols = ['canApprove', 'canImport', 'canPunch', 'canManagePayroll', 'canManageRole', 'canManageMetadata', 'canManageSettings'];
      for (const col of cols) {
        try {
          await tenantDb.execute(`ALTER TABLE "RolePermission" ADD COLUMN "${col}" BOOLEAN NOT NULL DEFAULT 0`);
        } catch (e) {} // ignore duplicates
      }

      // 3. Add roleId to Employee
      try {
        await tenantDb.execute(`ALTER TABLE "Employee" ADD COLUMN "roleId" INTEGER`);
      } catch (e) {}

      console.log(`[${company.code}] Table structures synced.`);
    }

  } catch (err) {
    console.error('Fatal Sync Error:', err);
  } finally {
    console.log('\n--- Global Sync Finished ---');
    process.exit(0);
  }
}

syncAllCloudSchemas();
