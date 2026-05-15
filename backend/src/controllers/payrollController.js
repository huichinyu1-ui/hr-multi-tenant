// 移除全域 prisma
const FormulaEngine = require('../services/FormulaEngine');

exports.calculatePayroll = async (req, res) => {
  const { year_month } = req.body;
  if (!year_month) return res.status(400).json({ error: '缺少 year_month 參數' });

  try {
    const existingFinalized = await req.db.payrollRecord.findFirst({
      where: { year_month, status: 'FINALIZED' }
    });
    if (existingFinalized) return res.status(400).json({ error: '該月份已結案鎖定，無法重新計算' });

    const employees = await req.db.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        overrides: true
      }
    });

    // 獲取所有保險級距表 (使用 findMany 確保相容 Turso/SQLite)
    const allGrades = await req.db.insuranceGrade.findMany();
    // 獲取所有方案
    const allPolicies = await req.db.insurancePolicy.findMany();
    // 獲取所有假別 (用於自動計算請假扣薪)
    const leaveTypes = await req.db.leaveType.findMany();

    // 獲取投保薪資認定公式設定 (從 Metadata 表)
    const settings = await req.db.metadata.findMany({ where: { type: 'SYSTEM_SETTING' } });
    const basisFormula = settings.find(s => s.label === 'insurance_basis_formula')?.value || '{base}';
    console.log(`[Payroll] Using insurance basis formula: ${basisFormula}`);

    const items = await req.db.payrollItem.findMany({
      where: { is_active: true },
      orderBy: { sort_order: 'asc' },
      include: { applied_employees: true }
    });

    // 執行自動考勤比對
    const AttendanceMatcher = require('../services/AttendanceMatcher');
    await AttendanceMatcher.matchAttendance(req.db, year_month);

    // 【效能優化】批次一次性計算所有員工的當月考勤統計
    // 取代原本 N 次的逐人查詢，大幅減少 Turso 往返次數
    const employeeIds = employees.map(e => e.id);
    const allSummaries = await AttendanceMatcher.batchCalculateAllSummaries(req.db, employeeIds, year_month);

    const results = [];

    for (const emp of employees) {
      // 直接從記憶體中取得已計算好的考勤統計，不再發送資料庫請求
      const dynamicAttendanceVars = allSummaries[emp.id] || {};
      
      const pool = FormulaEngine.createVariablePool(emp, dynamicAttendanceVars);

      // --- 保險金額自動計算邏輯 ---
      // 使用 Number() 確保型別相符 (Turso 可能回傳字串型 id)
      const policy = allPolicies.find(p => Number(p.id) === Number(emp.insurancePolicyId));
      
      // 根據公式計算「投保薪資基準」
      const insuranceBasis = FormulaEngine.calculate(basisFormula, pool);
      pool.insurance_salary = insuranceBasis; // 將投保基準注入變數池，供其他公式引用
      
      // 初始值設為 0
      pool.labor_fee = 0;
      pool.health_fee = 0;
      pool.pension_fee = 0;
      pool.job_ins_fee = 0;

      if (policy) {
        const findInsuredSalary = (type) => {
          const grades = allGrades.filter(g => g.type === type).sort((a, b) => a.grade - b.grade);
          const match = grades.find(g => insuranceBasis >= g.salary_range_start && insuranceBasis <= g.salary_range_end);
          // 如果沒在範圍內，找最後一級（最高級）
          return match ? match : grades[grades.length - 1];
        };

        if (policy.hasLabor) {
          const g = findInsuredSalary('LABOR');
          if (g) pool.labor_fee = Math.round(g.insured_salary * g.employee_ratio);
        }
        if (policy.hasHealth) {
          const g = findInsuredSalary('HEALTH');
          // 將本人與眷屬的健保費拆開，方便前端公式分別引用
          if (g) {
            pool.health_fee = Math.round(g.insured_salary * g.employee_ratio);
            pool.dependent_health_fee = Math.round(g.insured_salary * g.employee_ratio * (pool.health_dependents || 0));
          }
        }
        if (policy.hasPension) {
          const g = findInsuredSalary('PENSION');
          // 勞退自提：優先使用員工個人設定的比例，若無則看級距表有無預設自提比例
          const pRate = pool.pension_rate ? (pool.pension_rate / 100) : g.employee_ratio;
          if (g) pool.pension_fee = Math.round(g.insured_salary * pRate);
        }
      }
      // --------------------------
      
      let total_addition = 0;
      let total_deduction = 0;
      const details = [];

      // 嘗試計算所有已啟用的薪資項目，若計算結果為 0 則自動隱藏
      const sortedItems = items;

      // 【防自我參照】快照員工原始欄位值：確保公式項目引用自己代碼時，
      // 讀到的是員工個人資料的原始值，而不是 0 或上一次計算的結果
      const empFieldSnapshot = { ...pool };

      const processItem = (item) => {
        // 檢查套用範圍：如果設定了特定員工範圍，且當前員工不在範圍內，則跳過此項目
        if (item.applied_employees && item.applied_employees.length > 0) {
          const isApplied = item.applied_employees.some(a => Number(a.id) === Number(emp.id));
          if (!isApplied) {
            pool[item.code] = 0; // 確保變數池中該項目值為 0，避免被其他公式誤用
            return;
          }
        }

        const override = emp.overrides.find(o => o.payrollItemId === item.id);
        let amount = 0;

        if (override && override.custom_amount !== null) {
          amount = override.custom_amount;
        } else if (item.calc_type === 'FIXED' || item.calc_type === 'VARIABLE') {
          // 優先從變數池(員工資料/考勤數據)抓取，若無則使用項目預設值
          amount = (pool[item.code] !== undefined) ? pool[item.code] : (item.default_amount || 0);

          // 【容錯機制】若使用者誤選 VARIABLE 但把變數寫在 formula_expr 中（例如 {custom_1}）
          if (amount === 0 && item.calc_type === 'VARIABLE' && item.formula_expr) {
            const match = item.formula_expr.trim().match(/^{([A-Za-z0-9_]+)}$/);
            if (match && pool[match[1]] !== undefined) {
              amount = pool[match[1]];
            }
          }
        } else if (item.calc_type === 'FORMULA') {
          const usedFormula = (override && override.custom_formula) ? override.custom_formula : item.formula_expr;
          // 計算前，暫時將 pool 中該項目的代碼值還原為員工原始欄位值
          // 解決自我參照問題（例如 meal_allowance 公式引用 {meal_allowance}）
          const savedVal = pool[item.code];
          pool[item.code] = empFieldSnapshot[item.code] ?? savedVal;
          amount = FormulaEngine.calculate(usedFormula, pool);
          pool[item.code] = savedVal; // 還原，讓後面的項目不受影響
        }

        pool[item.code] = amount;
        
        // 僅當金額不為 0 時才加入明細 (基本薪資在後面單獨處理)
        if (item.code !== 'base' && amount !== 0) {
          if (item.type === 'ADDITION') total_addition += amount;
          else if (item.type === 'DEDUCTION') total_deduction += amount;
          
          details.push({
            item_code: item.code,
            item_name: item.name,
            amount: amount,
            type: item.type,
            note: "" // 試算時預設備註為空，不帶入公式定義的內部備註
          });
        }
      };

      sortedItems.forEach(processItem);

      // --- 保險費自動加入扣項明細 ---
      // 這些費用由引擎自動計算，不走 PayrollItem 循環，需手動推入
      const insuranceDetails = [
        { code: 'labor_fee',   name: '勞工保險費(自付)' },
        { code: 'health_fee',  name: '全民健康保險費(自付)' },
        { code: 'pension_fee', name: '勞工退休金(自提)' },
        { code: 'job_ins_fee', name: '就業保險費(自付)' },
      ];
      insuranceDetails.forEach(({ code, name }) => {
        const amount = pool[code] || 0;
        if (amount !== 0) {
          total_deduction += amount;
          details.push({ item_code: code, item_name: name, amount, type: 'DEDUCTION' });
        }
      });
      // ---------------------------------

      // --- 假別自動扣款引擎 ---
      leaveTypes.forEach(lt => {
        if (lt.deduction_ratio > 0) {
          const hoursVar = `${lt.code.toLowerCase()}_leave_hours`;
          const takenHours = pool[hoursVar] || 0;
          if (takenHours > 0) {
            // 解析扣款基準 (例如 {base_salary})
            const deductionBase = FormulaEngine.calculate(lt.deduction_base || '{base_salary}', pool);
            // 扣款金額 = (基準 / 240) * 請假時數 * 扣款比例
            // 先不算到小數點，用 Math.round
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
      // ---------------------------------
      // ---------------------------------

      // 處理基本薪資 (即使為 0 也顯示，因為這是核心項目)
      total_addition += pool.base;
      details.push({
        item_code: 'base',
        item_name: '基本薪資',
        amount: pool.base,
        type: 'ADDITION',
        note: "" // 預設備註為空
      });

      const net_salary = total_addition - total_deduction;

      // 【批次優化】不立即寫入，先累積到記憶體陣列
      results.push({
        empId: emp.id,
        total_addition,
        total_deduction,
        net_salary,
        details,
      });
    }

    // 【批次寫入】所有員工計算完畢後，一次性執行所有薪資單寫入
    // 將 upsert 操作打包成每批 20 筆，顯著減少 Turso 網路往返次數
    const writeOps = results.map(r =>
      req.db.payrollRecord.upsert({
        where: { employeeId_year_month: { employeeId: r.empId, year_month } },
        update: {
          total_addition: r.total_addition,
          total_deduction: r.total_deduction,
          net_salary: r.net_salary,
          status: 'DRAFT',
          details: { deleteMany: {}, create: r.details }
        },
        create: {
          employeeId: r.empId,
          year_month,
          total_addition: r.total_addition,
          total_deduction: r.total_deduction,
          net_salary: r.net_salary,
          status: 'DRAFT',
          details: { create: r.details }
        },
        include: { details: true, employee: true }
      })
    );

    // 【並行寫入】Promise.all() 並行執行，比 $transaction() 序列 + BEGIN/COMMIT 快很多
    const CHUNK_SIZE = 20;
    const savedRecords = [];
    for (let i = 0; i < writeOps.length; i += CHUNK_SIZE) {
      const chunk = await Promise.all(writeOps.slice(i, i + CHUNK_SIZE));
      savedRecords.push(...chunk);
    }
    console.log(`[Payroll] 並行寫入完成：${savedRecords.length} 人，${Math.ceil(writeOps.length / CHUNK_SIZE)} 批`);

    res.json(savedRecords);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '薪資結算失敗' });
  }
};

