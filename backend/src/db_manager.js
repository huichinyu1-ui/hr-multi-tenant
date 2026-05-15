const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
require('dotenv').config();

// 資料庫連線工廠
function createPrismaClient(url, token) {
  // 如果是本地 SQLite 檔案
  if (url.startsWith('file:')) {
    return new PrismaClient({
      datasources: {
        db: { url: url }
      }
    });
  }

  const libsql = createClient({
    url: url,
    authToken: token,
  });
  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

// 中央資料庫連線 (Singleton)
const centralClient = createPrismaClient(
  process.env.CENTRAL_DATABASE_URL,
  process.env.CENTRAL_AUTH_TOKEN
);

// 公司資料庫連線快取
const clientCache = new Map();

/**
 * 根據公司代碼獲取對應的 Prisma Client
 * @param {string} companyCode 
 * @returns {Promise<PrismaClient>}
 */
async function getCompanyClient(companyCode) {
  if (clientCache.has(companyCode)) {
    return clientCache.get(companyCode);
  }

  // 從中央資料庫查詢公司的連線資訊
  const company = await centralClient.company.findUnique({
    where: { code: companyCode },
  });

  if (!company) {
    throw new Error(`找不到公司代碼: ${companyCode}`);
  }

  if (company.status !== 'ACTIVE') {
    throw new Error(`該公司已被停用: ${companyCode}`);
  }

  const client = createPrismaClient(company.db_url, company.db_token);
  clientCache.set(companyCode, client);
  return client;
}

module.exports = {
  centralClient,
  getCompanyClient,
};
