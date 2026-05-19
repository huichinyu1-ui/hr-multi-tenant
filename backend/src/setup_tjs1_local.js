const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('--- Setting up Local TJS1 Tenant ---');

  // 1. Copy dev.db to tjs1.db if not already copied
  const devDbPath = 'c:/Users/spfst/Desktop/Antigravity files/backend/prisma/dev.db';
  const tjs1DbPath = 'c:/Users/spfst/Desktop/Antigravity files/backend/prisma/tjs1.db';
  
  if (!fs.existsSync(tjs1DbPath)) {
    console.log('Copying dev.db to tjs1.db...');
    fs.copyFileSync(devDbPath, tjs1DbPath);
  } else {
    console.log('tjs1.db already exists.');
  }

  // 2. Register TJS1 in central.db
  const centralDb = new PrismaClient({
    datasources: { db: { url: 'file:c:/Users/spfst/Desktop/Antigravity files/backend/prisma/central.db' } }
  });
  
  try {
    await centralDb.company.upsert({
      where: { code: 'TJS1' },
      update: {
        name: 'TJS1 測試企業',
        db_url: 'file:' + tjs1DbPath,
        db_token: 'local_token',
        status: 'ACTIVE'
      },
      create: {
        code: 'TJS1',
        name: 'TJS1 測試企業',
        db_url: 'file:' + tjs1DbPath,
        db_token: 'local_token',
        status: 'ACTIVE'
      }
    });
    console.log('TJS1 registered in central.db');
  } finally {
    await centralDb.$disconnect();
  }

  // 3. Setup Stanley in tjs1.db
  const tjs1Db = new PrismaClient({
    datasources: { db: { url: 'file:' + tjs1DbPath } }
  });

  try {
    const adminRole = await tjs1Db.role.findUnique({ where: { name: 'ADMIN' } });
    if (!adminRole) {
      throw new Error('ADMIN role not found in tjs1.db');
    }

    await tjs1Db.employee.upsert({
      where: { username: 'Stanley' },
      update: {
        role: 'ADMIN',
        roleId: adminRole.id,
        password: '12311231',
        status: 'ACTIVE'
      },
      create: {
        code: 'STANLEY01',
        name: 'Stanley',
        username: 'Stanley',
        password: '12311231',
        role: 'ADMIN',
        roleId: adminRole.id,
        base_salary: 60000,
        status: 'ACTIVE'
      }
    });
    console.log('Stanley upserted in tjs1.db as ADMIN');

    // Also let's see if we have other employees in tjs1.db, if not let's upsert some dummy employees so batch print has multiple records!
    const empCount = await tjs1Db.employee.count();
    console.log(`Total employees in tjs1.db: ${empCount}`);
    if (empCount <= 2) {
      console.log('Adding extra dummy employees to tjs1.db...');
      await tjs1Db.employee.upsert({
        where: { code: 'A001' },
        update: {},
        create: {
          code: 'A001',
          name: '王小明',
          base_salary: 45000,
          status: 'ACTIVE'
        }
      });
      await tjs1Db.employee.upsert({
        where: { code: 'A002' },
        update: {},
        create: {
          code: 'A002',
          name: '陳大文',
          base_salary: 48000,
          status: 'ACTIVE'
        }
      });
    }
  } finally {
    await tjs1Db.$disconnect();
  }
}

main().catch(err => {
  console.error('Error setting up TJS1:', err);
});
