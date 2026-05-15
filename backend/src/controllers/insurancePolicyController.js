const getInsurancePolicies = async (req, res) => {
  try {
    const policies = await req.db.$queryRawUnsafe(`SELECT * FROM "InsurancePolicy"`);
    
    const formatted = [];
    for (const p of policies) {
      const empCountRes = await req.db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Employee" WHERE "insurancePolicyId" = ${p.id}`);
      const count = empCountRes[0] ? (empCountRes[0].count || empCountRes[0]['COUNT(*)'] || 0) : 0;
      
      formatted.push({
        ...p,
        hasLabor: Boolean(p.hasLabor),
        hasHealth: Boolean(p.hasHealth),
        hasPension: Boolean(p.hasPension),
        hasJobIns: Boolean(p.hasJobIns),
        _count: { employees: Number(count) }
      });
    }
    res.json(formatted);
  } catch (error) {
    console.error('[Policies Get Error]:', error);
    res.status(500).json({ error: error.message });
  }
};

const createInsurancePolicy = async (req, res) => {
  const { name, description, hasLabor, hasHealth, hasPension, hasJobIns } = req.body;
  try {
    const sql = `
      INSERT INTO "InsurancePolicy" ("name", "description", "hasLabor", "hasHealth", "hasPension", "hasJobIns")
      VALUES ('${name}', '${description || ""}', ${hasLabor ? 1 : 0}, ${hasHealth ? 1 : 0}, ${hasPension ? 1 : 0}, ${hasJobIns ? 1 : 0})
    `;
    await req.db.$executeRawUnsafe(sql);
    res.status(201).json({ message: '方案已建立' });
  } catch (error) {
    console.error('[Policies Create Error]:', error);
    res.status(400).json({ error: error.message });
  }
};

const updateInsurancePolicy = async (req, res) => {
  const { id } = req.params;
  const { name, description, hasLabor, hasHealth, hasPension, hasJobIns } = req.body;
  try {
    const sql = `
      UPDATE "InsurancePolicy" 
      SET "name" = '${name}', "description" = '${description || ""}', 
          "hasLabor" = ${hasLabor ? 1 : 0}, "hasHealth" = ${hasHealth ? 1 : 0}, 
          "hasPension" = ${hasPension ? 1 : 0}, "hasJobIns" = ${hasJobIns ? 1 : 0}
      WHERE "id" = ${id}
    `;
    await req.db.$executeRawUnsafe(sql);
    res.json({ message: '方案已更新' });
  } catch (error) {
    console.error('[Policies Update Error]:', error);
    res.status(400).json({ error: error.message });
  }
};

const deleteInsurancePolicy = async (req, res) => {
  const { id } = req.params;
  try {
    // 檢查是否有員工套用
    const result = await req.db.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "Employee" WHERE "insurancePolicyId" = ${id}`);
    const count = result[0] ? (result[0].count || result[0]['COUNT(*)'] || 0) : 0;
    
    if (Number(count) > 0) {
      return res.status(400).json({ error: `仍有 ${count} 位員工套用此方案，無法刪除。` });
    }
    
    await req.db.$executeRawUnsafe(`DELETE FROM "InsurancePolicy" WHERE "id" = ${id}`);
    res.json({ message: '方案已刪除' });
  } catch (error) {
    console.error('[Policies Delete Error]:', error);
    res.status(500).json({ error: error.message });
  }
};

const assignPolicyToEmployees = async (req, res) => {
  const { policyId, employeeIds } = req.body;
  try {
    // 批次更新
    for (const empId of employeeIds) {
      await req.db.$executeRawUnsafe(`UPDATE "Employee" SET "insurancePolicyId" = ${policyId} WHERE "id" = ${empId}`);
    }
    res.json({ message: `成功指派給 ${employeeIds.length} 位員工` });
  } catch (error) {
    console.error('[Policies Assign Error]:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getInsurancePolicies,
  createInsurancePolicy,
  updateInsurancePolicy,
  deleteInsurancePolicy,
  assignPolicyToEmployees
};
