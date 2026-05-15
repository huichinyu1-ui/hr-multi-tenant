// 移除全域 prisma

// Leave Types
exports.getLeaveTypes = async (req, res) => {
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  try {
    const where = {};
    if (userRole === 'EMPLOYEE') {
      where.OR = [
        { is_all_employees: true },
        { eligibleEmployees: { some: { id: parseInt(userId) } } }
      ];
    }

    const types = await req.db.leaveType.findMany({
      where,
      include: { eligibleEmployees: true }
    });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: '獲取假別失敗' });
  }
};

exports.createLeaveType = async (req, res) => {
  try {
    const { code, name, is_paid, deduction_ratio, deduction_base, quota_type, default_days, seniority_rules, is_all_employees, eligibleEmployeeIds, note } = req.body;
    const type = await req.db.leaveType.create({
      data: { 
        code, 
        name, 
        is_paid, 
        deduction_ratio: parseFloat(deduction_ratio),
        deduction_base: deduction_base || '{base_salary}',
        quota_type: quota_type || 'UNLIMITED',
        default_days: parseFloat(default_days) || 0,
        seniority_rules: seniority_rules || null,
        is_all_employees: is_all_employees ?? true,
        note,
        eligibleEmployees: (!is_all_employees && eligibleEmployeeIds) ? {
          connect: eligibleEmployeeIds.map(id => ({ id: parseInt(id) }))
        } : undefined
      }
    });
    res.status(201).json(type);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '新增假別失敗' });
  }
};

exports.updateLeaveType = async (req, res) => {
  try {
    const { code, name, is_paid, deduction_ratio, deduction_base, quota_type, default_days, seniority_rules, is_all_employees, eligibleEmployeeIds, note } = req.body;
    const type = await req.db.leaveType.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        code, 
        name, 
        is_paid, 
        deduction_ratio: parseFloat(deduction_ratio),
        deduction_base: deduction_base || '{base_salary}',
        quota_type: quota_type || 'UNLIMITED',
        default_days: parseFloat(default_days) || 0,
        seniority_rules: seniority_rules || null,
        is_all_employees: is_all_employees ?? true,
        note,
        eligibleEmployees: {
          set: (!is_all_employees && eligibleEmployeeIds) ? 
            eligibleEmployeeIds.map(id => ({ id: parseInt(id) })) : []
        }
      }
    });
    res.json(type);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新假別失敗' });
  }
};

exports.deleteLeaveType = async (req, res) => {
  try {
    await req.db.leaveType.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除假別失敗，可能已有請假紀錄' });
  }
};

// Leave Requests
exports.getLeaveRequests = async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { start_date, end_date } = req.query;

  try {
    const where = {};
    // 動態 RBAC：優先讀取 req.permissions 的 selfOnly 設定
    // 若無 permissions（未經中間件），回退到安全預設（只看自己）
    let selfOnlyId;
    if (req.permissions) {
      const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');
      selfOnlyId = getSelfOnlyId(req, 'LEAVE');
    } else {
      selfOnlyId = parseInt(userId);
    }
    if (selfOnlyId) where.employeeId = selfOnlyId;
    if (start_date && end_date) {
      where.OR = [
        { start_date: { gte: start_date, lte: end_date } },
        { end_date: { gte: start_date, lte: end_date } },
        { start_date: { lte: start_date }, end_date: { gte: end_date } }
      ];
    }

    const requests = await req.db.leaveRequest.findMany({
      where,
      include: { employee: true, leaveType: true },
      orderBy: { id: 'desc' }
    });

    const enrichedRequests = requests.map(req => {
      try {
        const [sYear, sMonth, sDay] = req.start_date.split('-').map(Number);
        const [eYear, eMonth, eDay] = req.end_date.split('-').map(Number);
        const sDateObj = new Date(sYear, sMonth - 1, sDay);
        const eDateObj = new Date(eYear, eMonth - 1, eDay);
        const diffDays = Math.round((eDateObj - sDateObj) / (1000 * 60 * 60 * 24));
        
        let hours = 0;
        if (diffDays === 0) {
          const sTime = (req.start_time || '08:00').split(':');
          const eTime = (req.end_time || '17:00').split(':');
          const sMin = parseInt(sTime[0]) * 60 + (parseInt(sTime[1]) || 0);
          const eMin = parseInt(eTime[0]) * 60 + (parseInt(eTime[1]) || 0);
          let h = (eMin - sMin) / 60;
          hours = h >= 9 ? 8 : (h > 4 ? h - 1 : h);
        } else {
          hours = (diffDays + 1) * 8;
        }
        
        const finalDays = isNaN(hours) ? 0 : hours / 8;
        
        // 關鍵：建立一個純 JS 物件，確保欄位被序列化
        return {
          id: req.id,
          employeeId: req.employeeId,
          leaveTypeId: req.leaveTypeId,
          start_date: req.start_date,
          start_time: req.start_time,
          end_date: req.end_date,
          end_time: req.end_time,
          status: req.status,
          reason: req.reason,
          employee: req.employee,
          leaveType: req.leaveType,
          days: finalDays
        };
      } catch (err) {
        return { ...req, days: 0 };
      }
    });

    res.json(enrichedRequests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取請假單失敗' });
  }
};

