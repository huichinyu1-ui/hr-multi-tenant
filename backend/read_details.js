const { createClient } = require('@libsql/client');

async function main() {
  const db = createClient({
    url: "file:c:/Users/spfst/Desktop/Antigravity files/backend/prisma/tjs1.db"
  });

  try {
    console.log("=== Querying Employee Lin in tjs1.db ===");
    const empResult = await db.execute("SELECT * FROM Employee WHERE name LIKE '%林順佑%'");
    console.log("Employee:", empResult.rows[0]);

    if (empResult.rows.length > 0) {
      const empId = empResult.rows[0].id;
      const payrollResult = await db.execute({
        sql: "SELECT * FROM PayrollRecord WHERE employeeId = ? AND year_month = '2026-04'",
        args: [empId]
      });
      console.log("Payroll Record:", payrollResult.rows);

      if (payrollResult.rows.length > 0) {
        const prId = payrollResult.rows[0].id;
        const details = await db.execute({
          sql: "SELECT * FROM PayrollDetail WHERE payrollRecordId = ?",
          args: [prId]
        });
        console.log("\n--- Calculated Payroll Details ---");
        details.rows.forEach(d => {
          console.log(`- Item Code: ${d.item_code} | Name: ${d.item_name} | Amount: ${d.amount} | Type: ${d.type} | Note: ${d.note}`);
        });
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
