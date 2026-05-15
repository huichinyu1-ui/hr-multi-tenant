// 所有可控模組清單
const ALL_MODULES = [
  { code: 'EMP',          name: '員工檔案管理' },
  { code: 'ATT',          name: '考勤報表管理' },
  { code: 'LEAVE',        name: '請假/加班管理' },
  { code: 'LEAVE_TYPE',   name: '假別設定' },
  { code: 'PAYROLL',      name: '薪資結算查詢' },
  { code: 'MISSED_PUNCH', name: '補打卡申請' },
  { code: 'CALENDAR',     name: '行事曆設定' },
  { code: 'SHIFT',        name: '班別時段管理' },
  { code: 'FORMULA',      name: '薪資公式設定' },
  { code: 'SETTINGS',     name: '系統環境設定' },
  { code: 'INSURANCE',    name: '保費級距管理' },
];

// 預設系統角色定義
const SYSTEM_ROLES = [
  {
    name: 'ADMIN',
    description: '系統管理員 — 擁有全部模組的完整權限',
    isSystem: true,
    permissions: [
      { module: 'ATT', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: false, canImport: true, canPunch: true, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: true },
      { module: 'CALENDAR', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'EMP', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: true, canManageRole: true, canManageMetadata: true, canManageSettings: false },
      { module: 'FORMULA', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'LEAVE', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: true, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'MISSED_PUNCH', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: true, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'PAYROLL', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'SETTINGS', canView: true, canCreate: false, canEdit: false, canDelete: false, selfOnly: false, canApprove: false, canImport: false, canPunch: true, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: true },
      { module: 'SHIFT', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'INSURANCE', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false }
    ]
  },
  {
    name: 'COLLABORATOR',
    description: '協作者 — 可查看與管理報表',
    isSystem: true,
    permissions: [
      { module: 'ATT', canView: true, canCreate: true, canEdit: true, canDelete: false, selfOnly: false, canApprove: false, canImport: true, canPunch: true, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: true },
      { module: 'CALENDAR', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'EMP', canView: true, canCreate: true, canEdit: true, canDelete: false, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'FORMULA', canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'LEAVE', canView: true, canCreate: true, canEdit: true, canDelete: false, selfOnly: false, canApprove: true, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'MISSED_PUNCH', canView: true, canCreate: true, canEdit: true, canDelete: false, selfOnly: false, canApprove: true, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'PAYROLL', canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: true, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'SETTINGS', canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'SHIFT', canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false }
    ]
  },
  {
    name: 'EMPLOYEE',
    description: '一般員工 — 只能查看與管理本人資料',
    isSystem: true,
    permissions: [
      { module: 'ATT', canView: true, canCreate: false, canEdit: false, canDelete: false, selfOnly: true, canApprove: false, canImport: false, canPunch: true, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: true },
      { module: 'CALENDAR', canView: true, canCreate: false, canEdit: false, canDelete: false, selfOnly: true, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'EMP', canView: true, canCreate: false, canEdit: false, canDelete: false, selfOnly: true, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'FORMULA', canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: true, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'LEAVE', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: true, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'MISSED_PUNCH', canView: true, canCreate: true, canEdit: true, canDelete: true, selfOnly: true, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'PAYROLL', canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: true, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'SETTINGS', canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: false, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false },
      { module: 'SHIFT', canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: true, canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false }
    ]
  }
];

// ── 取得所有模組清單（供前端渲染表格用）
exports.getModules = (req, res) => {
  res.json(ALL_MODULES);
};

// ── 確保預設系統角色存在（啟動時呼叫）
exports.seedSystemRoles = async (db) => {
  for (const roleDef of SYSTEM_ROLES) {
    const existing = await db.role.findUnique({ where: { name: roleDef.name } });
    if (!existing) {
      const role = await db.role.create({
        data: { name: roleDef.name, description: roleDef.description, isSystem: true }
      });
      for (const perm of roleDef.permissions) {
        await db.rolePermission.create({ data: { roleId: role.id, ...perm } });
      }
      console.log(`[RBAC] 建立系統角色: ${roleDef.name}`);
    }
  }
};

