const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { seedSystemRoles } = require('./controllers/roleController');

async function setupLocalTesting() {
  // 1. 初始化中央資料庫
  const centralDb = new PrismaClient({
    datasources: { db: { url: 'file:./prisma/central.db' } }
  });

  try {
    console.log('--- Setting up Local Central DB ---');
    await centralDb.company.upsert({
      where: { code: 'TJS' },
      update: {
        name: '本機測試企業 (TJS)',
        db_url: 'file:' + path.join(process.cwd(), 'prisma/dev.db'),
        db_token: 'local_token',
        status: 'ACTIVE'
      },
      create: {
        code: 'TJS',
        name: '本機測試企業 (TJS)',
        db_url: 'file:' + path.join(process.cwd(), 'prisma/dev.db'),
        db_token: 'local_token',
        status: 'ACTIVE'
      }
    });
    console.log('Central DB TJS record updated.');
  } finally {
    await centralDb.$disconnect();
  }

  // 2. 初始化租戶資料庫 (dev.db)
  const tenantDb = new PrismaClient({
    datasources: { db: { url: 'file:./prisma/dev.db' } }
  });

  try {
    console.log('--- Setting up Local Tenant DB (dev.db) ---');
    
    // 清除舊權限以更新模組
    await tenantDb.rolePermission.deleteMany();
    await tenantDb.role.deleteMany();
    await seedSystemRoles(tenantDb);

    const adminRole = await tenantDb.role.findUnique({ where: { name: 'ADMIN' } });

    await tenantDb.employee.upsert({
      where: { username: 'admin' },
      update: {
        role: 'ADMIN',
        roleId: adminRole.id,
        password: 'password123'
      },
      create: {
        code: 'ADMIN01',
        name: '本機管理員',
        username: 'admin',
        password: 'password123',
        role: 'ADMIN',
        roleId: adminRole.id,
        base_salary: 0,
        status: 'ACTIVE'
      }
    });
    console.log('Tenant DB Admin updated.');
  } finally {
    await tenantDb.$disconnect();
  }
}

setupLocalTesting();