exports.createLeaveRequest = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, start_date, start_time, end_date, end_time, reason } = req.body;
    
    const start = new Date(`${start_date}T${start_time || '08:00'}`);
    const end = new Date(`${end_date}T${end_time || '17:00'}`);

    if (start > end) {
      return res.status(400).json({ error: '結束時間不能早於開始時間' });
    }

    const request = await req.db.leaveRequest.create({
      data: { 
        employeeId: parseInt(employeeId), 
        leaveTypeId: parseInt(leaveTypeId), 
        start_date, 
        start_time: start_time || '08:00',
        end_date, 
        end_time: end_time || '17:00',
        reason,
        status: req.body.status || 'PENDING' 
      }
    });
    res.status(201).json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '新增請假單失敗' });
  }
};

exports.updateLeaveRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const request = await req.db.leaveRequest.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      include: { employee: true, leaveType: true }
    });

    // 建立通知
    const statusMap = { 'PENDING': '待審核', 'APPROVED': '核准', 'REJECTED': '未核准' };
    await req.db.notification.create({
      data: {
        employeeId: request.employeeId,
        title: '請假單狀態更新',
        message: `您的 ${request.leaveType.name} 申請 (${request.start_date} ~ ${request.end_date}) 已被標記為: ${statusMap[status] || status}`
      }
    });

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: '更新狀態失敗' });
  }
};

exports.deleteLeaveRequest = async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  try {
    const target = await req.db.leaveRequest.findUnique({ where: { id: parseInt(id) } });
    if (!target) return res.status(404).json({ error: '找不到該請假單' });

    // 權限檢查：管理員/協作者可以刪除所有人；員工只能刪除自己的
    if (userRole !== 'ADMIN' && userRole !== 'COLLABORATOR') {
      if (target.employeeId !== parseInt(userId)) {
        return res.status(403).json({ error: '您沒有權限刪除此請假單' });
      }
      // 員工只能在待審核狀態刪除
      if (target.status !== 'PENDING') {
        return res.status(403).json({ error: '已核准或未核准的假單無法刪除，請洽管理員' });
      }
    }

    await req.db.leaveRequest.delete({ where: { id: parseInt(id) } });
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除失敗' });
  }
};