exports.getPayrolls = async (req, res) => {
  const { year_month, start_date, end_date } = req.query;

  try {
    const where = {};
    if (start_date && end_date) {
      const startYM = start_date.substring(0, 7);
      const endYM = end_date.substring(0, 7);
      where.year_month = { gte: startYM, lte: endYM };
    } else if (year_month) {
      where.year_month = year_month;
    }
    
    // 從權限系統獲取是否限本人
    let selfOnlyId;
    if (req.permissions) {
      const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');
      selfOnlyId = getSelfOnlyId(req, 'PAYROLL');
    }

    if (selfOnlyId) {
      where.employeeId = selfOnlyId;
      where.status = 'FINALIZED'; // 一般員工只能看到已發佈的薪資單
    }

    const payrolls = await req.db.payrollRecord.findMany({
      where,
      include: { employee: true, details: true }
    });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ error: '獲取薪資紀錄失敗' });
  }
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  const userId = req.headers['x-user-id'];

  try {
    const record = await req.db.payrollRecord.findUnique({ where: { id: parseInt(id) } });
    if (!record) return res.status(404).json({ error: '紀錄不存在' });
    
    // 安全檢查：只有本人可以確認
    if (record.employeeId !== parseInt(userId)) {
      return res.status(403).json({ error: '無權限確認他人的薪資單' });
    }

    const updated = await req.db.payrollRecord.update({
      where: { id: parseInt(id) },
      data: { is_read: true, read_at: new Date() }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '確認失敗' });
  }
};

