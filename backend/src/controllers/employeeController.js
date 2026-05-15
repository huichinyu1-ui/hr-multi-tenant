// 移除全域 prisma，改由 req.db 提供

const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');

exports.getAllEmployees = async (req, res) => {
  const userId = req.headers['x-user-id'];
  const selfOnlyId = getSelfOnlyId(req, 'EMP');
  const canEditEmp = req.permissions && req.permissions['EMP'] && req.permissions['EMP'].canEdit;
  const isSuperAdmin = req.currentEmployee?.role === 'ADMIN';

  console.log(`[API] getAllEmployees called by ID: ${userId}, selfOnlyId: ${selfOnlyId}`);
  
  try {
    let where = {};
    if (selfOnlyId) {
      where = { id: selfOnlyId };
    }
      
    const employees = await req.db.employee.findMany({
      where,
      include: { workShift: true, overrides: true, leaveQuotas: true }
    });

    const d = new Date();
    const taiwanTime = new Date(d.getTime() + (8 * 3600000));
    const today = taiwanTime.toISOString().split('T')[0];

    // 安全性過濾與自動離職判定
    const filteredEmployees = employees.map(emp => {
      let finalStatus = emp.status;
      // 如果有離職日且今日 >= 離職日，自動判定為 RESIGNED
      if (emp.resign_date && today >= emp.resign_date) {
        finalStatus = 'RESIGNED';
      }

      // 擁有編輯權限者 或 系統管理員 可以看到完整資訊，否則隱藏薪資等敏感資料
      // 注意：即使是本人，如果沒有 canEdit，可能也不該在此 API 看到自己的 base_salary（這通常在 Payroll 模組查看）
      // 這裡先統一規定只有能「編輯員工檔案」的人才能看見這些敏感欄位
      if (canEditEmp || isSuperAdmin) return { ...emp, status: finalStatus };
      
      const { 
        base_salary, full_attendance_bonus, production_bonus, 
        meal_allowance, festival_bonus, insurance_salary,
        bank_code, bank_account, overrides, password,
        ...safeData 
      } = emp;
      return { ...safeData, status: finalStatus };
    });

    console.log(`[API] Returning ${filteredEmployees.length} employees`);
    res.json(filteredEmployees || []);
  } catch (error) {
    console.error('[API] Error in getAllEmployees:', error);
    res.status(500).json({ error: '獲取員工失敗' });
  }
};

