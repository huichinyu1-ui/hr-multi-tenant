const { execSync } = require('child_process');

console.log('--- Pushing to Central DB ---');
execSync('npx prisma db push --accept-data-loss', {
  env: { ...process.env, DATABASE_URL: 'file:./prisma/central.db' },
  stdio: 'inherit'
});

console.log('--- Pushing to Dev DB ---');
execSync('npx prisma db push --accept-data-loss', {
  env: { ...process.env, DATABASE_URL: 'file:./prisma/dev.db' },
  stdio: 'inherit'
});

console.log('--- Tables Created Successfully ---');
