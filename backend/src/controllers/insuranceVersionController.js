const XLSX = require('xlsx');

// ─────────────────────────────────────────────
// 取得所有版本（下拉選單用）
// ─────────────────────────────────────────────
exports.getVersions = async (req, res) => {
  try {
    const versions = await req.db.insurancePresetVersion.findMany({
      orderBy: { year: 'desc' },
      select: {
        id: true, name: true, year: true, source: true, created_at: true,
        labor_emp_rate: true, labor_empr_rate: true,
        health_emp_rate: true, health_empr_rate: true,
        pension_emp_rate: true, pension_empr_rate: true,
        labor_total_pct: true, labor_emp_pct: true,
        health_total_pct: true, health_emp_pct: true,
        _count: { select: { grades: true } }
      }
    });
    res.json(versions);
  } catch (e) {
    console.error('[getVersions Error]', e);
    res.status(500).json({ error: '無法取得版本列表: ' + e.message });
  }
};

// ─────────────────────────────────────────────
// 取得單一版本的所有級距
// ─────────────────────────────────────────────
exports.getVersionGrades = async (req, res) => {
  const { id } = req.params;
  try {
    const grades = await req.db.insurancePresetGrade.findMany({
      where: { versionId: parseInt(id) },
      orderBy: [{ type: 'asc' }, { grade: 'asc' }]
    });
    res.json(grades);
  } catch (e) {
    res.status(500).json({ error: '無法取得級距資料: ' + e.message });
  }
};

// ─────────────────────────────────────────────
// 上傳 Excel (.xlsx) 並解析為版本
// ─────────────────────────────────────────────
exports.uploadVersion = async (req, res) => {
  try {
    const { name, year, rates } = req.body;
    const parsedRates = JSON.parse(rates || '{}');
    
    if (!req.file) return res.status(400).json({ error: '請上傳 Excel 檔案' });
    if (!name)    return res.status(400).json({ error: '請填寫版本名稱' });

    // 解析 Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const grades = parseInsuranceExcel(workbook);

    if (grades.length === 0) {
      return res.status(400).json({ error: '無法從 Excel 中解析到有效的級距資料，請確認格式是否正確' });
    }

    // 計算費率（從 UI 傳入的百分比換算實際比例）
    const avgDep = 0.57;
    const r = parsedRates;
    const laborEmpRate   = (r.labor_total / 100) * (r.labor_emp / 100);
    const laborEmprRate  = (r.labor_total / 100) * (r.labor_empr / 100);
    const healthEmpRate  = (r.health_total / 100) * (r.health_emp / 100);
    const healthEmprRate = (r.health_total / 100) * (r.health_empr / 100) * (1 + avgDep);

    // 建立版本記錄
    const version = await req.db.insurancePresetVersion.create({
      data: {
        name,
        year: parseInt(year) || new Date().getFullYear(),
        source: 'UPLOAD',
        labor_emp_rate:    laborEmpRate,
        labor_empr_rate:   laborEmprRate,
        health_emp_rate:   healthEmpRate,
        health_empr_rate:  healthEmprRate,
        pension_emp_rate:  (r.pension_emp || 0) / 100,
        pension_empr_rate: (r.pension_empr || 6) / 100,
        labor_total_pct:   r.labor_total || 12.5,
        labor_emp_pct:     r.labor_emp   || 20,
        health_total_pct:  r.health_total || 5.17,
        health_emp_pct:    r.health_emp   || 30,
      }
    });

    // 批次寫入級距
    for (const g of grades) {
      await req.db.insurancePresetGrade.create({
        data: { versionId: version.id, ...g }
      });
    }

    res.json({ message: `成功上傳版本「${name}」，共 ${grades.length} 筆級距`, version });
  } catch (e) {
    console.error('[uploadVersion Error]', e);
    res.status(500).json({ error: '上傳失敗: ' + e.message });
  }
};

