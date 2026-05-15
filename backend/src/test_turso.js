const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
require('dotenv').config();

const libsql = createClient({
  url: process.env.CENTRAL_DATABASE_URL,
  authToken: process.env.CENTRAL_AUTH_TOKEN,
});
const adapter = new PrismaLibSql(libsql);
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    const companies = await prisma.company.findMany();
    console.log('Companies:', companies);
  } catch (err) {
    console.error('Test Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
