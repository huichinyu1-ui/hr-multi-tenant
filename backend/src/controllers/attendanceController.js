// 移除全域 prisma
const AttendanceParser = require('../services/AttendanceParser');
const AttendanceMatcher = require('../services/AttendanceMatcher');

exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: '未上傳檔案' });
    
    const records = AttendanceParser.parseExcel(req.file.buffer);
    let count = 0;

    // 檢查是否有匯入已結案鎖定月份的資料
    const yearMonths = new Set();
    records.forEach(r => {
      if (r.date) {
        const d = new Date(r.date);
        if (!isNaN(d.getTime())) {
          const ym = d.toISOString().split('T')[0].substring(0, 7);
          yearMonths.add(ym);
        }
      }
    });

    if (yearMonths.size > 0) {
      const finalized = await req.db.payrollRecord.findFirst({
        where: { year_month: { in: Array.from(yearMonths) }, status: 'FINALIZED' }
      });
      if (finalized) {
        return res.status(400).json({ error: `匯入失敗！包含已結案鎖定月份的資料 (${finalized.year_month})，考勤不允許被覆蓋。請先解除薪資鎖定。` });
      }
    }

    // 預先抓取所有員工以進行模糊比對
    const allEmployees = await req.db.employee.findMany({ include: { workShift: true } });
    const empMap = new Map();
    allEmployees.forEach(e => {
      empMap.set(e.code, e);
      empMap.set(e.code.replace(/^0+/, ''), e);
    });

    // 預載這個批次的現有考勤紀錄，減少資料庫查詢次數
    const validDates = records.filter(r => r.date).map(r => new Date(r.date).getTime()).filter(t => !isNaN(t));
    let existingMap = new Map();
    if (validDates.length > 0) {
      const minDate = new Date(Math.min(...validDates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max(...validDates)).toISOString().split('T')[0];
      const existingRecords = await req.db.dailyRecord.findMany({
        where: { date: { gte: minDate, lte: maxDate } }
      });
      existingRecords.forEach(r => existingMap.set(`${r.employeeId}_${r.date}`, r));
    }

    const writePromises = [];

    for (const record of records) {
      const { employee_code, date, clock_in, clock_out } = record;
      if (!employee_code || !date) continue;

      const normalizedCode = employee_code.toString().replace(/^0+/, '');
      const employee = empMap.get(employee_code) || empMap.get(normalizedCode);

      if (!employee) {
        console.warn(`找不到員工: ${employee_code}`);
        continue;
      }

      const formattedDate = new Date(date).toISOString().split('T')[0];
      const existingRecord = existingMap.get(`${employee.id}_${formattedDate}`);
      
      let final_clock_in = clock_in || null;
      let final_clock_out = clock_out || null;
      let final_punch_method = 'EXCEL';

      if (existingRecord) {
        if (existingRecord.punch_method === 'WEB') {
          // 線上打卡優先：如果原本該欄位已有時間，則跳過 Excel 覆蓋
          final_clock_in = existingRecord.clock_in ? existingRecord.clock_in : final_clock_in;
          final_clock_out = existingRecord.clock_out ? existingRecord.clock_out : final_clock_out;
          final_punch_method = 'WEB'; // 保持線上打卡標記
        }
      }

      let parsedStats = { late_mins: 0, early_leave_mins: 0, work_mins: 0, overtime1_mins: 0, overtime2_mins: 0 };
      let finalStatus = 'PRESENT';
      if (employee.workShift) {
        parsedStats = AttendanceMatcher.parseAttendance({ clock_in: final_clock_in, clock_out: final_clock_out }, employee.workShift);
        if (parsedStats.clock_in_status === 'ABSENT') finalStatus = 'ABSENT';
        else if (parsedStats.late_mins > 0) finalStatus = 'LATE';
        else if (parsedStats.early_leave_mins > 0) finalStatus = 'EARLY';
      }

      const upsertPromise = req.db.dailyRecord.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: formattedDate } },
        update: {
          clock_in: final_clock_in,
          clock_out: final_clock_out,
          status: finalStatus,
          punch_method: final_punch_method,
          ...parsedStats
        },
        create: {
          employeeId: employee.id,
          date: formattedDate,
          clock_in: final_clock_in,
          clock_out: final_clock_out,
          status: finalStatus,
          punch_method: final_punch_method,
          ...parsedStats
        }
      });
      
      writePromises.push(upsertPromise);
      count++;
    }

    // 平行寫入資料庫
    await Promise.all(writePromises);

    res.json({ message: `成功匯入並解析 ${count} 筆出勤紀錄` });
  } catch (error) {
    console.error('上傳處理錯誤:', error);
    res.status(500).json({ error: '匯入出勤紀錄失敗' });
  }
};

