const { createClient } = require('@libsql/client');

async function run() {
  const client = createClient({ url: 'file:prisma/data.db' });
  const queries = [
    `ALTER TABLE "RolePermission" ADD COLUMN "canApprove" BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE "RolePermission" ADD COLUMN "canImport" BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE "RolePermission" ADD COLUMN "canManagePayroll" BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE "RolePermission" ADD COLUMN "canManageRole" BOOLEAN NOT NULL DEFAULT 0;`,
    `ALTER TABLE "RolePermission" ADD COLUMN "canManageMetadata" BOOLEAN NOT NULL DEFAULT 0;`
  ];
  for (const q of queries) {
    try {
      await client.execute(q);
      console.log('Success:', q);
    } catch (e) {
      console.error('Error on', q, e.message);
    }
  }
}
run();