// Quotas
exports.getLeaveQuotas = async (req, res) => {
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];
  const { year, leaveTypeId, start_date } = req.query;

  try {
    const targetYear = start_date ? parseInt(start_date.split('-')[0]) : (year ? parseInt(year) : new Date().getFullYear());
    const where = { year: targetYear };
    if (userRole === 'EMPLOYEE') {
      where.employeeId = parseInt(userId);
    }
    if (leaveTypeId) {
      where.leaveTypeId = parseInt(leaveTypeId);
    }

    const quotas = await req.db.leaveQuota.findMany({
      where,
      include: { employee: true, leaveType: true }
    });

    // 計算已使用小時 (APPROVED 狀態)
    const summary = await Promise.all(quotas.map(async (q) => {
      const requests = await req.db.leaveRequest.findMany({
        where: {
          employeeId: q.employeeId,
          leaveTypeId: q.leaveTypeId,
          status: 'APPROVED',
          start_date: { startsWith: targetYear.toString() }
        }
      });
      
      let usedHours = 0;
      requests.forEach(r => {
        const sDate = new Date(r.start_date);
        const eDate = new Date(r.end_date);
        const diffDays = Math.round((eDate - sDate) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          // 同一天：計算時間差，最高 8 小時
          const sTime = (r.start_time || '08:00').split(':');
          const eTime = (r.end_time || '17:00').split(':');
          const sMin = parseInt(sTime[0]) * 60 + parseInt(sTime[1]);
          const eMin = parseInt(eTime[0]) * 60 + parseInt(eTime[1]);
          // 簡單計算：如果是 08:00-17:00 (9h)，扣除 1h 休息 = 8h；其他依實計
          let h = (eMin - sMin) / 60;
          if (h >= 9) h = 8; 
          else if (h > 4 && h < 9) h = h - 1; // 假設中間有休息
          usedHours += h;
        } else {
          // 跨天：每天 8 小時
          usedHours += (diffDays + 1) * 8;
        }
      });

      return {
        ...q,
        used_days: usedHours / 8, 
        remaining_days: (q.total_hours - usedHours) / 8,
        total_hours: q.total_hours
      };
    }));

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: '獲取額度失敗' });
  }
};

exports.updateLeaveQuota = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, year, total_hours } = req.body;
    const quota = await req.db.leaveQuota.upsert({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: parseInt(employeeId),
          leaveTypeId: parseInt(leaveTypeId),
          year: parseInt(year)
        }
      },
      update: { total_hours: parseFloat(total_hours) },
      create: {
        employeeId: parseInt(employeeId),
        leaveTypeId: parseInt(leaveTypeId),
        year: parseInt(year),
        total_hours: parseFloat(total_hours)
      }
    });
    res.json(quota);
  } catch (error) {
    res.status(500).json({ error: '設定額度失敗' });
  }
};

exports.batchUpdateQuotas = async (req, res) => {
  const { quotas } = req.body;
  console.log('Batch Quota Update Request:', JSON.stringify(quotas));
  try {
    const operations = quotas.map(q => {
      const hours = parseFloat(q.total_hours) || 0;
      return req.db.leaveQuota.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: parseInt(q.employeeId),
            leaveTypeId: parseInt(q.leaveTypeId),
            year: parseInt(q.year)
          }
        },
        update: { total_hours: hours },
        create: {
          employeeId: parseInt(q.employeeId),
          leaveTypeId: parseInt(q.leaveTypeId),
          year: parseInt(q.year),
          total_hours: hours
        }
      });
    });
    await Promise.all(operations);
    res.json({ message: `成功更新 ${quotas.length} 筆額度資料` });
  } catch (error) {
    console.error('Batch Update Error:', error);
    res.status(500).json({ error: '批次更新額度失敗: ' + error.message });
  }
};

exports.batchDeleteLeaveRequests = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ error: '無效的請求數據' });
    await req.db.leaveRequest.deleteMany({
      where: { id: { in: ids.map(id => parseInt(id)) } }
    });
    res.json({ message: `成功刪除 ${ids.length} 筆請假單` });
  } catch (error) {
    console.error('Batch Delete Error:', error);
    res.status(500).json({ error: '批次刪除失敗' });
  }
};

