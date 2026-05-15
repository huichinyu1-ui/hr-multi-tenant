const { getCompanyClient } = require('./db_manager');

async function seedAdmin() {
  try {
    const db = await getCompanyClient('TJS');
    const admin = await db.employee.upsert({
      where: { code: 'ADMIN01' },
      update: {},
      create: {
        code: 'ADMIN01',
        name: '系統管理員',
        username: 'admin',
        password: 'password123',
        role: 'ADMIN',
        base_salary: 0,
        status: 'ACTIVE'
      }
    });
    console.log('Admin user created in TJS:', admin.username);
  } catch (err) {
    console.error('Error seeding admin in TJS:', err);
  }
}

seedAdmin();