// ── 取得所有角色（含權限）
exports.getRoles = async (req, res) => {
  try {
    const roles = await req.db.$queryRawUnsafe(`SELECT * FROM "Role" ORDER BY id ASC`);
    const allPerms = await req.db.$queryRawUnsafe(`SELECT * FROM "RolePermission"`);
    
    // map 1/0 to true/false for all boolean fields
    const booleanFields = ['canView', 'canCreate', 'canEdit', 'canDelete', 'selfOnly', 'canApprove', 'canImport', 'canPunch', 'canManagePayroll', 'canManageRole', 'canManageMetadata', 'canManageSettings'];
    const mappedPerms = allPerms.map(p => {
      const newP = { ...p };
      booleanFields.forEach(f => {
        if (newP[f] !== undefined) newP[f] = Number(newP[f]) === 1;
      });
      return newP;
    });

    // attach perms to roles
    roles.forEach(r => {
      r.permissions = mappedPerms.filter(p => p.roleId === r.id);
    });
    // 補齊缺漏的模組（確保每個角色都有 8 個模組的資料）
    const enriched = roles.map(role => {
      const permMap = {};
      role.permissions.forEach(p => { permMap[p.module] = p; });
      const fullPermissions = ALL_MODULES.map(m => permMap[m.code] || {
        module: m.code, canView: false, canCreate: false,
        canEdit: false, canDelete: false, selfOnly: false
      });
      return { ...role, permissions: fullPermissions };
    });
    res.json(enriched);
  } catch (error) {
    console.error('[Role] getRoles error:', error);
    res.status(500).json({ error: '取得角色失敗' });
  }
};

// ── 建立新角色
exports.createRole = async (req, res) => {
  const { name, description } = req.body;
  try {
    if (!name) return res.status(400).json({ error: '角色名稱為必填' });

    // 使用 raw SQL 以相容舊版雲端 DB（Role 表可能有 permissions NOT NULL 欄位）
    // 先嘗試不含 permissions 的 INSERT，失敗則加入空值
    let roleId;
    try {
      const result = await req.db.$executeRawUnsafe(
        `INSERT INTO "Role" (name, description, isSystem) VALUES (?, ?, 0)`,
        name, description || ''
      );
      // SQLite: 取得剛插入的 rowid
      const row = await req.db.$queryRawUnsafe(`SELECT id FROM "Role" WHERE name = ?`, name);
      roleId = row[0]?.id;
    } catch (insertErr) {
      if (insertErr.message?.includes('NOT NULL') || insertErr.message?.includes('permissions')) {
        // 舊版 DB 有 permissions NOT NULL，補入預設值
        await req.db.$executeRawUnsafe(
          `INSERT INTO "Role" (name, description, isSystem, permissions) VALUES (?, ?, 0, '{}')`,
          name, description || ''
        );
        const row = await req.db.$queryRawUnsafe(`SELECT id FROM "Role" WHERE name = ?`, name);
        roleId = row[0]?.id;
      } else {
        throw insertErr;
      }
    }

    if (!roleId) return res.status(500).json({ error: '無法取得新角色 ID' });

    // 初始化空白權限
    for (const m of ALL_MODULES) {
      await req.db.$executeRawUnsafe(
        `INSERT OR IGNORE INTO "RolePermission" (roleId, module, canView, canCreate, canEdit, canDelete, selfOnly, canApprove, canImport, canPunch, canManagePayroll, canManageRole, canManageMetadata, canManageSettings) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
        roleId, m.code
      );
    }

    const created = await req.db.role.findUnique({
      where: { id: roleId },
      include: { permissions: true }
    });
    res.status(201).json(created);
  } catch (error) {
    if (error.message?.includes('UNIQUE') || error.code === 'P2002') {
      return res.status(400).json({ error: '角色名稱已存在' });
    }
    console.error('[Role] createRole error:', error);
    res.status(500).json({ error: '建立角色失敗: ' + error.message });
  }
};

// ── 更新角色基本資料（名稱/描述）
exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const role = await req.db.role.findUnique({ where: { id: parseInt(id) } });
    if (!role) return res.status(404).json({ error: '找不到此角色' });
    const updated = await req.db.role.update({
      where: { id: parseInt(id) },
      data: { name, description }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新角色失敗' });
  }
};

// ── 刪除角色（系統角色不可刪）
exports.deleteRole = async (req, res) => {
  const { id } = req.params;
  try {
    const role = await req.db.role.findUnique({ where: { id: parseInt(id) } });
    if (!role) return res.status(404).json({ error: '找不到此角色' });
    if (role.isSystem) return res.status(403).json({ error: '系統預設角色不可刪除' });
    // 解除員工關聯
    await req.db.employee.updateMany({ where: { roleId: parseInt(id) }, data: { roleId: null } });
    await req.db.role.delete({ where: { id: parseInt(id) } });
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除角色失敗' });
  }
};

// ── 更新角色的所有模組權限（整批 upsert）
exports.updatePermissions = async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body; // [{ module, canView, canCreate, canEdit, canDelete, selfOnly }]
  const roleId = parseInt(id);

  try {
    if (!Array.isArray(permissions)) return res.status(400).json({ error: '權限格式錯誤' });

    for (const perm of permissions) {
      const cv = perm.canView ? 1 : 0;
      const cc = perm.canCreate ? 1 : 0;
      const ce = perm.canEdit ? 1 : 0;
      const cd = perm.canDelete ? 1 : 0;
      const so = perm.selfOnly ? 1 : 0;
      const cApprove = perm.canApprove ? 1 : 0;
      const cImport = perm.canImport ? 1 : 0;
      const cPunch = perm.canPunch ? 1 : 0;
      const cMPayroll = perm.canManagePayroll ? 1 : 0;
      const cMRole = perm.canManageRole ? 1 : 0;
      const cMMetadata = perm.canManageMetadata ? 1 : 0;
      const cMSettings = perm.canManageSettings ? 1 : 0;

      // 檢查是否已存在
      const existing = await req.db.$queryRawUnsafe(
        `SELECT id FROM "RolePermission" WHERE roleId = ? AND module = ?`,
        roleId, perm.module
      );

      if (existing && existing.length > 0) {
        // 更新
        await req.db.$executeRawUnsafe(
          `UPDATE "RolePermission" SET canView = ?, canCreate = ?, canEdit = ?, canDelete = ?, selfOnly = ?, canApprove = ?, canImport = ?, canPunch = ?, canManagePayroll = ?, canManageRole = ?, canManageMetadata = ?, canManageSettings = ? WHERE roleId = ? AND module = ?`,
          cv, cc, ce, cd, so, cApprove, cImport, cPunch, cMPayroll, cMRole, cMMetadata, cMSettings, roleId, perm.module
        );
      } else {
        // 新增
        await req.db.$executeRawUnsafe(
          `INSERT INTO "RolePermission" (roleId, module, canView, canCreate, canEdit, canDelete, selfOnly, canApprove, canImport, canPunch, canManagePayroll, canManageRole, canManageMetadata, canManageSettings) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          roleId, perm.module, cv, cc, ce, cd, so, cApprove, cImport, cPunch, cMPayroll, cMRole, cMMetadata, cMSettings
        );
      }
    }
    res.json({ message: '權限已儲存' });
  } catch (error) {
    console.error('[Role] updatePermissions error:', error);
    res.status(500).json({ error: '儲存權限失敗: ' + error.message });
  }
};