exports.exportLeaves = async (req, res) => {
  const { activeTab, nameSearch, statusFilter, selectedEmpIds } = req.query;
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    if (activeTab === 'requests') {
      const sheet = workbook.addWorksheet('請假加班申請明細');
      sheet.columns = [
        { header: '工號', key: 'code', width: 12 },
        { header: '姓名', key: 'name', width: 12 },
        { header: '假別/類型', key: 'type', width: 15 },
        { header: '開始時間', key: 'start', width: 20 },
        { header: '結束時間', key: 'end', width: 20 },
        { header: '時數/天數', key: 'hours', width: 12 },
        { header: '原因', key: 'reason', width: 30 },
        { header: '狀態', key: 'status', width: 10 }
      ];

      const where = {};
      if (userRole === 'EMPLOYEE') where.employeeId = parseInt(userId);
      if (selectedEmpIds && selectedEmpIds !== 'undefined') {
        where.employeeId = { in: selectedEmpIds.split(',').map(id => parseInt(id)) };
      }
      if (statusFilter && statusFilter.toUpperCase() !== 'ALL') {
        where.status = statusFilter.toUpperCase();
      }

      const requests = await req.db.leaveRequest.findMany({
        where,
        include: { employee: true, leaveType: true },
        orderBy: { id: 'desc' }
      });

      const statusMap = { 'PENDING': '待審核', 'APPROVED': '核准', 'REJECTED': '未核准' };

      requests.forEach(r => {
        const ns = (nameSearch && nameSearch !== 'undefined') ? nameSearch.toLowerCase() : '';
        if (ns && !r.employee?.name?.toLowerCase().includes(ns) && !r.employee?.code?.toLowerCase().includes(ns) && !r.reason?.toLowerCase().includes(ns)) return;

        // 計算時數 (複用 getLeaveRequests 邏輯)
        let hours = 0;
        try {
          const sDate = new Date(r.start_date); const eDate = new Date(r.end_date);
          const diff = Math.round((eDate - sDate) / 86400000);
          if (diff === 0) {
            const sTime = (r.start_time || '08:00').split(':');
            const eTime = (r.end_time || '17:00').split(':');
            const sMin = parseInt(sTime[0]) * 60 + (parseInt(sTime[1]) || 0);
            const eMin = parseInt(eTime[0]) * 60 + (parseInt(eTime[1]) || 0);
            let h = (eMin - sMin) / 60;
            hours = h >= 9 ? 8 : (h > 4 ? h - 1 : h);
          } else {
            hours = (diff + 1) * 8;
          }
        } catch (e) { hours = 0; }

        sheet.addRow({
          code: r.employee?.code || '',
          name: r.employee?.name || '',
          type: r.leaveType?.name || '加班',
          start: `${r.start_date} ${r.start_time}`,
          end: `${r.end_date} ${r.end_time}`,
          hours: hours + ' 小時',
          reason: r.reason || '',
          status: statusMap[r.status] || r.status
        });
      });
    } else if (activeTab === 'quotas') {
      const sheet = workbook.addWorksheet('員工假額度統計');
      sheet.columns = [
        { header: '工號', key: 'code', width: 12 },
        { header: '姓名', key: 'name', width: 12 },
        { header: '假別', key: 'type', width: 15 },
        { header: '總額度(天)', key: 'total', width: 12 },
        { header: '已使用(天)', key: 'used', width: 12 },
        { header: '剩餘額度(天)', key: 'remaining', width: 12 }
      ];

      const year = new Date().getFullYear();
      const where = { year };
      if (userRole === 'EMPLOYEE') where.employeeId = parseInt(userId);
      if (selectedEmpIds && selectedEmpIds !== 'undefined') {
        where.employeeId = { in: selectedEmpIds.split(',').map(id => parseInt(id)) };
      }
      
      const quotas = await req.db.leaveQuota.findMany({
        where,
        include: { employee: true, leaveType: true }
      });

      for (const q of quotas) {
        const ns = (nameSearch && nameSearch !== 'undefined') ? nameSearch.toLowerCase() : '';
        if (ns && !q.employee?.name?.toLowerCase().includes(ns) && !q.employee?.code?.toLowerCase().includes(ns)) continue;

        const approvedRequests = await req.db.leaveRequest.findMany({
          where: { employeeId: q.employeeId, leaveTypeId: q.leaveTypeId, status: 'APPROVED', start_date: { startsWith: year.toString() } }
        });
        let usedHours = 0;
        approvedRequests.forEach(r => {
          const sDate = new Date(r.start_date); const eDate = new Date(r.end_date);
          const diff = Math.round((eDate - sDate) / 86400000);
          if (diff === 0) {
            const sTime = (r.start_time || '08:00').split(':'); const eTime = (r.end_time || '17:00').split(':');
            let h = (parseInt(eTime[0])*60 + parseInt(eTime[1]) - (parseInt(sTime[0])*60 + parseInt(sTime[1]))) / 60;
            usedHours += h >= 9 ? 8 : (h > 4 ? h - 1 : h);
          } else usedHours += (diff + 1) * 8;
        });

        sheet.addRow({
          code: q.employee?.code,
          name: q.employee?.name,
          type: q.leaveType?.name,
          total: q.total_hours / 8,
          used: usedHours / 8,
          remaining: (q.total_hours - usedHours) / 8
        });
      }
    } else if (activeTab === 'settings') {
      const sheet = workbook.addWorksheet('假別設定清單');
      sheet.columns = [
        { header: '假別名稱', key: 'name', width: 20 },
        { header: '系統代碼', key: 'code', width: 12 },
        { header: '給薪類型', key: 'paid', width: 15 },
        { header: '扣薪比例', key: 'ratio', width: 12 }
      ];
      const types = await req.db.leaveType.findMany();
      types.forEach(t => {
        sheet.addRow({
          name: t.name,
          code: t.code,
          paid: t.is_paid ? '全額給薪' : (t.deduction_ratio > 0 ? '部分扣薪' : '不給薪'),
          ratio: t.deduction_ratio
        });
      });
    }

    workbook.eachSheet(s => {
      const headerRow = s.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Leaves_Export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Error:', error);
    res.status(500).send('匯出失敗');
  }
};

exports.autoCalculateQuotas = async (req, res) => {
  const { year } = req.body;
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  try {
    const employees = await req.db.employee.findMany();
    const leaveTypes = await req.db.leaveType.findMany();

    const operations = [];

    for (const emp of employees) {
      if (!emp.join_date) continue;
      
      const joinDate = new Date(emp.join_date);
      // 計算目前年資（以 targetYear 年底 12/31 來看，或精確到月？）
      // 依據勞基法通常是週年制或曆年制。我們這裡提供簡單的歷年制/週年制計算。
      // 假設簡單起見：年資 = (targetYear - joinYear) + (個月差/12)
      const targetDate = new Date(targetYear, 11, 31); // 年底
      let diffMonths = (targetDate.getFullYear() - joinDate.getFullYear()) * 12 + (targetDate.getMonth() - joinDate.getMonth());
      if (targetDate.getDate() < joinDate.getDate()) diffMonths -= 1;
      const seniorityYears = diffMonths / 12;

      for (const lt of leaveTypes) {
        if (lt.quota_type === 'FIXED') {
          operations.push(req.db.leaveQuota.upsert({
            where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: lt.id, year: targetYear } },
            update: { total_hours: (lt.default_days || 0) * 8 },
            create: { employeeId: emp.id, leaveTypeId: lt.id, year: targetYear, total_hours: (lt.default_days || 0) * 8 }
          }));
        } else if (lt.quota_type === 'SENIORITY' && lt.seniority_rules) {
          try {
            const rules = JSON.parse(lt.seniority_rules).sort((a, b) => b.months - a.months);
            let grantedDays = 0;
            // 找符合的最大級距
            for (const rule of rules) {
              if (seniorityYears * 12 >= rule.months) {
                grantedDays = rule.days;
                break;
              }
            }
            operations.push(req.db.leaveQuota.upsert({
              where: { employeeId_leaveTypeId_year: { employeeId: emp.id, leaveTypeId: lt.id, year: targetYear } },
              update: { total_hours: grantedDays * 8 },
              create: { employeeId: emp.id, leaveTypeId: lt.id, year: targetYear, total_hours: grantedDays * 8 }
            }));
          } catch (e) { console.error('Failed to parse seniority_rules for ' + lt.code); }
        }
      }
    }

    if (operations.length > 0) {
      // 批次執行
      const CHUNK_SIZE = 50;
      for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
        await Promise.all(operations.slice(i, i + CHUNK_SIZE));
      }
    }

    res.json({ message: `成功為 ${employees.length} 名員工自動計算 ${targetYear} 年度額度！` });
  } catch (error) {
    console.error('Auto Calc Quotas Error:', error);
    res.status(500).json({ error: '自動計算額度失敗' });
  }
};
