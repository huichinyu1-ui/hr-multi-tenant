/**
 * permissionMiddleware.js
 * 
 * 提供兩種中間件：
 * 1. requireAuth     — 確保使用者有登入 (x-user-id 存在)
 * 2. checkPermission — 從 DB 查詢員工的角色權限，驗證是否有指定模組的特定能力
 */

const { getEmployeePermissions } = require('../controllers/roleController');

/**
 * 確保請求有帶 x-user-id（已登入）
 */
exports.requireAuth = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId || userId === 'undefined') {
    return res.status(401).json({ error: '未登入，請重新登入' });
  }
  next();
};

/**
 * 檢查指定模組權限
 * @param {string} module  模組代碼，例如 'ATT'
 * @param {string} ability 能力，例如 'canView' | 'canCreate' | 'canEdit' | 'canDelete'
 * 
 * 用法：router.get('/', checkPermission('ATT', 'canView'), controller.xxx)
 * 
 * 注意：此中間件「不」強制 selfOnly 過濾，
 * selfOnly 由各 controller 從 req.permissions 自行判斷。
 */
exports.checkPermission = (module, ability = 'canView') => {
  return async (req, res, next) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId || userId === 'undefined') {
      return res.status(401).json({ error: '未登入，請重新登入' });
    }

    try {
      // 總管代登入 (上帝模式) 特權通行
      if (parseInt(userId) === 999999) {
        req.permissions = {
          EMP: { canView: true, canEdit: true, canCreate: true, canDelete: true, canManageMetadata: true, canManageRole: true, canManagePayroll: true },
          ATT: { canView: true, canEdit: true, canCreate: true, canDelete: true },
          LEAVE: { canView: true, canEdit: true, canCreate: true, canDelete: true },
          LEAVE_TYPE: { canView: true, canEdit: true, canCreate: true, canDelete: true },
          CALENDAR: { canView: true, canEdit: true, canCreate: true, canDelete: true },
          SHIFT: { canView: true, canEdit: true, canCreate: true, canDelete: true },
          FORMULA: { canView: true, canEdit: true, canCreate: true, canDelete: true },
          PAYROLL: { canView: true, canEdit: true, canCreate: true, canDelete: true },
          SETTINGS: { canManageSettings: true },
          MISSED_PUNCH: { canView: true, canEdit: true, canCreate: true, canDelete: true }
        };
        req.currentEmployee = { id: 999999, role: 'ADMIN', roleId: null };
        return next();
      }

      // 取得員工資料（含 roleId）
      const employee = await req.db.employee.findUnique({
        where: { id: parseInt(userId) },
        select: { id: true, role: true, roleId: true }
      });

      if (!employee) {
        return res.status(401).json({ error: '找不到該使用者' });
      }

      // 查詢完整權限
      const permissions = await getEmployeePermissions(req.db, employee);

      // 注入到 req 供下游 controller 使用
      req.permissions = permissions;
      req.currentEmployee = employee;

      // 驗證指定模組的指定能力
      const modPerm = permissions[module];
      if (!modPerm || !modPerm[ability]) {
        return res.status(403).json({
          error: `您沒有「${module}」模組的「${ability}」權限`
        });
      }

      next();
    } catch (err) {
      console.error('[Permission Middleware] error:', err);
      res.status(500).json({ error: '權限驗證失敗' });
    }
  };
};

/**
 * 輔助函式：供 controller 判斷是否應該只查看本人資料
 * 若 permissions[module].selfOnly === true，回傳當前 userId；否則回傳 undefined
 */
exports.getSelfOnlyId = (req, module) => {
  const permissions = req.permissions;
  const userId = req.headers['x-user-id'];
  if (!permissions || !permissions[module]) return undefined;
  return permissions[module].selfOnly ? parseInt(userId) : undefined;
};