exports.getAttendances = async (req, res) => {
  const { year_month, start_date, end_date } = req.query;
  const userId = req.headers['x-user-id'];

  try {
    const where = {};
    if (start_date && end_date) {
      where.date = { gte: start_date, lte: end_date };
    } else if (year_month) {
      where.date = { startsWith: year_month };
    }

    // 若 req.permissions 已由 checkPermission 中間件注入，則用細項 selfOnly
    // 若未經中間件（直接呼叫），則回退舊邏輯
    let selfOnlyId;
    if (req.permissions) {
      const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');
      selfOnlyId = getSelfOnlyId(req, 'ATT');
    } else {
      // 舊版安全回退：非 ADMIN 和 COLLABORATOR 一律只看自己
      const userRole = req.headers['x-user-role'];
      const isSuperUser = userRole === 'ADMIN' || userRole === 'COLLABORATOR';
      selfOnlyId = (!isSuperUser && userId) ? parseInt(userId) : undefined;
    }

    if (selfOnlyId) where.employeeId = selfOnlyId;

    const records = await req.db.dailyRecord.findMany({
      where,
      include: { employee: true },
      orderBy: [{ date: 'asc' }, { employeeId: 'asc' }]
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: '獲取紀錄失敗' });
  }
};

exports.updateDailyRecord = async (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const existingRecord = await req.db.dailyRecord.findUnique({ where: { id: recordId } });
    if (!existingRecord) return res.status(404).json({ error: '紀錄不存在' });

    // 檢查薪資是否已鎖定
    const year_month = existingRecord.date.substring(0, 7);
    const finalized = await req.db.payrollRecord.findFirst({
      where: { year_month, status: 'FINALIZED' }
    });
    if (finalized) {
      return res.status(400).json({ error: `該月份(${year_month})薪資已結案鎖定，無法手動修改考勤紀錄` });
    }

    const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');
    const selfOnlyId = getSelfOnlyId(req, 'ATT');

    // 如果限制本人，必須先確認這筆打卡紀錄是否屬於該員工
    if (selfOnlyId && existingRecord.employeeId !== selfOnlyId) {
      return res.status(403).json({ error: '您僅能修改自己的考勤紀錄' });
    }

    const { status, leave_code, clock_in, clock_out } = req.body;
    
    // 取得員工排班，以利即時計算工時/遲到
    const employee = await req.db.employee.findUnique({
      where: { id: existingRecord.employeeId },
      include: { workShift: true }
    });

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (leave_code !== undefined) updateData.leave_code = leave_code;
    if (clock_in !== undefined) updateData.clock_in = clock_in;
    if (clock_out !== undefined) updateData.clock_out = clock_out;

    // 即時重新計算
    const simRecord = {
      clock_in: clock_in !== undefined ? clock_in : existingRecord.clock_in,
      clock_out: clock_out !== undefined ? clock_out : existingRecord.clock_out
    };

    if (employee.workShift && (simRecord.clock_in || simRecord.clock_out)) {
      const parsedStats = AttendanceMatcher.parseAttendance(simRecord, employee.workShift);
      Object.assign(updateData, parsedStats);
      
      // 如果原本不是請假曠職且沒有手動指定狀態，自動判定遲到與早退
      if (status === undefined && existingRecord.status !== 'LEAVE' && existingRecord.status !== 'ABSENT') {
        if (parsedStats.late_mins > 0) updateData.status = 'LATE';
        else if (parsedStats.early_leave_mins > 0) updateData.status = 'EARLY';
        else updateData.status = 'PRESENT';
      }
    }

    const record = await req.db.dailyRecord.update({
      where: { id: recordId },
      data: updateData
    });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: '更新紀錄失敗' });
  }
};

