const { PrismaClient } = require('@prisma/client');
const { seedSystemRoles } = require('./controllers/roleController');

async function initLocalDev() {
  const db = new PrismaClient({
    datasources: { db: { url: 'file:./prisma/dev.db' } }
  });

  try {
    console.log('--- Initializing Local Dev DB ---');
    
    // 清除舊資料以確保權限模組更新
    await db.rolePermission.deleteMany();
    await db.role.deleteMany();

    // 1. 種入系統角色
    await seedSystemRoles(db);
    
    // 2. 獲取 ADMIN 角色 ID
    const adminRole = await db.role.findUnique({ where: { name: 'ADMIN' } });
    
    // 3. 建立或更新 admin 帳號
    await db.employee.upsert({
      where: { username: 'admin' },
      update: {
        role: 'ADMIN',
        roleId: adminRole.id
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

    console.log('Local Dev DB initialized successfully!');
  } catch (err) {
    console.error('Initialization failed:', err);
  } finally {
    await db.$disconnect();
  }
}

initLocalDev();
