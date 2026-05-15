const PRESETS = require('../data/insurance_presets');

exports.getAllGrades = async (req, res) => {
  try {
    const { type } = req.query;
    console.log(`[Insurance] Fetching grades for type: ${type || 'ALL'}`);
    const where = type ? { type } : {};
    const grades = await req.db.insuranceGrade.findMany({
      where,
      orderBy: [{ type: 'asc' }, { grade: 'asc' }]
    });
    res.json(grades);
  } catch (error) {
    console.error('[Insurance Fetch Error]:', error);
    res.status(500).json({ error: '獲取級距表失敗: ' + error.message });
  }
};

exports.updateGrades = async (req, res) => {
  const { grades } = req.body;
  console.log(`[Insurance] Updating ${grades?.length} grades`);
  try {
    const results = await req.db.$transaction(
      grades.map(g => 
        req.db.insuranceGrade.upsert({
          where: { 
            type_grade: { 
              type: String(g.type), 
              grade: parseInt(g.grade) 
            } 
          },
          update: {
            salary_range_start: parseFloat(g.salary_range_start) || 0,
            salary_range_end: parseFloat(g.salary_range_end) || 0,
            insured_salary: parseFloat(g.insured_salary) || 0,
            employee_ratio: parseFloat(g.employee_ratio) || 0,
            employer_ratio: parseFloat(g.employer_ratio) || 0,
            note: g.note || ''
          },
          create: {
            type: String(g.type),
            grade: parseInt(g.grade),
            salary_range_start: parseFloat(g.salary_range_start) || 0,
            salary_range_end: parseFloat(g.salary_range_end) || 0,
            insured_salary: parseFloat(g.insured_salary) || 0,
            employee_ratio: parseFloat(g.employee_ratio) || 0,
            employer_ratio: parseFloat(g.employer_ratio) || 0,
            note: g.note || ''
          }
        })
      )
    );
    res.json({ message: '更新成功', count: results.length });
  } catch (error) {
    console.error('[Insurance Update Error]:', error);
    res.status(500).json({ 
      error: '更新級距表失敗', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

exports.deleteGrade = async (req, res) => {
  const { type, grade } = req.params;
  try {
    await req.db.insuranceGrade.delete({
      where: { type_grade: { type, grade: parseInt(grade) } }
    });
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除失敗' });
  }
};

exports.globalAdjust = async (req, res) => {
  const { globalRates, basisFormula } = req.body;
  try {
    console.log('[Insurance] Global Adjusting with formula:', basisFormula);
    
    // 儲存認定公式
    if (basisFormula) {
      await req.db.metadata.deleteMany({ where: { type: 'SYSTEM_SETTING', label: 'insurance_basis_formula' } });
      await req.db.metadata.create({
        data: { type: 'SYSTEM_SETTING', label: 'insurance_basis_formula', value: basisFormula }
      });
    }

    // 新增：儲存全域費率設定，供下次進頁面回顯
    const ratesToStore = [
      { label: 'global_labor_rate',   value: JSON.stringify(globalRates.labor) },
      { label: 'global_health_rate',  value: JSON.stringify(globalRates.health) },
      { label: 'global_pension_rate', value: JSON.stringify(globalRates.pension) }
    ];

    for (const rate of ratesToStore) {
      await req.db.metadata.deleteMany({ where: { type: 'SYSTEM_SETTING', label: rate.label } });
      await req.db.metadata.create({
        data: { type: 'SYSTEM_SETTING', label: rate.label, value: rate.value }
      });
    }

    // 1. 勞保計算 (總額 100% = 勞 + 資 + 政)
    const laborERatio = (globalRates.labor.total / 100) * (globalRates.labor.employee / 100);
    const laborRRatio = (globalRates.labor.total / 100) * (globalRates.labor.employer / 100);
    
    // 2. 健保計算 (關鍵：單位負擔需乘上 1 + 平均眷屬人數 0.57)
    const avgDependents = 0.57; 
    const healthERatio = (globalRates.health.total / 100) * (globalRates.health.employee / 100);
    const healthRRatio = (globalRates.health.total / 100) * (globalRates.health.employer / 100) * (1 + avgDependents);

    // 3. 勞退計算
    const pensionRRatio = (globalRates.pension?.employer || 6) / 100;
    const pensionERatio = (globalRates.pension?.employee || 0) / 100;

    // 執行資料庫批次更新
    await req.db.insuranceGrade.updateMany({
      where: { type: 'LABOR' },
      data: { employee_ratio: laborERatio, employer_ratio: laborRRatio }
    });
    await req.db.insuranceGrade.updateMany({
      where: { type: 'HEALTH' },
      data: { employee_ratio: healthERatio, employer_ratio: healthRRatio }
    });
    await req.db.insuranceGrade.updateMany({
      where: { type: 'PENSION' },
      data: { employee_ratio: pensionERatio, employer_ratio: pensionRRatio }
    });

    res.json({ message: '全域費率調整成功 (已包含健保平均眷屬係數 1.57)' });
  } catch (error) {
    console.error('[Insurance Global Adjust Error]:', error);
    res.status(500).json({ error: '全域調整失敗: ' + error.message });
  }
};

exports.getPresets = async (req, res) => {
  const list = Object.keys(PRESETS).map(key => ({
    id: key,
    name: PRESETS[key].name
  }));
  res.json(list);
};

exports.importPreset = async (req, res) => {
  const { versionId } = req.body;
  const preset = PRESETS[versionId];
  if (!preset) return res.status(404).json({ error: '找不到該版本的級距預設' });

  try {
    console.log(`[Insurance] Importing preset: ${preset.name}`);
    
    // 根據新的 ratios 格式計算實際比例
    const r = preset.ratios;
    const laborEmpRatio    = (r.labor.total / 100) * (r.labor.employee / 100);
    const laborEmpRRatio   = (r.labor.total / 100) * (r.labor.employer / 100);
    const avgDependents    = 0.57; // 健保平均眷屬係數
    const healthEmpRatio   = (r.health.total / 100) * (r.health.employee / 100);
    const healthEmprRatio  = (r.health.total / 100) * (r.health.employer / 100) * (1 + avgDependents);
    const pensionEmpRatio  = (r.pension.employee || 0) / 100;
    const pensionEmprRatio = (r.pension.employer || 6) / 100;

    // 1. 清空現有級距
    await req.db.insuranceGrade.deleteMany();

    // 2. 批次插入勞保
    for (const item of preset.labor) {
      await req.db.insuranceGrade.create({
        data: {
          type: 'LABOR',
          grade: item.grade,
          salary_range_start: item.range_start,
          salary_range_end: item.range_end,
          insured_salary: item.salary,
          employee_ratio: laborEmpRatio,
          employer_ratio: laborEmpRRatio,
          note: `${preset.id} 標準`
        }
      });
    }

    // 3. 批次插入健保
    for (const item of preset.health) {
      await req.db.insuranceGrade.create({
        data: {
          type: 'HEALTH',
          grade: item.grade,
          salary_range_start: item.range_start,
          salary_range_end: item.range_end,
          insured_salary: item.salary,
          employee_ratio: healthEmpRatio,
          employer_ratio: healthEmprRatio,
          note: `${preset.id} 標準`
        }
      });
    }

    // 4. 批次插入勞退
    for (const item of preset.pension) {
      await req.db.insuranceGrade.create({
        data: {
          type: 'PENSION',
          grade: item.grade,
          salary_range_start: item.range_start,
          salary_range_end: item.range_end,
          insured_salary: item.salary,
          employee_ratio: pensionEmpRatio,
          employer_ratio: pensionEmprRatio,
          note: `${preset.id} 標準`
        }
      });
    }

    // 5. 更新 Metadata 記錄版本（delete/create 取代 upsert）
    await req.db.metadata.deleteMany({ where: { type: 'SYSTEM_SETTING', label: 'applied_insurance_preset' } });
    await req.db.metadata.create({
      data: { type: 'SYSTEM_SETTING', label: 'applied_insurance_preset', value: preset.name }
    });

    res.json({ message: `成功導入 ${preset.name}` });
  } catch (error) {
    console.error('[Insurance Import Error]:', error);
    res.status(500).json({ error: '導入失敗: ' + error.message });
  }
};