exports.getSummary = async (req, res) => {
  const { year_month, start_date, end_date } = req.query;
  if (!year_month && (!start_date || !end_date)) return res.status(400).json({ error: '缺少日期參數' });

  try {
    const dateFilter = start_date && end_date ? { gte: start_date, lte: end_date } : { startsWith: year_month };

    // 1. 取得當月工作天數 (應到天數)
    const workdaysCount = await req.db.calendarDay.count({
      where: { date: dateFilter, is_workday: true }
    });

    // 2. 取得員工 和 打卡紀錄（selfOnly 由 permissions 或舊邏輯决定）
    const userId = req.headers['x-user-id'];
    let selfOnlyId;
    if (req.permissions) {
      const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');
      selfOnlyId = getSelfOnlyId(req, 'ATT');
    } else {
      const userRole = req.headers['x-user-role'];
      const isSuperUser = userRole === 'ADMIN' || userRole === 'COLLABORATOR';
      selfOnlyId = (!isSuperUser && userId) ? parseInt(userId) : undefined;
    }

    const employees = await req.db.employee.findMany({
      where: { status: 'ACTIVE', id: selfOnlyId }
    });

    const AttendanceMatcher = require('../services/AttendanceMatcher');
    let summaries;
    const employeeIds = employees.map(e => e.id);
    if (start_date && end_date) {
      summaries = await AttendanceMatcher.batchCalculateAllSummariesByDateRange(req.db, employeeIds, start_date, end_date);
    } else {
      summaries = await AttendanceMatcher.batchCalculateAllSummaries(req.db, employeeIds, year_month);
    }

    // 取得所有假別名稱對照
    const leaveTypes = await req.db.leaveType.findMany();
    const leaveTypeMap = {};
    leaveTypes.forEach(lt => leaveTypeMap[lt.code] = lt.name);

    const summary = employees.map(emp => {
      const sum = summaries[emp.id] || {};
      
      // 解析假別
      const leaveDetails = Object.keys(sum)
        .filter(k => k.endsWith('_leave_days') && sum[k] > 0)
        .map(k => {
          const code = k.replace('_leave_days', '').toUpperCase();
          return { code, name: leaveTypeMap[code] || code, days: sum[k] };
        });

      return {
        employee: { id: emp.id, name: emp.name, code: emp.code },
        expected_days: sum.work_days_count || 0,
        actual_days: sum.present_days || 0,
        ...sum, // 直接展開所有計算好的變數 (late_mins, work_hours, overtime_hours etc.)
        total_overtime_hours: parseFloat(((sum.overtime1_hours || 0) + (sum.overtime2_hours || 0)).toFixed(1)),
        leaves: leaveDetails
      };
    });

    res.json(summary);
  } catch (error) {
    console.error('獲取月度總表失敗:', error);
    res.status(500).json({ error: '獲取月度總表失敗' });
  }
};

exports.runMatching = async (req, res) => {
  const { year_month, start_date, end_date } = req.body;
  if (!year_month && (!start_date || !end_date)) return res.status(400).json({ error: '缺少日期參數' });
  
  try {
    let start, end;
    if (start_date && end_date) {
      start = start_date;
      end = end_date;
    } else {
      start = `${year_month}-01`;
      const [y, m] = year_month.split('-');
      const lastDay = new Date(y, m, 0).getDate();
      end = `${year_month}-${lastDay}`;
    }
    
    await AttendanceMatcher.matchAttendance(req.db, start, end);
    res.json({ message: `${start} 至 ${end} 比對完成` });
  } catch (error) {
    console.error('打卡錯誤:', error);
    res.status(500).json({ error: '打卡失敗: ' + error.message });
  }
};

