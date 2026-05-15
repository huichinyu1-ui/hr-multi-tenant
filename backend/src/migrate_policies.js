const { createClient } = require('@libsql/client');
require('dotenv').config();

async function migrateInsurancePolicies() {
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute('SELECT * FROM "Company"');
    for (const company of rs.rows) {
      console.log(`\n[${company.code}] Migrating Insurance Policies...`);
      const db = createClient({
        url: company.db_url,
        authToken: company.db_token
      });

      // 1. Create InsurancePolicy table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "InsurancePolicy" (
            "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "name" TEXT NOT NULL,
            "description" TEXT,
            "hasLabor" BOOLEAN NOT NULL DEFAULT 1,
            "hasHealth" BOOLEAN NOT NULL DEFAULT 1,
            "hasPension" BOOLEAN NOT NULL DEFAULT 1,
            "hasJobIns" BOOLEAN NOT NULL DEFAULT 1
        )
      `);
      await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS "InsurancePolicy_name_key" ON "InsurancePolicy"("name")`);

      // 2. Add insurancePolicyId to Employee
      try {
        await db.execute(`ALTER TABLE "Employee" ADD COLUMN "insurancePolicyId" INTEGER`);
      } catch (e) {
        // ignore if column exists
      }

      console.log(`[${company.code}] Migration successful.`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

migrateInsurancePolicies();