exports.unmarkAsRead = async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers['x-user-role'];

  try {
    // 安全檢查：只有管理者可以取消他人的確認狀態
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: '只有管理者有權限取消確認狀態' });
    }

    const updated = await req.db.payrollRecord.update({
      where: { id: parseInt(id) },
      data: { is_read: false, read_at: null }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '取消確認失敗' });
  }
};

exports.updatePayrollDetails = async (req, res) => {
  const { id } = req.params;
  const { details } = req.body; // [{ id, amount }]
  try {
    const existingRecord = await req.db.payrollRecord.findUnique({
      where: { id: parseInt(id) }
    });
    if (!existingRecord) return res.status(404).json({ error: '紀錄不存在' });
    if (existingRecord.status === 'FINALIZED') return res.status(400).json({ error: '該月份已結案鎖定，無法修改明細' });

    // 1. Update individual detail amounts
    for (const detail of details) {
      await req.db.payrollDetail.update({
        where: { id: detail.id },
        data: { amount: parseFloat(detail.amount) || 0 }
      });
    }

    // 2. Recalculate totals
    const updatedDetails = await req.db.payrollDetail.findMany({
      where: { payrollRecordId: parseInt(id) }
    });
    
    let total_addition = 0;
    let total_deduction = 0;

    for (const detail of updatedDetails) {
      if (detail.type === 'ADDITION') total_addition += detail.amount;
      if (detail.type === 'DEDUCTION') total_deduction += detail.amount;
    }
    const net_salary = total_addition - total_deduction;

    // 3. Update the PayrollRecord
    const record = await req.db.payrollRecord.update({
      where: { id: parseInt(id) },
      data: { total_addition, total_deduction, net_salary },
      include: { employee: true, details: true }
    });
    
    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新薪資明細失敗' });
  }
};

