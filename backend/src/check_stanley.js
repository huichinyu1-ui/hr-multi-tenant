const { createClient } = require('@libsql/client');
require('dotenv').config();

async function checkStanley() {
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });
  
  try {
    const rs = await centralDb.execute("SELECT * FROM Company WHERE code = 'TJS1'");
    if (rs.rows.length === 0) {
      console.log('TJS1 Company not found in central DB!');
      return;
    }
    const company = rs.rows[0];
    console.log(`Connecting to TJS1 DB: ${company.db_url}`);
    
    const tenantDb = createClient({
      url: company.db_url,
      authToken: company.db_token
    });

    const user = await tenantDb.execute("SELECT * FROM Employee WHERE username = 'Stanley'");
    if (user.rows.length === 0) {
      console.log('User Stanley not found!');
      return;
    }
    const stanley = user.rows[0];
    console.log(`Stanley found. RoleId: ${stanley.roleId}`);

    const perms = await tenantDb.execute(`SELECT * FROM RolePermission WHERE roleId = ${stanley.roleId} AND module = 'INSURANCE'`);
    console.log('INSURANCE Perms for Stanley:', JSON.stringify(perms.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkStanley();
