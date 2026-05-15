/**
 * migrate_cloud_dbs.js
 * 
 * 將 Role / RolePermission 表結構推送到所有公司的雲端 Turso 資料庫
 * 執行方式：node migrate_cloud_dbs.js
 */
require('dotenv').config();
const { createClient } = require('@libsql/client');
const { PrismaClient } = require('@prisma/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

// ── SQL 語句定義 ──────────────────────────────────────────────
const MIGRATION_SQLS = [
  // 1. 建立 Role 表
  `CREATE TABLE IF NOT EXISTS "Role" (
    "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name"        TEXT    NOT NULL UNIQUE,
    "description" TEXT,
    "isSystem"    BOOLEAN NOT NULL DEFAULT 0
  )`,

  // 1b. 補齊舊版 Role 表缺少的欄位（已存在的表不會被 CREATE IF NOT EXISTS 更新）
  `ALTER TABLE "Role" ADD COLUMN "description" TEXT`,
  `ALTER TABLE "Role" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT 0`,

  // 2. 建立 RolePermission 表
  `CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "roleId"    INTEGER NOT NULL,
    "module"    TEXT    NOT NULL,
    "canView"   BOOLEAN NOT NULL DEFAULT 0,
    "canCreate" BOOLEAN NOT NULL DEFAULT 0,
    "canEdit"   BOOLEAN NOT NULL DEFAULT 0,
    "canDelete" BOOLEAN NOT NULL DEFAULT 0,
    "selfOnly"  BOOLEAN NOT NULL DEFAULT 0,
    CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE("roleId", "module")
  )`,

  // 3. 在 Employee 表加入 roleId 欄位（若不存在則加）
  `ALTER TABLE "Employee" ADD COLUMN "roleId" INTEGER REFERENCES "Role"("id")`
];

// ── 系統預設角色 ──────────────────────────────────────────────
const ALL_MODULES = ['EMP','ATT','LEAVE','PAYROLL','MISSED_PUNCH','CALENDAR','SHIFT','FORMULA'];

const SYSTEM_ROLES = [
  {
    name: 'ADMIN', description: '系統管理員 — 擁有全部模組的完整權限', isSystem: 1,
    permissions: ALL_MODULES.map(m => ({
      module: m, canView:1, canCreate:1, canEdit:1, canDelete:1, selfOnly:0
    }))
  },
  {
    name: 'COLLABORATOR', description: '協作者 — 可查看與管理報表', isSystem: 1,
    permissions: ALL_MODULES.map(m => ({
      module: m,
      canView: ['SHIFT','FORMULA'].includes(m) ? 0 : 1,
      canCreate: ['ATT','LEAVE','MISSED_PUNCH'].includes(m) ? 1 : 0,
      canEdit: ['ATT','LEAVE','MISSED_PUNCH'].includes(m) ? 1 : 0,
      canDelete: 0, selfOnly: 0
    }))
  },
  {
    name: 'EMPLOYEE', description: '一般員工 — 只能查看與管理本人資料', isSystem: 1,
    permissions: ALL_MODULES.map(m => ({
      module: m,
      canView: ['ATT','LEAVE','PAYROLL','MISSED_PUNCH','CALENDAR'].includes(m) ? 1 : 0,
      canCreate: ['LEAVE','MISSED_PUNCH'].includes(m) ? 1 : 0,
      canEdit: 0, canDelete: 0, selfOnly: 1
    }))
  }
];

async function migrateDb(companyCode, dbUrl, dbToken) {
  console.log(`\n[${companyCode}] Connecting to ${dbUrl}...`);
  const libsql = createClient({ url: dbUrl, authToken: dbToken });

  // 執行結構遷移
  for (const sql of MIGRATION_SQLS) {
    try {
      await libsql.execute(sql);
      console.log(`  ✅ OK: ${sql.substring(0, 60).trim()}...`);
    } catch (e) {
      // duplicate column / table already exists 是正常的
      if (e.message.includes('already exists') || e.message.includes('duplicate column')) {
        console.log(`  ⚠️  Skip (already exists): ${sql.substring(0, 40).trim()}...`);
      } else {
        console.error(`  ❌ Error: ${e.message}`);
      }
    }
  }

  // 種入系統角色
  // 先確認 Role 表的欄位（舊版可能有 permissions TEXT NOT NULL 欄位）
  const colInfo = await libsql.execute("PRAGMA table_info('Role')");
  const colNames = colInfo.rows.map(r => r.name);
  const hasOldPermsCol = colNames.includes('permissions');
  console.log(`  Role columns: ${colNames.join(', ')}`);
  if (hasOldPermsCol) console.log(`  ⚠️  Old 'permissions' column detected, will provide default value`);

  for (const role of SYSTEM_ROLES) {
    // 先確認是否已存在
    const existing = await libsql.execute({
      sql: 'SELECT id FROM "Role" WHERE name = ?',
      args: [role.name]
    });
    
    let roleId;
    if (existing.rows.length > 0) {
      roleId = existing.rows[0].id;
      // 更新 description 和 isSystem
      await libsql.execute({
        sql: 'UPDATE "Role" SET description = ?, isSystem = ? WHERE id = ?',
        args: [role.description, role.isSystem, roleId]
      });
      console.log(`  ⚠️  Role ${role.name} already exists (id=${roleId}), updated description`);
    } else {
      // 根據欄位結構決定 INSERT 方式
      if (hasOldPermsCol) {
        const result = await libsql.execute({
          sql: 'INSERT INTO "Role" (name, description, isSystem, permissions) VALUES (?, ?, ?, ?)',
          args: [role.name, role.description, role.isSystem, '{}']
        });
        roleId = result.lastInsertRowid;
      } else {
        const result = await libsql.execute({
          sql: 'INSERT INTO "Role" (name, description, isSystem) VALUES (?, ?, ?)',
          args: [role.name, role.description, role.isSystem]
        });
        roleId = result.lastInsertRowid;
      }
      console.log(`  ✅ Created role: ${role.name} (id=${roleId})`);
    }

    // 種入權限
    for (const perm of role.permissions) {
      try {
        await libsql.execute({
          sql: `INSERT OR IGNORE INTO "RolePermission" (roleId, module, canView, canCreate, canEdit, canDelete, selfOnly)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [roleId, perm.module, perm.canView, perm.canCreate, perm.canEdit, perm.canDelete, perm.selfOnly]
        });
      } catch (e) {
        if (!e.message.includes('UNIQUE')) console.error(`  ❌ Perm error: ${e.message}`);
      }
    }
    console.log(`  ✅ Permissions seeded for ${role.name}`);
  }

  await libsql.close();
}

async function main() {
  console.log('=== Cloud DB Migration: Role & RolePermission ===\n');

  // 連中央DB取得所有公司
  const centralLibsql = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });
  
  const companiesResult = await centralLibsql.execute("SELECT code, db_url, db_token FROM Company WHERE status = 'ACTIVE'");
  console.log(`Found ${companiesResult.rows.length} active company DB(s)`);

  for (const company of companiesResult.rows) {
    await migrateDb(company.code, company.db_url, company.db_token);
  }

  await centralLibsql.close();
  console.log('\n=== Migration Complete ===');
}

main().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
