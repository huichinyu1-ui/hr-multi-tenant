
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_TOKEN;
  const libsql = createClient({ url: connectionString, authToken });
  const adapter = new PrismaLibSQL(libsql);
  const prisma = new PrismaClient({ adapter });

  const statements = [
    `ALTER TABLE "LeaveQuota" ADD COLUMN "carry_over_valid_from" TEXT`,
    `ALTER TABLE "LeaveQuota" ADD COLUMN "carry_over_valid_to" TEXT`
  ];

  for (let stmt of statements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log('Success:', stmt);
    } catch (e) {
      if (e.message.includes('duplicate column name')) {
        console.log('Skipped (already exists):', stmt);
      } else {
        console.error('Error on', stmt, e.message);
      }
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
