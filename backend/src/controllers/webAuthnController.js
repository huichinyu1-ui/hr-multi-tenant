const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

// 網站來源設定 (需與 Vercel 部署網址或本機網址一致)
const getRelyingPartyConfig = (req) => {
  let origin = req?.headers?.origin;
  if (!origin) {
    origin = process.env.FRONTEND_ORIGIN || 'https://hr.tqsystem.com.tw';
  }
  const rpID = new URL(origin).hostname;
  return { rpID, origin, rpName: '人事薪資系統' };
};

// 暫存挑戰碼 (生產環境應使用 Redis，開發環境記憶體暫存即可)
const challengeStore = new Map();

// ─── 1. 開始綁定設備 (Registration Start) ───────────────────────────────────
exports.registrationStart = async (req, res) => {
  try {
    const { rpID, rpName } = getRelyingPartyConfig(req);
    const employeeId = parseInt(req.headers['x-user-id']);
    const employee = await req.db.employee.findUnique({
      where: { id: employeeId },
      include: { webAuthnCredentials: true }
    });

    if (!employee) return res.status(404).json({ error: '找不到員工資料' });

    const existingCredentials = employee.webAuthnCredentials.map(c => ({
      id: c.credentialId,
      type: 'public-key',
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(String(employee.id)), // Uint8Array is required for userID in older/some versions, Buffer is Uint8Array
      userName: employee.username || employee.code,
      userDisplayName: employee.name,
      excludeCredentials: existingCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // 暫存挑戰碼 (5分鐘有效)
    challengeStore.set(`reg_${employee.id}`, {
      challenge: options.challenge,
      expires: Date.now() + 5 * 60 * 1000
    });

    res.json(options);
  } catch (err) {
    console.error('[WebAuthn] registrationStart error:', err);
    res.status(500).json({ error: '無法產生綁定選項' });
  }
};

// ─── 2. 完成綁定設備 (Registration Finish) ──────────────────────────────────
exports.registrationFinish = async (req, res) => {
  try {
    const { rpID, origin } = getRelyingPartyConfig(req);
    const { response, deviceName } = req.body;
    const employeeId = parseInt(req.headers['x-user-id']);

    const stored = challengeStore.get(`reg_${employeeId}`);
    if (!stored || Date.now() > stored.expires) {
      return res.status(400).json({ error: '挑戰碼已過期，請重試' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return res.status(400).json({ error: '設備驗證失敗' });
    }

    const { credential } = verification.registrationInfo;

    await req.db.webAuthnCredential.create({
      data: {
        employeeId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        deviceName: deviceName || '我的設備',
      }
    });

    challengeStore.delete(`reg_${employeeId}`);
    res.json({ success: true, message: '設備綁定成功！' });
  } catch (err) {
    console.error('[WebAuthn] registrationFinish error:', err);
    res.status(500).json({ error: '設備綁定失敗' });
  }
};

// ─── 3. 開始生物辨識登入 (Authentication Start) ────────────────────────────
exports.authenticationStart = async (req, res) => {
  try {
    const { rpID } = getRelyingPartyConfig(req);
    const { username, companyCode } = req.body;

    let allowCredentials;

    // 如果使用者有填帳號公司，我們就針對性地帶入憑證 (向後相容舊設備)
    if (username && companyCode) {
      const { getCompanyClient } = require('../db_manager');
      const db = await getCompanyClient(companyCode);
      const employee = await db.employee.findFirst({
        where: { username },
        include: { webAuthnCredentials: true }
      });
      if (employee && employee.webAuthnCredentials.length > 0) {
        allowCredentials = employee.webAuthnCredentials.map(c => ({
          id: c.credentialId,
          type: 'public-key',
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    challengeStore.set(options.challenge, {
      challenge: options.challenge,
      expires: Date.now() + 5 * 60 * 1000,
    });

    res.json(options);
  } catch (err) {
    console.error('[WebAuthn] authenticationStart error:', err);
    res.status(500).json({ error: '無法產生登入選項' });
  }
};

// ─── 4. 完成生物辨識登入 (Authentication Finish) ───────────────────────────
exports.authenticationFinish = async (req, res) => {
  try {
    const { rpID, origin } = getRelyingPartyConfig(req);
    const { response, challenge } = req.body;

    const stored = challengeStore.get(challenge);
    if (!stored || Date.now() > stored.expires) {
      return res.status(400).json({ error: '挑戰碼已過期，請重試' });
    }

    const credentialIdB64 = response.id;
    
    // 多租戶全域搜尋憑證：因為不知道使用者屬於哪個租戶，我們遍歷所有租戶資料庫
    const { getCompanyClient } = require('../db_manager');
    const { PrismaClient } = require('@prisma/client');
    const { createClient } = require('@libsql/client');
    const { PrismaLibSQL } = require('@prisma/adapter-libsql');

    const c = createClient({
      url: process.env.CENTRAL_DATABASE_URL,
      authToken: process.env.CENTRAL_AUTH_TOKEN
    });
    const central = new PrismaClient({ adapter: new PrismaLibSQL(c) });
    const companies = await central.company.findMany({ where: { status: 'ACTIVE' } });
    await central.$disconnect();

    let foundCredential = null;
    let foundCompany = null;
    let tenantDb = null;

    for (const co of companies) {
      try {
        const db = await getCompanyClient(co.code);
        const cred = await db.webAuthnCredential.findUnique({
          where: { credentialId: credentialIdB64 }
        });
        if (cred) {
          foundCredential = cred;
          foundCompany = co;
          tenantDb = db;
          break;
        }
      } catch(e) {}
    }

    if (!foundCredential) return res.status(404).json({ error: '找不到此設備憑證，可能已經被刪除或未綁定' });

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: stored.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: foundCredential.credentialId,
        publicKey: Buffer.from(foundCredential.publicKey, 'base64url'),
        counter: foundCredential.counter,
      },
      requireUserVerification: false,
    });

    if (!verification.verified) {
      return res.status(401).json({ error: '生物辨識驗證失敗' });
    }

    // 更新計數器（防重放攻擊）
    await tenantDb.webAuthnCredential.update({
      where: { id: foundCredential.id },
      data: { counter: verification.authenticationInfo.newCounter }
    });

    challengeStore.delete(challenge);

    // 找員工並產生 session
    const employee = await tenantDb.employee.findUnique({
      where: { id: foundCredential.employeeId },
      include: { roleRef: { include: { permissions: true } } }
    });

    const { getEmployeePermissions } = require('../controllers/roleController');
    const permissions = await getEmployeePermissions(tenantDb, employee);
    const { password: _, ...userWithoutPassword } = employee;

    res.json({
      success: true,
      companyCode: foundCompany.code,
      companyName: foundCompany.name,
      user: userWithoutPassword,
      permissions
    });
  } catch (err) {
    console.error('[WebAuthn] authenticationFinish error:', err);
    res.status(500).json({ error: '生物辨識登入失敗' });
  }
};

// ─── 5. 取得已綁定的設備清單 ────────────────────────────────────────────────
exports.getCredentials = async (req, res) => {
  try {
    const employeeId = parseInt(req.headers['x-user-id']);
    const credentials = await req.db.webAuthnCredential.findMany({
      where: { employeeId },
      select: { id: true, deviceName: true, createdAt: true }
    });
    res.json(credentials);
  } catch (err) {
    res.status(500).json({ error: '無法取得設備清單' });
  }
};

// ─── 6. 移除已綁定設備 ──────────────────────────────────────────────────────
exports.deleteCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const credential = await req.db.webAuthnCredential.findUnique({
      where: { id: parseInt(id) }
    });
    const currentUserId = parseInt(req.headers['x-user-id']);
    if (!credential || credential.employeeId !== currentUserId) {
      return res.status(403).json({ error: '無權限刪除此設備' });
    }
    await req.db.webAuthnCredential.delete({ where: { id: parseInt(id) } });
    res.json({ success: true, message: '設備已移除' });
  } catch (err) {
    res.status(500).json({ error: '無法移除設備' });
  }
};
