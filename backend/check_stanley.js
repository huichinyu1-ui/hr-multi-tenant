const { getCompanyClient } = require('./src/db_manager');
async function check() {
  try {
    const db = await getCompanyClient('TJS1');
    const emp = await db.employee.findUnique({ where: { username: 'Stanley' } });
    console.log('TJS1 Stanley:', emp ? 'Found' : 'Not Found', emp ? emp.role : '');
  } catch(e) { console.log('TJS1 Error', e.message); }

  try {
    const db2 = await getCompanyClient('TJS');
    const emp2 = await db2.employee.findUnique({ where: { username: 'Stanley' } });
    console.log('TJS Stanley:', emp2 ? 'Found' : 'Not Found', emp2 ? emp2.role : '');
  } catch(e) { console.log('TJS Error', e.message); }
}
check();
