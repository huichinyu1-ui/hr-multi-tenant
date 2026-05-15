const { createClient } = require('@libsql/client');
require('dotenv').config();

const LABOR_GRADES = [
    { grade: 1, salary_range_start: 0, salary_range_end: 27470, insured_salary: 27470 },
    { grade: 2, salary_range_start: 27471, salary_range_end: 28800, insured_salary: 28800 },
    { grade: 3, salary_range_start: 28801, salary_range_end: 30300, insured_salary: 30300 },
    { grade: 4, salary_range_start: 30301, salary_range_end: 31800, insured_salary: 31800 },
    { grade: 5, salary_range_start: 31801, salary_range_end: 33300, insured_salary: 33300 },
    { grade: 6, salary_range_start: 33301, salary_range_end: 34800, insured_salary: 34800 },
    { grade: 7, salary_range_start: 34801, salary_range_end: 36300, insured_salary: 36300 },
    { grade: 8, salary_range_start: 36301, salary_range_end: 38200, insured_salary: 38200 },
    { grade: 9, salary_range_start: 38201, salary_range_end: 40100, insured_salary: 40100 },
    { grade: 10, salary_range_start: 40101, salary_range_end: 42000, insured_salary: 42000 },
    { grade: 11, salary_range_start: 42001, salary_range_end: 43900, insured_salary: 43900 },
    { grade: 12, salary_range_start: 43901, salary_range_end: 45800, insured_salary: 45800 }
];

const PENSION_GRADES = [
    { grade: 1, salary_range_start: 0, salary_range_end: 1500, insured_salary: 1500 },
    { grade: 2, salary_range_start: 1501, salary_range_end: 3000, insured_salary: 3000 },
    { grade: 3, salary_range_start: 3001, salary_range_end: 4500, insured_salary: 4500 },
    { grade: 4, salary_range_start: 4501, salary_range_end: 6000, insured_salary: 6000 },
    { grade: 5, salary_range_start: 6001, salary_range_end: 7500, insured_salary: 7500 },
    { grade: 6, salary_range_start: 7501, salary_range_end: 8700, insured_salary: 8700 },
    { grade: 7, salary_range_start: 8701, salary_range_end: 9900, insured_salary: 9900 },
    { grade: 8, salary_range_start: 9901, salary_range_end: 11100, insured_salary: 11100 },
    { grade: 9, salary_range_start: 11101, salary_range_end: 12540, insured_salary: 12540 },
    { grade: 10, salary_range_start: 12541, salary_range_end: 13500, insured_salary: 13500 },
    { grade: 11, salary_range_start: 13501, salary_range_end: 15840, insured_salary: 15840 },
    { grade: 12, salary_range_start: 15841, salary_range_end: 16500, insured_salary: 16500 },
    { grade: 13, salary_range_start: 16501, salary_range_end: 17280, insured_salary: 17280 },
    { grade: 14, salary_range_start: 17281, salary_range_end: 17600, insured_salary: 17600 },
    { grade: 15, salary_range_start: 17601, salary_range_end: 18300, insured_salary: 18300 },
    { grade: 16, salary_range_start: 18301, salary_range_end: 19047, insured_salary: 19047 },
    { grade: 17, salary_range_start: 19048, salary_range_end: 20008, insured_salary: 20008 },
    { grade: 18, salary_range_start: 20009, salary_range_end: 21009, insured_salary: 21009 },
    { grade: 19, salary_range_start: 21010, salary_range_end: 22000, insured_salary: 22000 },
    { grade: 20, salary_range_start: 22001, salary_range_end: 23100, insured_salary: 23100 },
    { grade: 21, salary_range_start: 23101, salary_range_end: 24000, insured_salary: 24000 },
    { grade: 22, salary_range_start: 24001, salary_range_end: 25200, insured_salary: 25200 },
    { grade: 23, salary_range_start: 25201, salary_range_end: 26400, insured_salary: 26400 },
    { grade: 24, salary_range_start: 26401, salary_range_end: 27470, insured_salary: 27470 },
    { grade: 25, salary_range_start: 27471, salary_range_end: 28800, insured_salary: 28800 },
    { grade: 26, salary_range_start: 28801, salary_range_end: 30300, insured_salary: 30300 },
    { grade: 27, salary_range_start: 30301, salary_range_end: 31800, insured_salary: 31800 },
    { grade: 28, salary_range_start: 31801, salary_range_end: 33300, insured_salary: 33300 },
    { grade: 29, salary_range_start: 33301, salary_range_end: 34800, insured_salary: 34800 },
    { grade: 30, salary_range_start: 34801, salary_range_end: 36300, insured_salary: 36300 },
    { grade: 31, salary_range_start: 36301, salary_range_end: 38200, insured_salary: 38200 },
    { grade: 32, salary_range_start: 38201, salary_range_end: 40100, insured_salary: 40100 },
    { grade: 33, salary_range_start: 40101, salary_range_end: 42000, insured_salary: 42000 },
    { grade: 34, salary_range_start: 42001, salary_range_end: 43900, insured_salary: 43900 },
    { grade: 35, salary_range_start: 43901, salary_range_end: 45800, insured_salary: 45800 },
    { grade: 36, salary_range_start: 45801, salary_range_end: 48200, insured_salary: 48200 },
    { grade: 37, salary_range_start: 48201, salary_range_end: 50600, insured_salary: 50600 },
    { grade: 38, salary_range_start: 50601, salary_range_end: 53000, insured_salary: 53000 },
    { grade: 39, salary_range_start: 53001, salary_range_end: 55400, insured_salary: 55400 },
    { grade: 40, salary_range_start: 55401, salary_range_end: 57800, insured_salary: 57800 },
    { grade: 41, salary_range_start: 57801, salary_range_end: 60800, insured_salary: 60800 },
    { grade: 42, salary_range_start: 60801, salary_range_end: 63800, insured_salary: 63800 },
    { grade: 43, salary_range_start: 63801, salary_range_end: 66800, insured_salary: 66800 },
    { grade: 44, salary_range_start: 66801, salary_range_end: 69800, insured_salary: 69800 },
    { grade: 45, salary_range_start: 69801, salary_range_end: 72800, insured_salary: 72800 },
    { grade: 46, salary_range_start: 72801, salary_range_end: 76500, insured_salary: 76500 },
    { grade: 47, salary_range_start: 76501, salary_range_end: 80200, insured_salary: 80200 },
    { grade: 48, salary_range_start: 80201, salary_range_end: 83900, insured_salary: 83900 },
    { grade: 49, salary_range_start: 83901, salary_range_end: 87600, insured_salary: 87600 },
    { grade: 50, salary_range_start: 87601, salary_range_end: 92100, insured_salary: 92100 },
    { grade: 51, salary_range_start: 92101, salary_range_end: 96600, insured_salary: 96600 },
    { grade: 52, salary_range_start: 96601, salary_range_end: 101100, insured_salary: 101100 },
    { grade: 53, salary_range_start: 101101, salary_range_end: 105600, insured_salary: 105600 },
    { grade: 54, salary_range_start: 105601, salary_range_end: 110100, insured_salary: 110100 },
    { grade: 55, salary_range_start: 110101, salary_range_end: 115500, insured_salary: 115500 },
    { grade: 56, salary_range_start: 115501, salary_range_end: 120900, insured_salary: 120900 },
    { grade: 57, salary_range_start: 120901, salary_range_end: 126300, insured_salary: 126300 },
    { grade: 58, salary_range_start: 126301, salary_range_end: 131700, insured_salary: 131700 },
    { grade: 59, salary_range_start: 131701, salary_range_end: 137100, insured_salary: 137100 },
    { grade: 60, salary_range_start: 137101, salary_range_end: 142500, insured_salary: 142500 },
    { grade: 61, salary_range_start: 142501, salary_range_end: 147900, insured_salary: 147900 },
    { grade: 62, salary_range_start: 147901, salary_range_end: 150000, insured_salary: 150000 }
];