// ── 取得指定員工的完整權限物件（供登入後使用）
exports.getEmployeePermissions = async (db, employee) => {
  try {
    // 優先用新版 roleId，其次回退到舊版 role 字串
    let rolePermissions = [];
    if (employee.roleId) {
      rolePermissions = await db.$queryRawUnsafe(
        `SELECT * FROM "RolePermission" WHERE roleId = ?`,
        employee.roleId
      );
    } else {
      // 根據舊版 role 字串找到系統角色
      const systemRole = await db.$queryRawUnsafe(
        `SELECT id FROM "Role" WHERE name = ?`,
        employee.role || 'EMPLOYEE'
      );
      if (systemRole && systemRole.length > 0) {
        rolePermissions = await db.$queryRawUnsafe(
          `SELECT * FROM "RolePermission" WHERE roleId = ?`,
          systemRole[0].id
        );
      }
    }

    // 轉為 { ATT: { canView, canCreate, ... }, EMP: {...}, ... } 格式
    const booleanFields = ['canView', 'canCreate', 'canEdit', 'canDelete', 'selfOnly', 'canApprove', 'canImport', 'canPunch', 'canManagePayroll', 'canManageRole', 'canManageMetadata', 'canManageSettings'];
    const permMap = {};
    rolePermissions.forEach(p => { 
      const mappedP = { ...p };
      booleanFields.forEach(f => {
        if (mappedP[f] !== undefined) mappedP[f] = Number(mappedP[f]) === 1;
      });
      permMap[mappedP.module] = mappedP; 
    });
    ALL_MODULES.forEach(m => {
      if (!permMap[m.code]) {
        permMap[m.code] = { 
          canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: true,
          canApprove: false, canImport: false, canPunch: false, canManagePayroll: false, canManageRole: false, canManageMetadata: false, canManageSettings: false
        };
      }
    });
    return permMap;
  } catch (err) {
    console.error('[RBAC] getEmployeePermissions error:', err);
    return {};
  }
};
