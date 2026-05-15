const { centralClient } = require('./db_manager');

async function addCompany() {
  try {
    const company = await centralClient.company.upsert({
      where: { code: 'TJS' },
      update: {
        name: 'TJS 測試單位',
        db_url: 'libsql://hr-tjs-ustan.aws-ap-northeast-1.turso.io',
        db_token: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgwMzI0NzQsImlkIjoiMDE5ZGZhZmQtZjkwMS03OGQ3LTkyMzItNDJhMjAxNGI5YWIxIiwicmlkIjoiMTMxOTE3ZDUtZDEwMy00YzQ5LTljN2ItZTc1MWRkZWQwMGE5In0.SKvsopd9_CTGL79TshtoLFTKNVO9ZlQl6zUfW1jEfsVpdGjQFOoQ3oaxuP0Weq1E7B0qnFHGdqut74bbAq2VCw',
        status: 'ACTIVE'
      },
      create: {
        code: 'TJS',
        name: 'TJS 測試單位',
        db_url: 'libsql://hr-tjs-ustan.aws-ap-northeast-1.turso.io',
        db_token: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzgwMzI0NzQsImlkIjoiMDE5ZGZhZmQtZjkwMS03OGQ3LTkyMzItNDJhMjAxNGI5YWIxIiwicmlkIjoiMTMxOTE3ZDUtZDEwMy00YzQ5LTljN2ItZTc1MWRkZWQwMGE5In0.SKvsopd9_CTGL79TshtoLFTKNVO9ZlQl6zUfW1jEfsVpdGjQFOoQ3oaxuP0Weq1E7B0qnFHGdqut74bbAq2VCw',
        status: 'ACTIVE'
      }
    });
    console.log('Successfully registered company:', company.code);
  } catch (err) {
    console.error('Error registering company:', err);
  } finally {
    await centralClient.$disconnect();
  }
}

addCompany();
