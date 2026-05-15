const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const sql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', { encoding: 'utf8' });
  fs.writeFileSync(path.join(__dirname, '../prisma/company_init.sql'), sql, 'utf8');
  console.log('Successfully generated company_init.sql in UTF-8');
} catch (err) {
  console.error('Error generating SQL:', err.message);
}