exports.exportAttendanceSummary = async (req, res) => {
  const { year_month, start_date, end_date, activeTab, nameSearch, statusFilter, selectedEmpIds } = req.query;
  if (!year_month && (!start_date || !end_date)) return res.status(400).send('缺少日期參數');

  try {
    const dateFilter = start_date && end_date ? { gte: start_date, lte: end_date } : { startsWith: year_month };
    const dateTitle = start_date && end_date ? `${start_date}至${end_date}` : year_month;
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    // 權限檢查
    const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');
    const selfOnlyId = getSelfOnlyId(req, 'ATT');

    if (activeTab === 'summary') {
      // --- 匯出月度結算 ---
      const sheet = workbook.addWorksheet(`${dateTitle} 考勤統計`);
      const columns = [
        { header: '員工工號', key: 'code', width: 12 },
        { header: '姓名', key: 'name', width: 15 },
        { header: '應到天數', key: 'expected', width: 10 },
        { header: '實到天數', key: 'actual', width: 10 },
        { header: '遲到次數', key: 'late', width: 10 },
        { header: '曠職天數', key: 'absent', width: 10 },
        { header: '加班時數', key: 'overtime', width: 10 },
        { header: '請假摘要', key: 'leaves', width: 30 }
      ];
      sheet.columns = columns;

      // 取得員工資料
      const empWhere = { status: 'ACTIVE' };
      if (selfOnlyId) empWhere.id = selfOnlyId;
      if (selectedEmpIds) {
        empWhere.id = { in: selectedEmpIds.split(',').map(id => parseInt(id)) };
      }
      const employees = await req.db.employee.findMany({ where: empWhere });
      
      const AttendanceMatcher = require('../services/AttendanceMatcher');
      for (const emp of employees) {
        let summary;
        if (start_date && end_date) {
          summary = await AttendanceMatcher.calculateSummaryByDateRange(req.db, emp.id, start_date, end_date);
        } else {
          summary = await AttendanceMatcher.calculateMonthlySummary(req.db, emp.id, year_month);
        }
        const leaveText = Object.keys(summary)
          .filter(k => k.endsWith('_leave_days') && summary[k] > 0)
          .map(k => `${k.replace('_leave_days', '').toUpperCase()}: ${summary[k]}天`)
          .join(', ');

        sheet.addRow({
          code: emp.code,
          name: emp.name,
          expected: summary.work_days_count,
          actual: summary.present_days,
          late: summary.late_days,
          absent: summary.absent_days,
          overtime: summary.overtime1_hours + summary.overtime2_hours,
          leaves: leaveText || '無'
        });
      }
    } else {
      // --- 匯出每日明細 / 異常處理 ---
      const sheet = workbook.addWorksheet(`${dateTitle} 出勤明細`);
      sheet.columns = [
        { header: '日期', key: 'date', width: 12 },
        { header: '工號', key: 'empCode', width: 10 },
        { header: '姓名', key: 'empName', width: 12 },
        { header: '打卡上班', key: 'clock_in', width: 12 },
        { header: '打卡下班', key: 'clock_out', width: 12 },
        { header: '狀態', key: 'status', width: 10 },
        { header: '工時(h)', key: 'work_hours', width: 10 },
        { header: '1階加班(h)', key: 'overtime1_hours', width: 12 },
        { header: '2階加班(h)', key: 'overtime2_hours', width: 12 },
        { header: '假日加班(h)', key: 'holiday_overtime_hours', width: 12 },
        { header: '假別', key: 'leave_code', width: 10 }
      ];

      const where = { date: dateFilter };
      if (selfOnlyId) where.employeeId = selfOnlyId;
      if (selectedEmpIds) {
        where.employeeId = { in: selectedEmpIds.split(',').map(id => parseInt(id)) };
      }
      if (statusFilter && statusFilter !== 'ALL') {
        where.status = statusFilter;
      }

      let records = await req.db.dailyRecord.findMany({
        where,
        include: { employee: true },
        orderBy: [{ date: 'asc' }, { employeeId: 'asc' }]
      });

      // 套用與前端一致的過濾
      if (nameSearch) {
        const ns = nameSearch.toLowerCase();
        records = records.filter(r => 
          r.employee?.name?.toLowerCase().includes(ns) || 
          r.employee?.code?.toLowerCase().includes(ns) || 
          r.date.includes(ns)
        );
      }
      
      if (activeTab === 'anomalies') {
        records = records.filter(r => r.status !== 'PRESENT' && r.status !== 'LEAVE');
      }

      const statusMap = { 'PRESENT': '正常', 'LATE': '遲到', 'EARLY': '早退', 'ABSENT': '曠職', 'LEAVE': '請假' };

      records.forEach(r => {
        sheet.addRow({
          date: r.date,
          empCode: r.employee?.code || '',
          empName: r.employee?.name || '',
          clock_in: r.clock_in || '-',
          clock_out: r.clock_out || '-',
          status: statusMap[r.status] || r.status,
          work_hours: Math.round((r.work_mins || 0) / 60 * 2) / 2,
          overtime1_hours: Math.round((r.overtime1_mins || 0) / 60 * 2) / 2,
          overtime2_hours: Math.round((r.overtime2_mins || 0) / 60 * 2) / 2,
          holiday_overtime_hours: Math.round((r.holiday_overtime_mins || 0) / 60 * 2) / 2,
          leave_code: r.leave_code || ''
        });
      });
    }

    // 樣式化標頭
    workbook.eachSheet(s => {
      const headerRow = s.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_${dateTitle}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[Attendance Export] Error:', error);
    res.status(500).send('匯出失敗');
  }
};

exports.batchDeleteAttendances = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: '無效的請求數據' });
    await req.db.dailyRecord.deleteMany({
      where: { id: { in: ids.map(id => parseInt(id)) } }
    });
    res.json({ message: `成功刪除 ${ids.length} 筆紀錄` });
  } catch (error) {
    console.error('Batch Delete Error:', error);
    res.status(500).json({ error: '批次刪除失敗' });
  }
};

