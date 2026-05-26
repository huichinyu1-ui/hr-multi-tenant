const { createClient } = require('@libsql/client');

const tenants = [
  {
    code: 'TJS',
    url: 'libsql://hr-tjs-ustan.aws-ap-northeast-1.turso.io',
    token: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgwMzI0NzQsImlkIjoiMDE5ZGZhZmQtZjkwMS03OGQ3LTkyMzItNDJhMjAxNGI5YWIxIiwicmlkIjoiMTMxOTE3ZDUtZDEwMy00YzQ5LTljN2ItZTc1MWRkZWQwMGE5In0.SKvsopd9_CTGL79TshtoLFTKNVO9ZlQl6zUfW1jEfsVpdGjQFOoQ3oaxuP0Weq1E7B0qnFHGdqut74bbAq2VCw'
  },
  {
    code: 'TJS1',
    url: 'libsql://hr-tjs1-ustan.aws-ap-northeast-1.turso.io',
    token: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgyNTY3NjEsImlkIjoiMDE5ZGZhYmYtY2FiMC03MmNmLTk0ZWMtZTg2MTJmMTQ0N2E2IiwicmlkIjoiMDUwMjNlNmYtYzllNi00MGViLWI1MTYtN2U3YTFiYWFjNDkxIn0.P39-l_h8Y8yO28M1N89L6pX4r4t0a_qD-L_6Zq9zW8-5Y_L8a_6R_9yY_L_6Zq9zW8-5Y_L8a_6R_9yY'
  }
];

const sqlStatements = [
  `ALTER TABLE "LeaveType" ADD COLUMN "calculation_mode" TEXT DEFAULT 'CALENDAR'`,
  `ALTER TABLE "LeaveQuota" ADD COLUMN "valid_from" TEXT`,
  `ALTER TABLE "LeaveQuota" ADD COLUMN "valid_to" TEXT`
];

async function run() {
  for (const t of tenants) {
    console.log(`Fixing ${t.code}...`);
    const db = createClient({ url: t.url, authToken: t.token });
    for (const sql of sqlStatements) {
      try {
        await db.execute(sql);
        console.log(` ✅ ${sql}`);
      } catch(e) {
        if(e.message.includes('duplicate column name')) {
          console.log(` ⚠️ Skipped: ${sql}`);
        } else {
          console.error(` ❌ Failed: ${sql}`, e.message);
        }
      }
    }
  }
}
run();
