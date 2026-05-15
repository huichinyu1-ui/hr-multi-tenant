import React, { createContext, useContext, useMemo } from 'react';

/**
 * PermissionContext
 * 
 * 從 localStorage 讀取登入時儲存的 permissions 物件，
 * 提供 hasPermission / isSelfOnly 給所有頁面使用。
 * 
 * permissions 格式（由後端 login 回傳）：
 * {
 *   ATT:  { canView: true, canCreate: false, canEdit: false, canDelete: false, selfOnly: true },
 *   EMP:  { ... },
 *   ...
 * }
 */

const PermissionContext = createContext(null);

export const usePermission = () => useContext(PermissionContext);

export const PermissionProvider = ({ children }) => {
  const permissions = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('permissions') || localStorage.getItem('permissions');
      const parsed = raw ? JSON.parse(raw) : {};
      // 兼容性處理：若原本沒有 LEAVE_TYPE 權限，則繼承 LEAVE 的權限
      if (parsed.LEAVE && !parsed.LEAVE_TYPE) {
        parsed.LEAVE_TYPE = { ...parsed.LEAVE };
      }
      return parsed;
    } catch {
      return {};
    }
  }, []);

  const user = useMemo(() => {
    try {
      const userStr = sessionStorage.getItem('user') || localStorage.getItem('user');
      return JSON.parse(userStr || '{}');
    } catch {
      return {};
    }
  }, []);

  // 完全動態化：不再依賴 user.role 字串
  const isAdmin = !!permissions?.EMP?.canManageRole; 
  const isCollaborator = false; // 協作者概念已整合進動態權限
  const isSuperUser = isAdmin;

  /**
   * 檢查是否有某模組某能力
   * @param {string} module   模組代碼，如 'ATT'
   * @param {string} ability  能力，如 'canView' | 'canCreate' | 'canEdit' | 'canDelete'
   */
  const hasPermission = (module, ability = 'canView') => {
    const modPerm = permissions[module];
    if (!modPerm) return false;
    return !!modPerm[ability];
  };

  /**
   * 是否為「僅限本人」模式
   * @param {string} module  模組代碼
   */
  const isSelfOnly = (module) => {
    if (isAdmin) return false;
    const modPerm = permissions[module];
    if (!modPerm) return true; // 無權限設定預設只看自己
    return !!modPerm.selfOnly;
  };

  /**
   * 快捷：取得模組的完整 permission 物件
   */
  const getModulePerms = (module) => {
    return permissions[module] || {
      canView: false, canCreate: false, canEdit: false, canDelete: false, selfOnly: true
    };
  };

  return (
    <PermissionContext.Provider value={{
      permissions,
      isAdmin,
      isSuperUser,
      hasPermission,
      isSelfOnly,
      getModulePerms,
    }}>
      {children}
    </PermissionContext.Provider>
  );
};
