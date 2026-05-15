// 移除全域 prisma，由外部傳入

/**
 * 將 "HH:MM" 格式轉換成當天的分鐘數，方便比較
 */
function timeToMins(hhmm) {
  if (!hhmm) return null;
  const cleanStr = String(hhmm).replace(/[^\d:]/g, '');
  if (!cleanStr) return null;
  const [h, m] = cleanStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * 依加班最小單位截斷分鐘數（無條件捨去）
 */
function floorToUnit(mins, unit) {
  if (!unit || unit <= 0) return mins;
  return Math.floor(mins / unit) * unit;
}

class AttendanceMatcher {
  /**
   * 執行某個日期區間的考勤自動比對（含班別考勤解析）
   */
  static async matchAttendance(prisma, start_date, end_date) {
    // 【批次優化】一次性並行撈取所有需要的資料，完全消除 N+1 查詢問題
    const [calendarDays, employees, leaveRequests, overtimeRequests, allDailyRecords] = await Promise.all([
      prisma.calendarDay.findMany({
        where: { date: { gte: start_date, lte: end_date } },
        orderBy: { date: 'asc' }
      }),
      prisma.employee.findMany({
        where: { OR: [{ status: 'ACTIVE' }, { status: 'RESIGNED' }] },
        include: { workShift: true }
      }),
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          OR: [
            { start_date: { gte: start_date, lte: end_date } },
            { end_date: { gte: start_date, lte: end_date } },
            { start_date: { lte: start_date }, end_date: { gte: end_date } }
          ]
        },
        include: { leaveType: true }
      }),
      prisma.overtimeRequest.findMany({
        where: { status: 'APPROVED', date: { gte: start_date, lte: end_date } }
      }),
      // 一次撈取「所有員工」當月所有打卡紀錄，不再逐人查詢
      prisma.dailyRecord.findMany({
        where: { date: { gte: start_date, lte: end_date } }
      }),
      // 新增：撈取所有已核准的補打卡申請
      prisma.missedPunchRequest.findMany({
        where: { status: 'APPROVED', date: { gte: start_date, lte: end_date } }
      })
    ]);

    if (calendarDays.length === 0) {
      console.warn(`[AttendanceMatcher] 尚未設定 ${start_date}~${end_date} 的行事曆工作日`);
      return;
    }

    // 建立高速查找 Map（O(1) 存取，取代陣列 find 的 O(N) 搜尋）
    const recordMap = new Map(); // key: `${empId}_${date}` -> record
    allDailyRecords.forEach(r => recordMap.set(`${r.employeeId}_${r.date}`, r));

    const leavesByEmp = new Map();
    leaveRequests.forEach(lr => {
      if (!leavesByEmp.has(lr.employeeId)) leavesByEmp.set(lr.employeeId, []);
      leavesByEmp.get(lr.employeeId).push(lr);
    });

    const otByEmpDate = new Map();
    overtimeRequests.forEach(ot => otByEmpDate.set(`${ot.employeeId}_${ot.date}`, ot));
    
    const mpByEmpDate = new Map();
    missedPunchRequests.forEach(mp => {
      const key = `${mp.employeeId}_${mp.date}`;
      if (!mpByEmpDate.has(key)) mpByEmpDate.set(key, []);
      mpByEmpDate.get(key).push(mp);
    });

    // 在記憶體中計算所有需要的變更，累積成操作陣列
    const operations = [];

    // 【效能優化】髒檢查：只針對真正有異動的欄位產生資料庫更新，大幅減少寫入次數
    const pushIfChanged = (existingRecord, empId, dateStr, newData) => {
      if (!existingRecord) {
        operations.push(prisma.dailyRecord.create({
          data: { employeeId: empId, date: dateStr, ...newData }
        }));
        return;
      }
      
      let isDirty = false;
      for (const key of Object.keys(newData)) {
        if (existingRecord[key] !== newData[key]) {
          isDirty = true;
          break;
        }
      }
      
      if (isDirty) {
        operations.push(prisma.dailyRecord.update({
          where: { id: existingRecord.id },
          data: newData
        }));
      }
    };

    for (const emp of employees) {
      const shift = emp.workShift;
      const empLeaves = leavesByEmp.get(emp.id) || [];

      for (const cDay of calendarDays) {
        const dateStr = cDay.date;

        if (emp.join_date && dateStr < emp.join_date) continue;
        if (emp.resign_date && dateStr > emp.resign_date) continue;

        const existingRecord = recordMap.get(`${emp.id}_${dateStr}`);
        // 關鍵：這裡的 hasClock 包含了「補打卡」後寫入 DailyRecord 的時間
        const leave = empLeaves.find(lr => dateStr >= lr.start_date && dateStr <= lr.end_date);
        const otReq = otByEmpDate.get(`${emp.id}_${dateStr}`);
        const mps = mpByEmpDate.get(`${emp.id}_${dateStr}`) || [];
        
        // 核心邏輯：將補打卡的時間套用到現有紀錄（或建立虛擬紀錄供計算）
        let effectiveClockIn = existingRecord?.clock_in || null;
        let effectiveClockOut = existingRecord?.clock_out || null;
        
        mps.forEach(mp => {
          if (mp.punch_type === 'IN') effectiveClockIn = mp.target_time;
          if (mp.punch_type === 'OUT') effectiveClockOut = mp.target_time;
        });

        const hasClock = effectiveClockIn || effectiveClockOut;

        if (cDay.is_workday) {
          if (!hasClock) {
            if (leave) {
              const newData = { status: 'LEAVE', leave_code: leave.leaveType.code, late_mins: 0, early_leave_mins: 0, overtime1_mins: 0, overtime2_mins: 0, holiday_overtime_mins: 0 };
              pushIfChanged(existingRecord, emp.id, dateStr, newData);
            } else {
              const newData = { status: 'ABSENT', leave_code: null, late_mins: 0, early_leave_mins: 0, overtime1_mins: 0, overtime2_mins: 0, holiday_overtime_mins: 0 };
              pushIfChanged(existingRecord, emp.id, dateStr, newData);
            }
          } else {
            const parsed = AttendanceMatcher.parseAttendance({ clock_in: effectiveClockIn, clock_out: effectiveClockOut }, shift);
            let finalStatus = 'PRESENT';
            if (parsed.clock_in_status === 'ABSENT') finalStatus = 'ABSENT';
            else if (parsed.late_mins > 0) finalStatus = 'LATE';
            else if (parsed.early_leave_mins > 0) finalStatus = 'EARLY';
            let finalLeaveCode = null;
            if (leave) {
              finalStatus = 'PRESENT';
              finalLeaveCode = leave.leaveType.code;
            }
            const newData = {
              status: finalStatus,
              leave_code: finalLeaveCode,
              late_mins: leave ? 0 : parsed.late_mins,
              early_leave_mins: leave ? 0 : parsed.early_leave_mins,
              work_mins: parsed.work_mins,
              overtime1_mins: parsed.overtime1_mins,
              overtime2_mins: parsed.overtime2_mins,
              holiday_overtime_mins: 0,
              clock_in: effectiveClockIn,
              clock_out: effectiveClockOut
            };
            pushIfChanged(existingRecord, emp.id, dateStr, newData);
          }
        } else {
          if (hasClock) {
            let holiday_overtime_mins = 0;
            if (otReq && existingRecord.clock_in && existingRecord.clock_out) {
              const reqStart = timeToMins(otReq.start_time);
              const reqEnd = timeToMins(otReq.end_time);
              const actStart = timeToMins(effectiveClockIn);
              const actEnd = timeToMins(effectiveClockOut);
              const overlapStart = Math.max(reqStart, actStart);
              const overlapEnd = Math.min(reqEnd, actEnd);
              if (overlapEnd > overlapStart) {
                holiday_overtime_mins = floorToUnit(overlapEnd - overlapStart, shift?.overtime_min_unit || 30);
              }
            }
            const newData = {
              status: 'PRESENT',
              late_mins: 0,
              early_leave_mins: 0,
              work_mins: 0,
              overtime1_mins: 0,
              overtime2_mins: 0,
              holiday_overtime_mins
            };
            pushIfChanged(existingRecord, emp.id, dateStr, newData);
          }
        }
      }
    }

    // 【並行寫入】Turso 是 HTTP 協定，Promise.all() 並行發送遠比 $transaction() 序列執行快
    // $transaction() 需要 BEGIN/COMMIT 額外往返，Promise.all() 直接並行多請求
    const CHUNK_SIZE = 30;
    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      await Promise.all(operations.slice(i, i + CHUNK_SIZE));
    }
    console.log(`[AttendanceMatcher] 並行寫入完成，共 ${operations.length} 筆，${Math.ceil(operations.length / CHUNK_SIZE)} 批`);
  }

  /**
   * 根據班別規則解析單日打卡紀錄
   */
  static parseAttendance(record, shift) {
    const result = {
      late_mins: 0,
      early_leave_mins: 0,
      work_mins: 0,
      clock_in_status: null,
      clock_out_status: null
    };

    if (!shift || !record.clock_in) return result;

    const clockInMins = timeToMins(record.clock_in);
    const clockOutMins = record.clock_out ? timeToMins(record.clock_out) : null;

    const workStartMins = timeToMins(shift.work_start);
    const workEndMins = timeToMins(shift.work_end);

    // 1. 上班判定
    // 讀取班別設定的寬限期 (預設 4 小時)
    const earlyLimit = workStartMins - (shift.punch_in_window_mins || 240); 
    const lateBuffer = shift.late_buffer_mins || 0;

    if (clockInMins < earlyLimit) {
      result.clock_in_status = 'TOO_EARLY';
    } else if (clockInMins > workStartMins) {
      const delayMins = clockInMins - workStartMins;
      if (delayMins <= lateBuffer) {
        result.late_mins = delayMins;
        result.clock_in_status = 'LATE';
      } else {
        result.late_mins = 0; // 超過緩衝轉為曠職，清空遲到分鐘
        result.clock_in_status = 'ABSENT'; 
      }
    } else {
      result.clock_in_status = 'NORMAL';
    }

    // 2. 下班判定
    if (clockOutMins !== null) {
      // 如果下班時間比上班時間還早，或者是凌晨打卡
      if (clockOutMins < workStartMins) {
        result.clock_out_status = 'INVALID';
      } else if (clockOutMins < workEndMins) {
        result.early_leave_mins = workEndMins - clockOutMins;
        result.clock_out_status = 'EARLY_LEAVE';
      } else {
        result.clock_out_status = 'NORMAL';
      }

      // 3. 計算工時
      let grossWork = clockOutMins - clockInMins;
      if (shift.rest_start && shift.rest_end) {
        const restStartMins = timeToMins(shift.rest_start);
        const restEndMins = timeToMins(shift.rest_end);
        const overlapStart = Math.max(clockInMins, restStartMins);
        const overlapEnd = Math.min(clockOutMins, restEndMins);
        if (overlapEnd > overlapStart) {
          grossWork -= (overlapEnd - overlapStart);
        }
      }
      result.work_mins = Math.max(0, grossWork);

      // 4. 加班計算
      const overtimeStartMins = shift.overtime_start ? timeToMins(shift.overtime_start) : workEndMins;
      if (clockOutMins > overtimeStartMins) {
        const totalOtMins = clockOutMins - overtimeStartMins;
        const otUnit = shift.overtime_min_unit || 30;
        const phase1Raw = Math.min(totalOtMins, 120);
        result.overtime1_mins = floorToUnit(phase1Raw, otUnit);
        if (totalOtMins > 120) {
          result.overtime2_mins = floorToUnit(totalOtMins - 120, otUnit);
        }
      }
    }

    return result;
  }

  /**
   * 【效能優化版】批次預載全公司當月資料並計算每位員工的月度統計
   * 一次撈取所有資料，在記憶體中完成所有計算，大幅減少資料庫往返次數
   */
  static async batchCalculateAllSummaries(prisma, employeeIds, year_month) {
    // 一次性批次撈取所有需要的資料
    const [calendarDays, allDailyRecords, allLeaveRequests, allEmployees] = await Promise.all([
      prisma.calendarDay.findMany({
        where: { date: { startsWith: year_month }, is_workday: true }
      }),
      prisma.dailyRecord.findMany({
        where: { employeeId: { in: employeeIds }, date: { startsWith: year_month } }
      }),
      prisma.leaveRequest.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: 'APPROVED',
          OR: [
            { start_date: { startsWith: year_month } },
            { end_date: { startsWith: year_month } }
          ]
        },
        include: { leaveType: true }
      }),
      prisma.employee.findMany({
        where: { id: { in: employeeIds } }
      })
    ]);

    // 建立 Map 加速查找
    const dailyByEmp = new Map();
    allDailyRecords.forEach(r => {
      if (!dailyByEmp.has(r.employeeId)) dailyByEmp.set(r.employeeId, []);
      dailyByEmp.get(r.employeeId).push(r);
    });

    const leavesByEmp = new Map();
    allLeaveRequests.forEach(lr => {
      if (!leavesByEmp.has(lr.employeeId)) leavesByEmp.set(lr.employeeId, []);
      leavesByEmp.get(lr.employeeId).push(lr);
    });

    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

    // 對每位員工在記憶體中計算統計，完全不需要額外的資料庫查詢
    const summaries = {};
    for (const empId of employeeIds) {
      const employee = employeeMap.get(empId);
      const dailyRecords = dailyByEmp.get(empId) || [];
      const approvedLeaves = leavesByEmp.get(empId) || [];

      // 計算應出勤天數（考慮到職/離職日）
      const effectiveWorkDays = calendarDays.filter(cDay => {
        if (employee?.join_date && cDay.date < employee.join_date) return false;
        if (employee?.resign_date && cDay.date > employee.resign_date) return false;
        return true;
      });
      const work_days_count = effectiveWorkDays.length;

      let present_days = 0, full_absent_days = 0, late_days = 0, early_leave_count = 0;
      let late_mins_total = 0, absent_hours_total = 0, early_leave_hours_total = 0, work_mins_total = 0;
      let overtime1_mins_total = 0, overtime2_mins_total = 0, overtime1_count = 0, overtime2_count = 0;
      let holiday_overtime_mins_total = 0;
      const leave_counts = {};
      const shift = employee?.workShift;
      const lateBuffer = shift ? (shift.late_buffer_mins || 0) : 0;

      for (const record of dailyRecords) {
        const isFullAbsent = record.status === 'ABSENT' && !record.clock_in;
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
        
        if (record.clock_out && record.early_leave_mins > 0) {
          early_leave_count += 1;
          early_leave_hours_total += Math.ceil(record.early_leave_mins / 30) * 0.5;
        }

        work_mins_total += record.work_mins || 0;
        if (record.overtime1_mins > 0) { overtime1_mins_total += record.overtime1_mins; overtime1_count += 1; }
        if (record.overtime2_mins > 0) { overtime2_mins_total += record.overtime2_mins; overtime2_count += 1; }
        if (record.holiday_overtime_mins > 0) holiday_overtime_mins_total += record.holiday_overtime_mins;
      }

      for (const lr of approvedLeaves) {
        const code = lr.leaveType.code.toLowerCase();
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
          leave_counts[`${code}_leave_days`] = (leave_counts[`${code}_leave_days`] || 0) + (roundedHours / 8);
          leave_counts[`${code}_leave_count`] = (leave_counts[`${code}_leave_count`] || 0) + 1;

          // 新增：分段統計 (H1: 1-15號, H2: 16號以後)
          // 判定基準以「請假開始日」為準
          if (sDay <= 15) {
            leave_counts[`${code}_leave_count_h1`] = (leave_counts[`${code}_leave_count_h1`] || 0) + 1;
          } else {
            leave_counts[`${code}_leave_count_h2`] = (leave_counts[`${code}_leave_count_h2`] || 0) + 1;
          }
        } catch (err) {}
      }

      const round05 = h => Math.round(h * 2) / 2;
      summaries[empId] = {
        absent_days: absent_hours_total / 8, 
        absent_hours: absent_hours_total,
        late_days, late_mins: late_mins_total,
        work_days_count, work_hours_count: work_days_count * 8,
        present_days, present_hours: present_days * 8,
        early_leave_days: early_leave_count, 
        early_leave_hours: early_leave_hours_total,
        work_hours: round05(work_mins_total / 60),
        overtime1_hours: round05(overtime1_mins_total / 60),
        overtime2_hours: round05(overtime2_mins_total / 60),
        overtime1_count, overtime2_count,
        holiday_overtime_hours: round05(holiday_overtime_mins_total / 60),
        ...leave_counts
      };
    }

    return summaries;
  }

  /**
   * 計算月度總結（原版，供單人查詢使用）
   */
  static async calculateMonthlySummary(prisma, employeeId, year_month) {
    const result = await AttendanceMatcher.batchCalculateAllSummaries(prisma, [employeeId], year_month);
    return result[employeeId] || {};
  }

  /**
   * 批次預載全公司指定日期區間資料並計算每位員工的統計
   */
  static async batchCalculateAllSummariesByDateRange(prisma, employeeIds, start_date, end_date) {
    const [calendarDays, allDailyRecords, allLeaveRequests, allEmployees] = await Promise.all([
      prisma.calendarDay.findMany({
        where: { date: { gte: start_date, lte: end_date }, is_workday: true }
      }),
      prisma.dailyRecord.findMany({
        where: { employeeId: { in: employeeIds }, date: { gte: start_date, lte: end_date } }
      }),
      prisma.leaveRequest.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: 'APPROVED',
          OR: [
            { start_date: { gte: start_date, lte: end_date } },
            { end_date: { gte: start_date, lte: end_date } },
            { start_date: { lte: start_date }, end_date: { gte: end_date } }
          ]
        },
        include: { leaveType: true }
      }),
      prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        include: { workShift: true }
      })
    ]);

    // 建立 Map 加速查找
    const dailyByEmp = new Map();
    allDailyRecords.forEach(r => {
      if (!dailyByEmp.has(r.employeeId)) dailyByEmp.set(r.employeeId, []);
      dailyByEmp.get(r.employeeId).push(r);
    });

    const leavesByEmp = new Map();
    allLeaveRequests.forEach(lr => {
      if (!leavesByEmp.has(lr.employeeId)) leavesByEmp.set(lr.employeeId, []);
      leavesByEmp.get(lr.employeeId).push(lr);
    });

    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

    // 對每位員工在記憶體中計算統計
    const summaries = {};
    for (const empId of employeeIds) {
      const employee = employeeMap.get(empId);
      const dailyRecords = dailyByEmp.get(empId) || [];
      const approvedLeaves = leavesByEmp.get(empId) || [];

      // 計算應出勤天數（考慮到職/離職日）
      const effectiveWorkDays = calendarDays.filter(cDay => {
        if (employee?.join_date && cDay.date < employee.join_date) return false;
        if (employee?.resign_date && cDay.date > employee.resign_date) return false;
        return true;
      });
      const work_days_count = effectiveWorkDays.length;

      let present_days = 0, absent_count = 0, late_days = 0, early_leave_count = 0;
      let late_mins_total = 0, absent_hours_total = 0, early_leave_hours_total = 0, work_mins_total = 0;
      let overtime1_mins_total = 0, overtime2_mins_total = 0, overtime1_count = 0, overtime2_count = 0;
      let holiday_overtime_mins_total = 0;
      const leave_counts = {};
      const shift = employee?.workShift;
      const lateBuffer = shift ? (shift.late_buffer_mins || 0) : 0;

      for (const record of dailyRecords) {
        const isFullAbsent = record.status === 'ABSENT' && !record.clock_in;
        const isPartialAbsent = record.clock_in && record.late_mins > lateBuffer;

        if (record.status === 'PRESENT' || record.status === 'LATE' || record.status === 'EARLY' || isPartialAbsent) present_days += 1;
        if (isFullAbsent) {
          absent_count += 1;
          absent_hours_total += 8;
        }
        
        if (record.clock_in && record.late_mins > 0) {
          if (record.late_mins > lateBuffer) {
            absent_count += 1; // 超過緩衝計入曠職次數
            absent_hours_total += Math.ceil(record.late_mins / 30) * 0.5;
          } else {
            late_days += 1;
            late_mins_total += record.late_mins;
          }
        }
        
        if (record.clock_out && record.early_leave_mins > 0) {
          early_leave_count += 1;
          early_leave_hours_total += Math.ceil(record.early_leave_mins / 30) * 0.5;
        }

        work_mins_total += record.work_mins || 0;
        if (record.overtime1_mins > 0) { overtime1_mins_total += record.overtime1_mins; overtime1_count += 1; }
        if (record.overtime2_mins > 0) { overtime2_mins_total += record.overtime2_mins; overtime2_count += 1; }
        if (record.holiday_overtime_mins > 0) holiday_overtime_mins_total += record.holiday_overtime_mins;
      }

      for (const lr of approvedLeaves) {
        const code = lr.leaveType.code.toLowerCase();
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
          leave_counts[`${code}_leave_days`] = roundedHours / 8;
        } catch (err) {}
      }

      const round05 = h => Math.round(h * 2) / 2;
      summaries[empId] = {
        absent_count, 
        absent_hours: absent_hours_total,
        late_days, late_mins: late_mins_total,
        work_days_count, work_hours_count: work_days_count * 8,
        present_days, present_hours: present_days * 8,
        early_leave_days: early_leave_count, 
        early_leave_hours: early_leave_hours_total,
        work_hours: round05(work_mins_total / 60),
        overtime1_hours: round05(overtime1_mins_total / 60),
        overtime2_hours: round05(overtime2_mins_total / 60),
        overtime1_count, overtime2_count,
        holiday_overtime_hours: round05(holiday_overtime_mins_total / 60),
        ...leave_counts
      };
    }

    return summaries;
  }

  /**
   * 計算區間總結
   */
  static async calculateSummaryByDateRange(prisma, employeeId, start_date, end_date) {
    const result = await AttendanceMatcher.batchCalculateAllSummariesByDateRange(prisma, [employeeId], start_date, end_date);
    return result[employeeId] || {};
  }
}

module.exports = AttendanceMatcher;
