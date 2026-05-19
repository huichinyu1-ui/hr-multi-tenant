const { createClient } = require('@libsql/client');

const url = "libsql://hr-tjs1-ustan.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgyNTY3NjEsImlkIjoiMDE5ZGZhYmYtY2FiMC03MmNmLTk0ZWMtZTg2MTJmMTQ0N2E2IiwicmlkIjoiMDUwMjNlNmYtYzllNi00MGViLWI1MTYtN2U3YTFiYWFjNDkxIn0.P39-l_h8Y8yO28M1N89L6pX4r4t0a_qD-L_6Zq9zW8-5Y_L8a_6R_9yY_L_6Zq9zW8-5Y_L8a_6R_9yY";

const client = createClient({
  url: url,
  authToken: authToken
});

async function run() {
  try {
    await client.execute('ALTER TABLE "WorkShift" ADD COLUMN "overtime_end" TEXT;');
    console.log("Success!");
  } catch (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("Column already exists!");
    } else {
      console.error(err);
    }
  }
}

run();
