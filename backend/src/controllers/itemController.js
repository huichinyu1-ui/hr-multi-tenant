// 移除全域 prisma
const { evaluate } = require('mathjs');

async function validateFormula(db, formula_expr, res, currentCode) {
  if (!formula_expr) return true;

  const allItems = await db.payrollItem.findMany({ select: { code: true } });
  const validCodes = new Set(allItems.map(i => i.code));
  [
    'base_salary', 'base', 'full_attendance_bonus', 'production_bonus', 'performance_bonus',
    'meal_allowance', 'festival_bonus', 'absent_days', 'late_days', 'work_hours',
    'work_days_count', 'work_hours_count', 'present_days', 'present_hours',
    'late_mins', 'late_hours', 'early_leave_hours',
    'overtime1_hours', 'overtime1_count', 'overtime2_hours', 'overtime2_count',
    'holiday_overtime_hours',
    'labor_fee', 'health_fee', 'dependent_health_fee', 'pension_fee', 'insurance_salary',
    'health_dependents', 'pension_rate',
    'custom_1', 'custom_2', 'custom_3',
    'custom_4', 'custom_5', 'custom_6'
  ].forEach(c => validCodes.add(c));

  const vars = [];
  formula_expr.replace(/{([^}]+)}/g, (match, v) => {
    vars.push(v);
  });

  const invalidVars = vars.filter(v =>
    !validCodes.has(v) &&
    !v.endsWith('_days') &&
    !v.endsWith('_hours') &&
    !v.endsWith('_mins') &&
    !v.endsWith('_count') &&
    !v.endsWith('_count_h1') &&
    !v.endsWith('_count_h2') &&
    !v.endsWith('_leave_hours') &&
    !v.endsWith('_leave_days') &&
    v !== currentCode
  );
  if (invalidVars.length > 0) {
    res.status(400).json({ error: `引用的代碼不正確: ${invalidVars.join(', ')}` });
    return false;
  }

  try {
     const testExpr = formula_expr.replace(/{[^}]+}/g, '1');
     const customScope = {
       if: (cond, trueVal, falseVal) => (cond ? trueVal : falseVal),
       and: (a, b) => (a && b ? 1 : 0),
       or: (a, b) => (a || b ? 1 : 0),
     };
     evaluate(testExpr, customScope);
  } catch (e) {
     res.status(400).json({ error: `算式語法有誤: ${e.message}` });
     return false;
  }
  return true;
}

exports.getAllItems = async (req, res) => {
  try {
    const items = await req.db.payrollItem.findMany({
      orderBy: { sort_order: 'asc' },
      include: { applied_employees: true }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: '獲取項目失敗' });
  }
};

exports.createItem = async (req, res) => {
  try {
    const { code, name, type, calc_type, default_amount, formula_expr, is_global, applied_employee_ids, sort_order, note } = req.body;
    
    if (calc_type === 'FORMULA') {
      const isValid = await validateFormula(req.db, formula_expr, res, code);
      if (!isValid) return;
    }

    const connectEmployees = (!is_global && Array.isArray(applied_employee_ids)) 
      ? applied_employee_ids.map(id => ({ id: parseInt(id) }))
      : [];

    const item = await req.db.payrollItem.create({
      data: {
        code, name, type, calc_type,
        default_amount: default_amount ? parseFloat(default_amount) : null,
        formula_expr: formula_expr || null,
        sort_order: (sort_order !== "" && sort_order !== undefined) ? parseInt(sort_order) : 0,
        note: note || null,
        is_global: is_global === undefined ? true : is_global,
        applied_employees: {
          connect: connectEmployees
        }
      },
      include: { applied_employees: true }
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: '新增項目失敗' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { code, name, type, calc_type, default_amount, formula_expr, is_active, is_global, applied_employee_ids, sort_order, note } = req.body;
    
    if (calc_type === 'FORMULA') {
      const isValid = await validateFormula(req.db, formula_expr, res, code);
      if (!isValid) return;
    }
    
    // Disconnect all first, then connect the selected ones
    await req.db.payrollItem.update({
      where: { id: parseInt(req.params.id) },
      data: { applied_employees: { set: [] } }
    });

    const connectEmployees = (!is_global && Array.isArray(applied_employee_ids)) 
      ? applied_employee_ids.map(id => ({ id: parseInt(id) }))
      : [];

    const item = await req.db.payrollItem.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name, type, calc_type, is_active,
        default_amount: default_amount ? parseFloat(default_amount) : null,
        formula_expr: formula_expr || null,
        sort_order: (sort_order !== "" && sort_order !== undefined) ? parseInt(sort_order) : 0,
        note: (note !== undefined) ? note : null,
        is_global: is_global === undefined ? true : is_global,
        applied_employees: {
          connect: connectEmployees
        }
      },
      include: { applied_employees: true }
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: '更新項目失敗' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    await req.db.payrollItem.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: '項目已刪除' });
  } catch (error) {
    res.status(500).json({ error: '刪除項目失敗' });
  }
};