exports.getEmployeeById = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const selfOnlyId = getSelfOnlyId(req, 'EMP');
    const canEditEmp = req.permissions && req.permissions['EMP'] && req.permissions['EMP'].canEdit;
    const isSuperAdmin = req.currentEmployee?.role === 'ADMIN';

    if (selfOnlyId && selfOnlyId !== targetId) {
      return res.status(403).json({ error: '您僅能存取自己的資料' });
    }

    const employee = await req.db.employee.findUnique({
      where: { id: targetId },
      include: { overrides: true, attendances: true, workShift: true, leaveQuotas: true }
    });
    if (!employee) return res.status(404).json({ error: '找不到員工' });

    // 安全性過濾
    if (!(canEditEmp || isSuperAdmin)) {
      const { 
        base_salary, full_attendance_bonus, production_bonus, 
        meal_allowance, festival_bonus, insurance_salary,
        bank_code, bank_account, overrides, password,
        ...safeData 
      } = employee;
      return res.json(safeData);
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: '獲取員工失敗' });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { 
      code, name, base_salary, status, full_attendance_bonus, production_bonus, meal_allowance, festival_bonus, workShiftId,
      gender, birthday, id_number, phone, email, address, emergency_contact, emergency_phone, emergency_relationship,
      department, position, join_date, probation_date, employment_type,
      bank_code, bank_account, insurance_salary, role, roleId, username,
      custom_field1, custom_field2, custom_field3, custom_field4, custom_field5, custom_field6,
      resign_date
    } = req.body;

    const employee = await req.db.employee.create({
      data: { 
        code, 
        name, 
        base_salary: parseFloat(base_salary) || 0,
        full_attendance_bonus: parseFloat(full_attendance_bonus) || 0,
        production_bonus: parseFloat(production_bonus) || 0,
        performance_bonus: parseFloat(req.body.performance_bonus) || 0,
        meal_allowance: parseFloat(meal_allowance) || 0,
        festival_bonus: parseFloat(festival_bonus) || 0,
        status: status || 'ACTIVE',
        workShiftId: workShiftId ? parseInt(workShiftId) : null,
        username: username || code || `user_${Date.now()}`,
        role: role || 'EMPLOYEE',
        roleId: roleId ? parseInt(roleId) : null,
        gender, birthday, id_number, phone, email, address, 
        emergency_contact, emergency_phone, emergency_relationship,
        department, position, join_date, probation_date, resign_date,
        employment_type: employment_type || 'FULL_TIME',
        bank_code, bank_account, 
        insurance_salary: parseFloat(insurance_salary) || 0,
        health_dependents: parseInt(req.body.health_dependents) || 0,
        pension_rate: parseFloat(req.body.pension_rate) || 0,
        custom_1: parseFloat(req.body.custom_1) || 0,
        custom_2: parseFloat(req.body.custom_2) || 0,
        custom_3: parseFloat(req.body.custom_3) || 0,
        custom_4: parseFloat(req.body.custom_4) || 0,
        custom_5: parseFloat(req.body.custom_5) || 0,
        custom_6: parseFloat(req.body.custom_6) || 0,
        custom_field1, custom_field2, custom_field3, custom_field4, custom_field5, custom_field6,
        leaveQuotas: {
          create: (req.body.leaveQuotas || []).map(q => ({
            leaveTypeId: parseInt(q.leaveTypeId),
            total_hours: parseFloat(q.total_hours) || 0,
            year: parseInt(q.year) || new Date().getFullYear()
          }))
        }
      },
      include: { workShift: true, leaveQuotas: true }
    });
    res.status(201).json(employee);
  } catch (error) {
    console.error('新增員工錯誤:', error);
    res.status(500).json({ error: '新增員工失敗: ' + error.message });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const targetId = parseInt(req.params.id);
    const selfOnlyId = getSelfOnlyId(req, 'EMP');

    if (selfOnlyId && selfOnlyId !== targetId) {
      return res.status(403).json({ error: '您僅能修改自己的資料' });
    }

    const { 
      code, name, base_salary, status, full_attendance_bonus, production_bonus, meal_allowance, festival_bonus, workShiftId,
      gender, birthday, id_number, phone, email, address, emergency_contact, emergency_phone, emergency_relationship,
      department, position, join_date, probation_date, employment_type,
      bank_code, bank_account, insurance_salary, role, roleId, username, overrides,
      custom_field1, custom_field2, custom_field3, custom_field4, custom_field5, custom_field6,
      resign_date
    } = req.body;

    // 自動狀態判定：如果離職日為空或在未來，則強制設為 ACTIVE (除非原本就有其他特殊狀態需求，此處預設回歸在職)
    const d = new Date();
    const taiwanTime = new Date(d.getTime() + (8 * 3600000));
    const today = taiwanTime.toISOString().split('T')[0];
    let finalStatus = status || 'ACTIVE';
    if (!resign_date || resign_date > today) {
      finalStatus = 'ACTIVE';
    } else if (resign_date && resign_date <= today) {
      finalStatus = 'RESIGNED';
    }

    const data = { 
      code, 
      name, 
      base_salary: parseFloat(base_salary) || 0,
      full_attendance_bonus: parseFloat(full_attendance_bonus) || 0,
      production_bonus: parseFloat(production_bonus) || 0,
      performance_bonus: parseFloat(req.body.performance_bonus) || 0,
      meal_allowance: parseFloat(meal_allowance) || 0,
      festival_bonus: parseFloat(festival_bonus) || 0,
      status: finalStatus,
      workShiftId: workShiftId ? parseInt(workShiftId) : null,
      role,
      roleId: roleId ? parseInt(roleId) : null,
      username,
      gender, birthday, id_number, phone, email, address, 
      emergency_contact, emergency_phone, emergency_relationship,
      department, position, join_date, probation_date, resign_date,
      employment_type,
      bank_code, bank_account, 
      insurance_salary: parseFloat(insurance_salary) || 0,
      health_dependents: parseInt(req.body.health_dependents) || 0,
      pension_rate: parseFloat(req.body.pension_rate) || 0,
      custom_1: parseFloat(req.body.custom_1) || 0,
      custom_2: parseFloat(req.body.custom_2) || 0,
      custom_3: parseFloat(req.body.custom_3) || 0,
      custom_4: parseFloat(req.body.custom_4) || 0,
      custom_5: parseFloat(req.body.custom_5) || 0,
      custom_6: parseFloat(req.body.custom_6) || 0,
      custom_field1, custom_field2, custom_field3, custom_field4, custom_field5, custom_field6,
      overrides: {
        deleteMany: {},
        create: (overrides || []).map(o => ({
          payrollItemId: parseInt(o.payrollItemId),
          custom_amount: parseFloat(o.custom_amount) || 0,
          custom_formula: o.custom_formula || null
        }))
      },
      leaveQuotas: {
        deleteMany: {},
        create: (req.body.leaveQuotas || []).map(q => ({
          leaveTypeId: parseInt(q.leaveTypeId),
          total_hours: parseFloat(q.total_hours) || 0,
          year: parseInt(q.year) || new Date().getFullYear()
        }))
      }
    };

    if (req.body.password) {
      data.password = String(req.body.password);
    }

    const employee = await req.db.employee.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { workShift: true, overrides: true, leaveQuotas: true }
    });
    res.json(employee);
  } catch (error) {
    console.error('更新員工錯誤:', error);
    res.status(500).json({ error: '更新員工失敗: ' + error.message });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    // 使用交易確保所有關聯數據同時被清理
    await req.db.$transaction(async (tx) => {
      const id = parseInt(req.params.id);
      
      // 1. 刪除所有關聯數據
      await tx.employeeItemOverride.deleteMany({ where: { employeeId: id } });
      await tx.leaveQuota.deleteMany({ where: { employeeId: id } });
      await tx.attendance.deleteMany({ where: { employeeId: id } });
      await tx.payrollRecord.deleteMany({ where: { employeeId: id } });
      await tx.leaveRequest.deleteMany({ where: { employeeId: id } });
      await tx.dailyRecord.deleteMany({ where: { employeeId: id } });
      await tx.notification.deleteMany({ where: { employeeId: id } });
      await tx.missedPunchRequest.deleteMany({ where: { employeeId: id } });
      
      // 2. 執行最終的職員刪除
      await tx.employee.delete({
        where: { id }
      });
    });

    res.json({ message: '員工及其所有關聯紀錄已成功刪除' });
  } catch (error) {
    console.error('[DELETE ERROR]', error);
    res.status(500).json({ error: '刪除員工失敗: 可能存在未處理的關聯數據' });
  }
};

