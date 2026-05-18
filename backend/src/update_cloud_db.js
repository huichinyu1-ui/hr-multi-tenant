const { createClient } = require('@libsql/client');
require('dotenv').config();

const createTableSql = `
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
);
CREATE UNIQUE INDEX IF NOT EXISTS "InsuranceGrade_type_grade_key" ON "InsuranceGrade"("type", "grade");
`;

async function updateCloudDb() {
  console.log('Connecting to Central DB...');
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  try {
    const rs = await centralDb.execute('SELECT * FROM "Company" WHERE code = \'TJS\'');
    if (rs.rows.length === 0) {
      console.log('TJS Company not found in central DB!');
      return;
    }
    const tjs = rs.rows[0];
    console.log('Found TJS. Updating its schema...');

    const tenantDb = createClient({
      url: tjs.db_url,
      authToken: tjs.db_token
    });

    const statements = createTableSql.split(';').filter(s => s.trim().length > 0);
    for (const sql of statements) {
      await tenantDb.execute(sql);
    }
    console.log('Successfully added InsuranceGrade table to TJS Cloud DB.');

    // Ensure ADMIN role has INSURANCE permission
    console.log('Updating TJS ADMIN permissions...');
    const roles = await tenantDb.execute('SELECT id FROM "Role" WHERE name = \'ADMIN\'');
    if (roles.rows.length > 0) {
      const adminRoleId = roles.rows[0].id;
      // Check if INSURANCE exists
      const existing = await tenantDb.execute(`SELECT * FROM "RolePermission" WHERE roleId = ${adminRoleId} AND module = 'INSURANCE'`);
      if (existing.rows.length === 0) {
        await tenantDb.execute(`
          INSERT INTO "RolePermission" 
          (roleId, module, canView, canCreate, canEdit, canDelete, selfOnly, canApprove, canImport, canPunch, canManagePayroll, canManageRole, canManageMetadata, canManageSettings)
          VALUES (${adminRoleId}, 'INSURANCE', 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0)
        `);
        console.log('Added INSURANCE permission to ADMIN role.');
      } else {
        console.log('ADMIN already has INSURANCE permission.');
      }
    }

  } catch (err) {
    console.error('Error updating cloud DB:', err);
  }
}

updateCloudDb();
