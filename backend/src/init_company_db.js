const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');

const url = 'libsql://hr-tjs-ustan.aws-ap-northeast-1.turso.io';
const authToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgwMzI0NzQsImlkIjoiMDE5ZGZhZmQtZjkwMS03OGQ3LTkyMzItNDJhMjAxNGI5YWIxIiwicmlkIjoiMTMxOTE3ZDUtZDEwMy00YzQ5LTljN2ItZTc1MWRkZWQwMGE5In0.SKvsopd9_CTGL79TshtoLFTKNVO9ZlQl6zUfW1jEfsVpdGjQFOoQ3oaxuP0Weq1E7B0qnFHGdqut74bbAq2VCw';

const client = createClient({
  url: url,
  authToken: authToken,
});

async function init() {
  try {
    console.log("Initializing Company DB (TJS) at:", url);
    
    const sql = fs.readFileSync(path.join(__dirname, '../prisma/company_init.sql'), 'utf8');
    
    // Split SQL by semicolon, but be careful with complex SQL. 
    // Turso client.execute(sql) can handle multiple statements if they are simple, 
    // but often it's safer to split or use a batch.
    
    const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    for (const statement of statements) {
      await client.execute(statement);
    }

    console.log("Company DB (TJS) initialized successfully!");
  } catch (err) {
    console.error("Error initializing Company DB:", err);
  } finally {
    client.close();
  }
}

init();