exports.login = async (req, res) => {
  const { username, password, companyCode } = req.body;
  console.log(`[LOGIN ATTEMPT] Company: ${companyCode}, User: ${username}`);
  try {
    const employee = await req.db.employee.findUnique({
      where: { username: String(username) }
    });

    if (!employee) {
      console.log(`[LOGIN FAILED] User not found: ${username}`);
      return res.status(401).json({ error: '找不到此帳號' });
    }

    if (employee.password !== String(password)) {
      console.log(`[LOGIN FAILED] Wrong password for: ${username}`);
      return res.status(401).json({ error: '密碼錯誤' });
    }

    // 查詢細項權限
    const { getEmployeePermissions } = require('../controllers/roleController');
    const permissions = await getEmployeePermissions(req.db, employee);

    // 從中央資料庫獲取企業名稱 (不影響租戶 DB 架構)
    const { centralClient } = require('../db_manager');
    const company = await centralClient.company.findUnique({
      where: { code: companyCode },
      select: { name: true }
    });

    console.log(`[LOGIN SUCCESS] User: ${username}, Company: ${company?.name || companyCode}`);
    const { password: _, ...userWithoutPassword } = employee;
    res.json({
      user: userWithoutPassword,
      permissions,
      companyName: company?.name || companyCode,
      message: '登入成功'
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤: ' + error.message });
  }
};

exports.changePassword = async (req, res) => {
  const { employeeId, oldPassword, newPassword } = req.body;
  console.log(`[PWD CHANGE ATTEMPT] ID: ${employeeId}`);
  try {
    const employee = await req.db.employee.findUnique({
      where: { id: parseInt(employeeId) }
    });

    if (!employee) {
      return res.status(404).json({ error: '找不到該帳號' });
    }

    if (employee.password !== String(oldPassword)) {
      console.log(`[PWD CHANGE FAILED] Wrong old password for ID: ${employeeId}`);
      return res.status(401).json({ error: '舊密碼不正確' });
    }

    await req.db.employee.update({
      where: { id: parseInt(employeeId) },
      data: { password: String(newPassword) }
    });

    console.log(`[PWD CHANGE SUCCESS] ID: ${employeeId}`);
    res.json({ message: '密碼修改成功' });
  } catch (error) {
    console.error('修改密碼錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤: ' + error.message });
  }
};
