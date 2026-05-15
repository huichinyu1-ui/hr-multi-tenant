const xlsx = require('xlsx');
const path = require('path');

const data = [
    { employee_code: "A001", date: "2023-10-02", clock_in: "09:00", clock_out: "18:00" },
    { employee_code: "A001", date: "2023-10-03", clock_in: "09:05", clock_out: "18:10" },
    // A001 on 10-04 is absent or leave, so we omit it to test auto-matching
    { employee_code: "A002", date: "2023-10-02", clock_in: "08:50", clock_out: "18:05" },
    { employee_code: "A002", date: "2023-10-03", clock_in: "08:55", clock_out: "18:00" },
    { employee_code: "A002", date: "2023-10-04", clock_in: "08:55", clock_out: "18:00" }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");

const outPath = path.join(__dirname, 'sample_daily_attendance.xlsx');
xlsx.writeFile(wb, outPath);
console.log("Excel file created at", outPath);