// 鎖定結案
exports.finalizePayroll = async (req, res) => {
  const { year_month } = req.body;
  if (!year_month) return res.status(400).json({ error: '缺少 year_month 參數' });

  console.log(`[Payroll] 正在結案月份: ${year_month}`);

  try {
    const updateResult = await req.db.payrollRecord.updateMany({
      where: { year_month },
      data: { status: 'FINALIZED' }
    });

    console.log(`[Payroll] 已更新 ${updateResult.count} 筆紀錄狀態為 FINALIZED`);

    // 建立通知給所有有薪資紀錄的員工
    const records = await req.db.payrollRecord.findMany({
      where: { year_month }
    });

    console.log(`[Payroll] 正在為 ${records.length} 位員工建立通知...`);

    const notificationPromises = records.map(record => 
      req.db.notification.create({
        data: {
          employeeId: record.employeeId,
          title: '薪資單已發佈',
          message: `${year_month} 月份的薪資單已經結案並發佈，您可以前往薪資查詢查看明細。`
        }
      })
    );

    await Promise.all(notificationPromises);
    console.log(`[Payroll] 通知建立完成`);

    res.json({ message: `已成功結案 ${updateResult.count} 筆紀錄，並已發送通知。` });
  } catch (error) {
    console.error('[Payroll] 結案失敗:', error);
    res.status(500).json({ error: '結案失敗' });
  }
};

// 取消結案
exports.unfinalizePayroll = async (req, res) => {
  const { year_month } = req.body;
  if (!year_month) return res.status(400).json({ error: '缺少 year_month 參數' });

  try {
    await req.db.payrollRecord.updateMany({
      where: { year_month },
      data: { status: 'DRAFT' }
    });
    res.json({ message: '已取消結案鎖定' });
  } catch (error) {
    res.status(500).json({ error: '取消結案失敗' });
  }
};

