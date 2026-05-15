const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = process.env.CENTRAL_DATABASE_URL;
const authToken = process.env.CENTRAL_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing CENTRAL_DATABASE_URL or CENTRAL_AUTH_TOKEN in .env");
  process.exit(1);
}

const client = createClient({
  url: url,
  authToken: authToken,
});

async function init() {
  try {
    console.log("Initializing Central DB at:", url);
    
    await client.execute(`
      CREATE TABLE IF NOT EXISTS "Company" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "code" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "db_url" TEXT NOT NULL,
        "db_token" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.execute(`
      CREATE UNIQUE INDEX IF NOT EXISTS "Company_code_key" ON "Company"("code");
    `);

    console.log("Central DB initialized successfully!");
  } catch (err) {
    console.error("Error initializing Central DB:", err);
  } finally {
    client.close();
  }
}

init();
