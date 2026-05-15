const { createClient } = require('@libsql/client');
require('dotenv').config();

async function syncCloudSchema() {
  console.log('--- Syncing Cloud Databases ---');
  
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute('SELECT * FROM "Company"');
    console.log(`Found ${rs.rows.length} companies in Cloud Central DB.`);

    for (const tjs of rs.rows) {
      // Sync all companies
      // if (tjs.code !== 'TJS') continue; 

      console.log(`\nSyncing Company: ${tjs.code}...`);
      const tenantDb = createClient({
        url: tjs.db_url,
        authToken: tjs.db_token
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
      console.log(' - InsuranceGrade table created.');

      // 2. Add missing columns to RolePermission
      const columnsToAdd = [
        'canApprove', 'canImport', 'canPunch', 'canManagePayroll', 
        'canManageRole', 'canManageMetadata', 'canManageSettings'
      ];
      
      for (const col of columnsToAdd) {
        try {
          await tenantDb.execute(`ALTER TABLE "RolePermission" ADD COLUMN "${col}" BOOLEAN NOT NULL DEFAULT 0`);
          console.log(` - Added column ${col} to RolePermission.`);
        } catch (e) {
          if (e.message.includes('duplicate column name')) {
            // Ignore if already exists
          } else {
            console.error(` - Error adding ${col}:`, e.message);
          }
        }
      }

      // 3. Add missing columns to Employee
      try {
        await tenantDb.execute(`ALTER TABLE "Employee" ADD COLUMN "roleId" INTEGER`);
        console.log(` - Added column roleId to Employee.`);
      } catch (e) {
        if (!e.message.includes('duplicate column name')) console.error(e.message);
      }

      // 4. Update ADMIN role to have INSURANCE permissions
      const roles = await tenantDb.execute('SELECT id FROM "Role" WHERE name = \'ADMIN\'');
      if (roles.rows.length > 0) {
        const adminRoleId = roles.rows[0].id;
        const existing = await tenantDb.execute(`SELECT * FROM "RolePermission" WHERE roleId = ${adminRoleId} AND module = 'INSURANCE'`);
        if (existing.rows.length === 0) {
          await tenantDb.execute(`
            INSERT INTO "RolePermission" 
            (roleId, module, canView, canCreate, canEdit, canDelete, selfOnly, canApprove, canImport, canPunch, canManagePayroll, canManageRole, canManageMetadata, canManageSettings)
            VALUES (${adminRoleId}, 'INSURANCE', 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0)
          `);
          console.log(' - Added INSURANCE permission to ADMIN role.');
        }
      }
      
      console.log(`Company ${tjs.code} sync complete.`);
    }

  } catch (err) {
    console.error('Fatal Sync Error:', err);
  } finally {
    console.log('\n--- Sync Finished ---');
  }
}

syncCloudSchema();
