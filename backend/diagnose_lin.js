const fs = require('fs');
const path = require('path');

async function main() {
  try {
    const dataPath = "c:\\Users\\spfst\\Desktop\\Antigravity files\\backup_TJS1_2026-05-17.json";
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log("Keys in backup JSON:", Object.keys(data));

    const emp = data.employees.find(e => e.name === "林順佑" || e.id === 13);
    if (!emp) {
      console.log("Lin not found");
      return;
    }

    // 1. Recreate createVariablePool logic
    const pool = {
      base: Number(emp.base_salary) || 0,
      base_salary: Number(emp.base_salary) || 0,
    };
    Object.keys(emp).forEach(key => {
      const val = emp[key];
      if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val) && val !== '' && val !== null)) {
        pool[key] = Number(val);
      }
    });

    // 2. Recreate AttendanceMatcher statistics logic
    const dailyRecords = (data.dailyRecords || []).filter(r => r.employeeId === emp.id && r.date.startsWith("2026-04"));
    const approvedLeaves = (data.leaveRequests || []).filter(r => r.employeeId === emp.id && r.status === "APPROVED" && (r.start_date.startsWith("2026-04") || r.end_date.startsWith("2026-04")));

    let present_days = 0, full_absent_days = 0, late_days = 0, early_leave_count = 0;
    let late_mins_total = 0, absent_hours_total = 0, early_leave_hours_total = 0, work_mins_total = 0;
    const leave_counts = {};

    for (const record of dailyRecords) {
      const isFullAbsent = record.status === 'ABSENT' && !record.clock_in;
      // Normal workshift id 1 has late buffer of 5 mins
      const lateBuffer = 5;
      const isPartialAbsent = record.clock_in && record.late_mins > lateBuffer;

      if (record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'EARLY' || isPartialAbsent) present_days += 1;
      if (isFullAbsent) {
        full_absent_days += 1;
        absent_hours_total += 8;
      }
      
      if (record.clock_in && record.late_mins > 0) {
        if (record.late_mins > lateBuffer) {
          absent_hours_total += Math.ceil(record.late_mins / 30) * 0.5;
        } else {
          late_days += 1;
          late_mins_total += record.late_mins;
        }
      }
    }

    for (const lr of approvedLeaves) {
      const lt = data.leaveTypes.find(t => t.id === lr.leaveTypeId);
      if (!lt) continue;
      const code = lt.code.toLowerCase();
      try {
        const [sYear, sMonth, sDay] = lr.start_date.split('-').map(Number);
        const [eYear, eMonth, eDay] = lr.end_date.split('-').map(Number);
        const diffDays = Math.round((new Date(eYear, eMonth-1, eDay) - new Date(sYear, sMonth-1, sDay)) / 86400000);
        let hours = 0;
        if (diffDays === 0) {
          const sMin = lr.start_time ? (+lr.start_time.split(':')[0]*60 + +lr.start_time.split(':')[1]) : 480;
          const eMin = lr.end_time   ? (+lr.end_time.split(':')[0]*60   + +lr.end_time.split(':')[1])   : 1020;
          const h = (eMin - sMin) / 60;
          hours = h >= 9 ? 8 : (h > 4 ? h - 1 : h);
        } else {
          hours = (diffDays + 1) * 8;
        }
        const roundedHours = Math.round((isNaN(hours) ? 0 : hours) * 2) / 2;
        leave_counts[`${code}_leave_hours`] = (leave_counts[`${code}_leave_hours`] || 0) + roundedHours;
      } catch (err) {}
    }

    const dynamicAttendanceVars = {
      absent_days: absent_hours_total / 8,
      absent_hours: absent_hours_total,
      late_days,
      late_mins: late_mins_total,
      ...leave_counts
    };

    console.log("\nDynamic Attendance Variables:", dynamicAttendanceVars);

    // Merge to pool
    Object.keys(dynamicAttendanceVars).forEach(key => {
      pool[key] = dynamicAttendanceVars[key];
    });

    // 3. Simulate leave deduction calculation
    let total_deduction = 0;
    const details = [];

    data.leaveTypes.forEach(lt => {
      if (lt.deduction_ratio > 0) {
        const hoursVar = `${lt.code.toLowerCase()}_leave_hours`;
        const takenHours = pool[hoursVar] || 0;
        if (takenHours > 0) {
          // deduction_base is parsed
          let deductionBase = pool.base_salary;
          if (lt.deduction_base === "{base_salary}+{full_attendance_bonus}+{meal_allowance}") {
            deductionBase = pool.base_salary + (pool.full_attendance_bonus || 0) + (pool.meal_allowance || 0);
          }
          const amount = Math.round((deductionBase / 240) * takenHours * lt.deduction_ratio);
          if (amount > 0) {
            total_deduction += amount;
            details.push({
              item_code: `leave_deduction_${lt.code.toLowerCase()}`,
              item_name: `請假扣薪 (${lt.name})`,
              amount: amount,
              type: 'DEDUCTION',
              note: `時數: ${takenHours}h`
            });
          }
        }
      }
    });

    console.log("\nCalculated Leave Deductions total:", total_deduction);
    details.forEach(d => console.log(`- ${d.item_name}: amount=${d.amount}, note=${d.note}`));

    // 4. Check if there are other formulas / items from central db or metadata that could add "曠職扣款 55"
    // Let's print out the exact values of variables:
    console.log("\nPool Variables:");
    console.log(`- base_salary: ${pool.base_salary}`);
    console.log(`- full_attendance_bonus: ${pool.full_attendance_bonus}`);
    console.log(`- meal_allowance: ${pool.meal_allowance}`);
    console.log(`- absent_hours: ${pool.absent_hours}`);
  } catch (err) {
    console.error("Error diagnosing:", err);
  }
}

main();