// ─────────────────────────────────────────────
// 套用版本（將選定版本寫入 InsuranceGrade 供計算使用）
// ─────────────────────────────────────────────
exports.applyVersion = async (req, res) => {
  const { versionId } = req.body;
  if (!versionId) return res.status(400).json({ error: '請提供 versionId' });

  try {
    const version = await req.db.insurancePresetVersion.findUnique({
      where: { id: parseInt(versionId) },
      include: { grades: true }
    });
    if (!version) return res.status(404).json({ error: '版本不存在' });

    // 清空現有級距
    await req.db.insuranceGrade.deleteMany();

    // 批次寫入
    for (const g of version.grades) {
      await req.db.insuranceGrade.create({
        data: {
          type: g.type,
          grade: g.grade,
          salary_range_start: g.salary_range_start,
          salary_range_end: g.salary_range_end,
          insured_salary: g.insured_salary,
          employee_ratio: getEmpRatio(version, g.type),
          employer_ratio: getEmprRatio(version, g.type),
          note: version.name
        }
      });
    }

    // 記錄套用的版本
    await req.db.metadata.deleteMany({ where: { type: 'SYSTEM_SETTING', label: 'applied_insurance_version_id' } });
    await req.db.metadata.create({ data: { type: 'SYSTEM_SETTING', label: 'applied_insurance_version_id', value: String(version.id) } });
    await req.db.metadata.deleteMany({ where: { type: 'SYSTEM_SETTING', label: 'applied_insurance_preset' } });
    await req.db.metadata.create({ data: { type: 'SYSTEM_SETTING', label: 'applied_insurance_preset', value: version.name } });

    res.json({ message: `已套用版本「${version.name}」，共 ${version.grades.length} 筆級距已更新` });
  } catch (e) {
    console.error('[applyVersion Error]', e);
    res.status(500).json({ error: '套用失敗: ' + e.message });
  }
};

// ─────────────────────────────────────────────
// 刪除版本（內建版本可刪，但使用中的版本警告）
// ─────────────────────────────────────────────
exports.deleteVersion = async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.insurancePresetVersion.delete({ where: { id: parseInt(id) } });
    res.json({ message: '版本已刪除' });
  } catch (e) {
    res.status(500).json({ error: '刪除失敗: ' + e.message });
  }
};

// ─────────────────────────────────────────────
// 從基本工資產生新年度版本（最方便的年度更新方式）
// 只需輸入：新年度、新基本工資、費率（若有調整）
// ─────────────────────────────────────────────
exports.generateFromMinWage = async (req, res) => {
  const { year, minWage, sourceVersionId, rates } = req.body;
  if (!year || !minWage) return res.status(400).json({ error: '請提供年份與基本工資' });

  try {
    // 找參考版本（優先用指定版本，否則取最新一筆）
    let sourceVersion;
    if (sourceVersionId) {
      sourceVersion = await req.db.insurancePresetVersion.findUnique({
        where: { id: parseInt(sourceVersionId) },
        include: { grades: true }
      });
    } else {
      sourceVersion = await req.db.insurancePresetVersion.findFirst({
        orderBy: { year: 'desc' },
        include: { grades: true }
      });
    }
    if (!sourceVersion) return res.status(404).json({ error: '找不到參考版本，請先建立或匯入一個版本' });

    const avgDep = 0.57;
    const r = rates || {};
    // 費率：若前端有傳新費率則用新的，否則沿用來源版本的費率
    const laborTotal  = r.labor_total  || (sourceVersion.labor_total_pct);
    const laborEmp    = r.labor_emp    || (sourceVersion.labor_emp_pct);
    const laborEmpr   = r.labor_empr   || (100 - laborEmp - 10); // 政府負擔 10%
    const healthTotal = r.health_total || (sourceVersion.health_total_pct);
    const healthEmp   = r.health_emp   || (sourceVersion.health_emp_pct);
    const healthEmpr  = r.health_empr  || (100 - healthEmp - 10);

    const laborEmpRate   = (laborTotal / 100) * (laborEmp / 100);
    const laborEmprRate  = (laborTotal / 100) * (laborEmpr / 100);
    const healthEmpRate  = (healthTotal / 100) * (healthEmp / 100);
    const healthEmprRate = (healthTotal / 100) * (healthEmpr / 100) * (1 + avgDep);
    const pensionEmpRate  = (r.pension_emp  !== undefined ? r.pension_emp  : sourceVersion.pension_emp_rate  * 100) / 100;
    const pensionEmprRate = (r.pension_empr !== undefined ? r.pension_empr : sourceVersion.pension_empr_rate * 100) / 100;

    const newMinWage = parseInt(minWage);
    const versionName = `${year}年 政府標準級距 (基本工資 ${newMinWage.toLocaleString()})`;

    // 建立新版本
    const newVersion = await req.db.insurancePresetVersion.create({
      data: {
        name: versionName,
        year: parseInt(year),
        source: 'GENERATED',
        labor_emp_rate:    laborEmpRate,
        labor_empr_rate:   laborEmprRate,
        health_emp_rate:   healthEmpRate,
        health_empr_rate:  healthEmprRate,
        pension_emp_rate:  pensionEmpRate,
        pension_empr_rate: pensionEmprRate,
        labor_total_pct:   laborTotal,
        labor_emp_pct:     laborEmp,
        health_total_pct:  healthTotal,
        health_emp_pct:    healthEmp,
      }
    });

    // 複製所有級距，只更新第一級為新基本工資
    const sortedGrades = [...sourceVersion.grades].sort((a, b) => {
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.grade - b.grade;
    });

    for (const g of sortedGrades) {
      const isFirstGrade = g.grade === 1;
      await req.db.insurancePresetGrade.create({
        data: {
          versionId: newVersion.id,
          type: g.type,
          grade: g.grade,
          salary_range_start: 0,
          // 第一級 range_end 與 insured_salary 改為新基本工資
          salary_range_end:  isFirstGrade ? newMinWage : g.salary_range_end,
          insured_salary:    isFirstGrade ? newMinWage : g.insured_salary,
        }
      });
    }

    res.json({
      message: `已成功產生「${versionName}」，共 ${sortedGrades.length} 筆級距`,
      version: { ...newVersion, _count: { grades: sortedGrades.length } }
    });
  } catch (e) {
    console.error('[generateFromMinWage Error]', e);
    res.status(500).json({ error: '產生失敗: ' + e.message });
  }
};