exports.getTodayRecord = async (req, res) => {
  const employeeId = parseInt(req.headers['x-user-id']);
  const now = new Date();
  const taiwanTime = new Date(now.getTime() + (8 * 3600000));
  const dateStr = taiwanTime.toISOString().split('T')[0];

  try {
    const record = await req.db.dailyRecord.findUnique({
      where: { employeeId_date: { employeeId, date: dateStr } }
    });

    const employee = await req.db.employee.findUnique({
      where: { id: employeeId },
      include: { workShift: true }
    });

    let extra = { clock_in_status: null, clock_out_status: null };
    if (record && employee?.workShift) {
      const stats = AttendanceMatcher.parseAttendance(record, employee.workShift);
      extra.clock_in_status = stats.clock_in_status;
      if (record.clock_out) {
        extra.clock_out_status = stats.clock_out_status;
      }
    }

    res.json({
      record: record ? { ...record, ...extra } : null,
      workShift: employee?.workShift || null
    });
  } catch (error) {
    console.error('getTodayRecord error:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- GPS 線上打卡功能 ---
exports.punch = async (req, res) => {
  const { lat, lng, type } = req.body; // type: 'IN' or 'OUT'
  const employeeId = parseInt(req.headers['x-user-id']);

  if (!lat || !lng) return res.status(400).json({ error: '缺少座標資訊' });
  if (!employeeId) return res.status(401).json({ error: '未驗證的員工' });
  if (!['IN', 'OUT'].includes(type)) return res.status(400).json({ error: '無效的打卡類型' });

  try {
    // 1. 取得打卡相關設定
    const settings = await req.db.metadata.findMany({ where: { type: 'SYSTEM_SETTING' } });
    const config = {};
    settings.forEach(s => config[s.label] = s.value);

    const isEnabled = config['punch_enabled'] === 'true';
    const companyLat = parseFloat(config['company_lat']);
    const companyLng = parseFloat(config['company_lng']);
    const radius = parseFloat(config['punch_radius_meters']) || 300;

    if (!isEnabled) return res.status(403).json({ error: '線上打卡功能目前已關閉' });

    // 2. 距離計算 (Haversine)
    const distance = getDistance(lat, lng, companyLat, companyLng);
    if (distance > radius) {
      return res.status(403).json({ 
        error: '打卡失敗：您目前不在公司打卡範圍內',
        distance: Math.round(distance),
        radius: radius
      });
    }

    // 3. 取得今日打卡紀錄與員工排班
    const now = new Date();
    const taiwanTime = new Date(now.getTime() + (8 * 3600000));
    const dateStr = taiwanTime.toISOString().split('T')[0];
    const timeStr = taiwanTime.toISOString().split('T')[1].substring(0, 5); // HH:mm

    const employee = await req.db.employee.findUnique({
      where: { id: employeeId },
      include: { workShift: true }
    });

    if (!employee) return res.status(404).json({ error: '找不到員工資料' });

    const existingRecord = await req.db.dailyRecord.findUnique({
      where: { employeeId_date: { employeeId, date: dateStr } }
    });

    let updateData = { punch_method: 'WEB' };
    let message = '';

    if (type === 'IN') {
      // 上班打卡：取最早時間
      if (!existingRecord?.clock_in || timeStr < existingRecord.clock_in) {
        updateData.clock_in = timeStr;
        updateData.clock_in_lat = lat;
        updateData.clock_in_lng = lng;
        message = `上班打卡成功 (${timeStr})`;
      } else {
        message = `上班打卡已記錄，當前時間並非最早時間 (${existingRecord.clock_in})`;
      }
    } else {
      // 下班打卡：取最晚時間
      if (!existingRecord?.clock_out || timeStr > existingRecord.clock_out) {
        updateData.clock_out = timeStr;
        updateData.clock_out_lat = lat;
        updateData.clock_out_lng = lng;
        message = `下班打卡成功 (${timeStr})`;
      } else {
        message = `下班打卡已記錄，當前時間並非最晚時間 (${existingRecord.clock_out})`;
      }
    }

    // 4. 計算考勤狀態
    const clockIn = updateData.clock_in || existingRecord?.clock_in;
    const clockOut = updateData.clock_out || existingRecord?.clock_out;
    
    let parsedStats = {};
    let finalStatus = 'PRESENT';
    if (employee.workShift) {
      parsedStats = AttendanceMatcher.parseAttendance({ clock_in: clockIn, clock_out: clockOut }, employee.workShift);
      if (parsedStats.late_mins > 0) finalStatus = 'LATE';
      else if (parsedStats.early_leave_mins > 0) finalStatus = 'EARLY';
    }

    // 5. 更新或建立紀錄
    const result = await req.db.dailyRecord.upsert({
      where: { employeeId_date: { employeeId, date: dateStr } },
      update: { ...updateData, ...parsedStats, status: finalStatus },
      create: { 
        employeeId, 
        date: dateStr, 
        status: finalStatus,
        ...updateData, 
        ...parsedStats 
      }
    });

    res.json({ message, distance: Math.round(distance), record: result });
  } catch (error) {
    console.error('[Punch Error]:', error);
    res.status(500).json({ error: '打卡執行失敗' });
  }
};

// 輔助函式：Haversine 距離計算
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 半徑 (公尺)
  const phi1 = lat1 * Math.PI/180;
  const phi2 = lat2 * Math.PI/180;
  const dPhi = (lat2-lat1) * Math.PI/180;
  const dLambda = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dPhi/2) * Math.sin(dPhi/2) +
          Math.cos(phi1) * Math.cos(phi2) *
          Math.sin(dLambda/2) * Math.sin(dLambda/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}
