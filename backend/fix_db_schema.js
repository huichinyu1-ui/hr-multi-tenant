const { createClient } = require('@libsql/client');
const path = require('path');

// 直接查 SQLite 資料庫
const client = createClient({ url: 'file:' + path.join(__dirname, 'prisma/payroll.db') });

async function check() {
  // 查 Role 資料表的欄位結構
  const result = await client.execute("PRAGMA table_info('Role')");
  console.log('Role table columns:');
  result.rows.forEach(row => {
    console.log(' -', row.name, '|', row.type, '| nullable:', !row.notnull);
  });

  // 若缺少 description 欄位，手動加入
  const hasDesc = result.rows.some(r => r.name === 'description');
  const hasIsSystem = result.rows.some(r => r.name === 'isSystem');

  if (!hasDesc) {
    console.log('\n⚠️  Missing description column - adding it...');
    await client.execute("ALTER TABLE 'Role' ADD COLUMN 'description' TEXT");
    console.log('✅ description column added');
  } else {
    console.log('\n✅ description column exists');
  }

  if (!hasIsSystem) {
    console.log('\n⚠️  Missing isSystem column - adding it...');
    await client.execute("ALTER TABLE 'Role' ADD COLUMN 'isSystem' INTEGER NOT NULL DEFAULT 0");
    console.log('✅ isSystem column added');
  } else {
    console.log('\n✅ isSystem column exists');
  }

  // 確認 RolePermission 表也存在
  const rp = await client.execute("PRAGMA table_info('RolePermission')");
  console.log('\nRolePermission columns:', rp.rows.map(r => r.name).join(', '));

  await client.close();
}

check().catch(console.error);