async function seedTJS1() {
  const centralDb = createClient({
    url: process.env.CENTRAL_DATABASE_URL,
    authToken: process.env.CENTRAL_AUTH_TOKEN
  });
  
  try {
    const rs = await centralDb.execute("SELECT * FROM Company WHERE code = 'TJS1'");
    if (rs.rows.length === 0) throw new Error('TJS1 not found');
    const company = rs.rows[0];
    
    // 使用從資料庫撈出來的正確 db_token
    const db = createClient({
      url: company.db_url,
      authToken: company.db_token
    });

    console.log('--- Database Access Verified for TJS1 ---');
    await db.execute('DELETE FROM "InsuranceGrade"');

    console.log('Seeding Labor Insurance Grades...');
    for (const item of LABOR_GRADES) {
      await db.execute({
        sql: 'INSERT INTO "InsuranceGrade" (type, grade, salary_range_start, salary_range_end, insured_salary, employee_ratio, employer_ratio) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['LABOR', item.grade, item.salary_range_start, item.salary_range_end, item.insured_salary, 0.2, 0.7]
      });
    }

    console.log('Seeding Health Insurance Grades...');
    for (let g = 1; g <= 12; g++) {
        const item = LABOR_GRADES[g-1];
        await db.execute({
            sql: 'INSERT INTO "InsuranceGrade" (type, grade, salary_range_start, salary_range_end, insured_salary, employee_ratio, employer_ratio) VALUES (?, ?, ?, ?, ?, ?, ?)',
            args: ['HEALTH', g, item.salary_range_start, item.salary_range_end, item.insured_salary, 0.3, 0.6]
        });
    }

    console.log('Seeding Pension Grades...');
    for (const item of PENSION_GRADES) {
      await db.execute({
        sql: 'INSERT INTO "InsuranceGrade" (type, grade, salary_range_start, salary_range_end, insured_salary, employee_ratio, employer_ratio) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: ['PENSION', item.grade, item.salary_range_start, item.salary_range_end, item.insured_salary, 0, 0.06]
      });
    }

    console.log('--- ALL GRADES SYNCED TO TJS1 CLOUD ---');

  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

seedTJS1();
