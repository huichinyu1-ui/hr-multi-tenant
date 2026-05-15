const { getCompanyClient } = require('../db_manager');

/**
 * 多租戶 (Tenant) 中間件
 * 負責根據 Header 或是 Body 中的公司代碼切換資料庫連線
 */
const tenantMiddleware = async (req, res, next) => {
  // OPTIONS 預檢請求不帶 body / header，直接放行讓 CORS middleware 處理
  if (req.method === 'OPTIONS') return next();

  // 1. 從 Header 獲取公司代碼 (一般 API 請求)
  // 2. 從 Body 獲取公司代碼 (登入請求)
  const companyCode = req.headers['x-company-code'] || req.body?.companyCode;

  if (!companyCode) {
    // 某些不需要 DB 的路徑可以放行
    const publicPaths = ['/', '/api/health', '/api/webauthn/login/start', '/api/webauthn/login/finish'];
    if (publicPaths.includes(req.path)) return next();
    
    // 如果是登入路徑但沒傳公司代碼，報錯
    return res.status(400).json({ error: '未提供公司代碼 (Company Code)' });
  }

  try {
    // 獲取該公司的 Prisma Client 並掛載到 req 物件上
    const db = await getCompanyClient(companyCode);
    req.db = db;
    req.companyCode = companyCode;
    next();
  } catch (error) {
    console.error(`[TenantMiddleware] 錯誤 (${companyCode}):`, error);
    
    // 如果是找不到公司，維持 404
    if (error.message && error.message.includes('找不到公司代碼')) {
      return res.status(404).json({ 
        error: {
          code: 'COMPANY_NOT_FOUND',
          message: error.message 
        }
      });
    }

    // 其他錯誤（如 DB 連線失敗）傳回 500
    res.status(500).json({ 
      error: {
        code: error.code || 'DATABASE_ERROR',
        message: error.message || '資料庫連線失敗'
      }
    });
  }
};

module.exports = tenantMiddleware;