exports.exportPayroll = async (req, res) => {
  const { year_month, start_date, end_date } = req.query;
  if (!year_month && (!start_date || !end_date)) return res.status(400).send('缺少日期參數');

  try {
    let selfOnlyId;
    if (req.permissions) {
      const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');
      selfOnlyId = getSelfOnlyId(req, 'PAYROLL');
    }

    const where = {};
    if (start_date && end_date) {
      const startYM = start_date.substring(0, 7);
      const endYM = end_date.substring(0, 7);
      where.year_month = { gte: startYM, lte: endYM };
    } else if (year_month) {
      where.year_month = year_month;
    }

    if (selfOnlyId) {
      where.employeeId = selfOnlyId;
      where.status = 'FINALIZED';
    }

    const ExcelJS = require('exceljs');
    const payrolls = await req.db.payrollRecord.findMany({
      where,
      include: { employee: true, details: true }
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`${year_month} 薪資總表`);

    // 定義動態加扣項列名
    const allItems = await req.db.payrollItem.findMany({ where: { is_active: true } });
    const additions = allItems.filter(i => i.type === 'ADDITION');
    const deductions = allItems.filter(i => i.type === 'DEDUCTION');

    const columns = [
      { header: '員工工號', key: 'code', width: 12 },
      { header: '姓名', key: 'name', width: 15 },
      { header: '基本薪資', key: 'base', width: 12 },
      ...additions.map(i => ({ header: i.name, key: `add_${i.code}`, width: 12 })),
      { header: '加項總計', key: 'total_add', width: 15 },
      ...deductions.map(i => ({ header: i.name, key: `ded_${i.code}`, width: 12 })),
      { header: '扣項總計', key: 'total_ded', width: 15 },
      { header: '實發薪資', key: 'net', width: 18 }
    ];

    sheet.columns = columns;

    // 填寫數據
    payrolls.forEach(p => {
      const row = {
        code: p.employee.code,
        name: p.employee.name,
        base: p.details.find(d => d.item_code === 'base')?.amount || 0,
        total_add: p.total_addition,
        total_ded: p.total_deduction,
        net: p.net_salary
      };

      additions.forEach(i => {
        row[`add_${i.code}`] = p.details.find(d => d.item_code === i.code)?.amount || 0;
      });
      deductions.forEach(i => {
        row[`ded_${i.code}`] = p.details.find(d => d.item_code === i.code)?.amount || 0;
      });

      sheet.addRow(row);
    });

    // 樣式化標題列
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' } // Indigo-600
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 設置數值列格式
    sheet.eachRow((row, rowNum) => {
      if (rowNum > 1) {
        row.eachCell((cell, colNum) => {
          if (colNum > 2) {
            cell.numFmt = '#,##0';
            cell.alignment = { horizontal: 'right' };
          }
        });
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Payroll_${year_month}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[Export] Error:', error);
    res.status(500).send('匯出失敗');
  }
};

// 導出 Excel
exports.exportPayrollExcel = async (req, res) => {
  const { year_month } = req.query;
  const XLSX = require('xlsx');

  try {
    const payrolls = await req.db.payrollRecord.findMany({
      where: { year_month },
      include: { employee: true, details: { orderBy: { id: 'asc' } } }
    });

    if (payrolls.length === 0) return res.status(404).json({ error: '找不到該月資料' });

    // 取得所有不重複的項目代碼，維持排序感
    const allItemCodes = new Set();
    payrolls.forEach(p => p.details.forEach(d => allItemCodes.add(d.item_code)));
    const sortedItemCodes = Array.from(allItemCodes);

    const data = payrolls.map(p => {
      const row = {
        '員工編號': p.employee.code,
        '姓名': p.employee.name,
        '底薪': p.details.find(d => d.item_code === 'base')?.amount || 0
      };

      // 動態加入各明細項
      sortedItemCodes.forEach(code => {
        if (code === 'base') return;
        const detail = p.details.find(d => d.item_code === code);
        row[detail ? detail.item_name : code] = detail ? detail.amount : 0;
      });

      row['應發總計'] = p.total_addition;
      row['扣項總計'] = p.total_deduction;
      row['實發薪資'] = p.net_salary;
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, '薪資報表');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Payroll_${year_month}.xlsx`);
    res.send(buf);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '匯出 Excel 失敗' });
  }
};

exports.updatePayrollDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { details } = req.body;
    if (!details || !Array.isArray(details)) return res.status(400).json({ error: '無效的明細格式' });

    let total_addition = 0;
    let total_deduction = 0;
    details.forEach(item => {
      const amount = Number(item.amount) || 0;
      if (item.type === 'ADDITION') total_addition += amount;
      if (item.type === 'DEDUCTION') total_deduction += amount;
    });

    const final_salary = Math.round(total_addition - total_deduction);

    const updated = await req.db.payrollRecord.update({
      where: { id: parseInt(id) },
      data: {
        details: JSON.stringify(details),
        total_addition,
        total_deduction,
        final_salary: final_salary
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('更新薪資明細失敗:', error);
    res.status(500).json({ error: '更新失敗' });
  }
};
