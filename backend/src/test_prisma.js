const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function test() {
  const tjsToken = process.env.CENTRAL_AUTH_TOKEN; // just for test, actually I should query company
  
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });

  const rs = await centralDb.execute('SELECT * FROM "Company" WHERE code = \'TJS1\'');
  const tjs = rs.rows[0];

  const libsql = createClient({
    url: tjs.db_url,
    authToken: tjs.db_token
  });
  
  const adapter = new PrismaLibSQL(libsql);
  const prisma = new PrismaClient({ adapter });

  try {
    const types = await prisma.leaveType.findMany();
    console.log('Leave Types:', types.length);
    
    const requests = await prisma.leaveRequest.findMany();
    console.log('Leave Requests:', requests.length);
  } catch(e) {
    console.error('Prisma Error:', e);
  }
}
test();
