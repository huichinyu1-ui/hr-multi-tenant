const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env' });

async function check() {
  const url = process.env.CENTRAL_DATABASE_URL;
  const token = process.env.CENTRAL_AUTH_TOKEN;
  const client = createClient({ url, authToken: token });
  const result = await client.execute('SELECT * FROM Company');
  console.log(result.rows);
}
check();
