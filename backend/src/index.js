const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// 明確設定 CORS，處理所有來源（包括自訂標頭的 Preflight OPTIONS 請求）
const corsOptions = {
  origin: '*',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 'Authorization',
    'x-user-id', 'x-user-role', 'x-company-code', 'x-user-name',
    'X-Requested-With', 'Accept'
  ],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use(express.json());


// --- 超級管理員路由 (無須多租戶切換) ---
const superAdminRoutes = require('./routes/superAdminRoutes');
app.use('/api/super-admin', superAdminRoutes);

// 多租戶中間件
const tenantMiddleware = require('./middlewares/tenantMiddleware');
app.use(tenantMiddleware);

// 路由匯入
const employeeRoutes = require('./routes/employeeRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const itemRoutes = require('./routes/itemRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const shiftRoutes = require('./routes/shiftRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const missedPunchRoutes = require('./routes/missedPunchRoutes');
const metadataRoutes = require('./routes/metadataRoutes');
const roleRoutes = require('./routes/roleRoutes');
const overtimeRoutes = require('./routes/overtimeRoutes');
const insuranceRoutes = require('./routes/insuranceRoutes');
const insuranceVersionRoutes = require('./routes/insuranceVersionRoutes');
const webAuthnRoutes = require('./routes/webAuthnRoutes');
const auditRoutes = require('./routes/auditRoutes');

// 路由設定
app.use('/api/employees', employeeRoutes);
app.use('/api/payrolls', payrollRoutes);
app.use('/api/attendances', attendanceRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/missed-punches', missedPunchRoutes);
app.use('/api/metadata', metadataRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/insurance', insuranceRoutes);
app.use('/api/insurance-versions', insuranceVersionRoutes);
app.use('/api/webauthn', webAuthnRoutes);
app.use('/api/audit-logs', auditRoutes);

// 基本檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// 一次性資料庫遷移端點（供 HR 管理員初始化新欄位使用）
app.post('/api/migrate-db', async (req, res) => {
  const companyCode = req.headers['x-company-code'];
  if (!companyCode) return res.status(400).json({ error: '未提供公司代碼' });
  try {
    const { getCompanyClient } = require('./db_manager');
    const db = await getCompanyClient(companyCode);
    const migrations = [
      `ALTER TABLE "LeaveQuota" ADD COLUMN "valid_from" TEXT`,
      `ALTER TABLE "LeaveQuota" ADD COLUMN "valid_to" TEXT`,
      `ALTER TABLE "LeaveQuota" ADD COLUMN "carry_over_valid_from" TEXT`,
      `ALTER TABLE "LeaveQuota" ADD COLUMN "carry_over_valid_to" TEXT`,
      `ALTER TABLE "LeaveType" ADD COLUMN "calculation_mode" TEXT DEFAULT 'CALENDAR'`,
    ];
    const results = [];
    for (const sql of migrations) {
      try {
        await db.$executeRawUnsafe(sql);
        results.push({ sql: sql.split('ADD COLUMN')[1]?.trim(), status: 'ok' });
      } catch(e) {
        results.push({ sql: sql.split('ADD COLUMN')[1]?.trim(), status: e.message.includes('duplicate') ? 'already_exists' : 'error', msg: e.message });
      }
    }
    res.json({ message: '遷移完成', results });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


app.get('/', (req, res) => {
  res.send('Payroll API is running (Multi-Tenant Edition)');
});

// 種入系統預設角色（每次啟動時確保存在）
const { seedSystemRoles } = require('./controllers/roleController');
if (process.env.DATABASE_URL) {
  try {
    const { PrismaClient } = require('@prisma/client');
    const localDb = new PrismaClient();
    seedSystemRoles(localDb)
      .then(() => localDb.$disconnect())
      .catch(e => console.error('[RBAC seed error]', e));
  } catch(e) {
    console.error('[RBAC seed init error]', e);
  }
}

// 匯出 app 供 Vercel 使用
module.exports = app;

// 僅在本地執行時啟動伺服器
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