// ─────────────────────────────────────────────
// Excel 解析核心邏輯
// ─────────────────────────────────────────────
function parseInsuranceExcel(workbook) {
  const grades = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // 判斷這個 sheet 是哪種類型
    const sheetType = detectSheetType(sheetName, rows);
    if (!sheetType) continue;

    // 找出薪資數字欄位
    const salaryRows = extractSalaryRows(rows, sheetType);
    grades.push(...salaryRows.map((s, i) => ({
      type: sheetType,
      grade: i + 1,
      salary_range_start: i === 0 ? 0 : salaryRows[i - 1] + 1,
      salary_range_end: i === salaryRows.length - 1 ? 9999999 : salaryRows[i],
      insured_salary: salaryRows[i]
    })));
  }

  // 如果只有一個 sheet，嘗試從欄位名稱判斷多種類型
  if (grades.length === 0 && workbook.SheetNames.length > 0) {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // 嘗試找勞保和健保欄位
    const headerRow = rows.find(r => r.some(c => String(c).includes('勞') || String(c).includes('健')));
    if (headerRow) {
      const laborIdx  = headerRow.findIndex(c => String(c).includes('勞'));
      const healthIdx = headerRow.findIndex(c => String(c).includes('健'));
      
      const dataRows = rows.filter(r => typeof r[0] === 'number' || /^\d+$/.test(String(r[0])));
      
      if (laborIdx >= 0) {
        const laborSalaries = dataRows.map(r => Number(r[laborIdx])).filter(n => n > 5000 && n < 200000);
        laborSalaries.forEach((s, i) => grades.push({
          type: 'LABOR', grade: i + 1,
          salary_range_start: i === 0 ? 0 : laborSalaries[i - 1] + 1,
          salary_range_end: i === laborSalaries.length - 1 ? 9999999 : laborSalaries[i],
          insured_salary: s
        }));
      }
      if (healthIdx >= 0) {
        const healthSalaries = dataRows.map(r => Number(r[healthIdx])).filter(n => n > 5000 && n < 500000);
        healthSalaries.forEach((s, i) => grades.push({
          type: 'HEALTH', grade: i + 1,
          salary_range_start: i === 0 ? 0 : healthSalaries[i - 1] + 1,
          salary_range_end: i === healthSalaries.length - 1 ? 9999999 : healthSalaries[i],
          insured_salary: s
        }));
      }
    }
  }

  return grades;
}

function detectSheetType(sheetName, rows) {
  const name = sheetName.toLowerCase();
  const firstFewRows = rows.slice(0, 5).flat().join('');
  if (name.includes('勞保') || name.includes('labor') || firstFewRows.includes('勞工保險')) return 'LABOR';
  if (name.includes('健保') || name.includes('health') || firstFewRows.includes('全民健康')) return 'HEALTH';
  if (name.includes('勞退') || name.includes('pension') || firstFewRows.includes('勞工退休')) return 'PENSION';
  return null;
}

function extractSalaryRows(rows, type) {
  const maxVal = type === 'HEALTH' ? 400000 : 200000;
  const salaries = [];
  for (const row of rows) {
    for (const cell of row) {
      const n = Number(cell);
      if (n > 10000 && n < maxVal && !salaries.includes(n)) {
        salaries.push(n);
      }
    }
  }
  return [...new Set(salaries)].sort((a, b) => a - b);
}

function getEmpRatio(version, type) {
  if (type === 'LABOR')   return version.labor_emp_rate;
  if (type === 'HEALTH')  return version.health_emp_rate;
  if (type === 'PENSION') return version.pension_emp_rate;
  return 0;
}

function getEmprRatio(version, type) {
  if (type === 'LABOR')   return version.labor_empr_rate;
  if (type === 'HEALTH')  return version.health_empr_rate;
  if (type === 'PENSION') return version.pension_empr_rate;
  return 0;
}
