// 移除全域 prisma

exports.createRequest = async (req, res) => {
  const { employeeId, date, punch_type, target_time, reason } = req.body;
  try {
    const request = await req.db.missedPunchRequest.create({
      data: {
        employeeId: parseInt(employeeId),
        date,
        punch_type,
        target_time,
        reason,
        status: 'PENDING'
      }
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: '提交申請失敗' });
  }
};

exports.getRequests = async (req, res) => {
  const { employeeId, status } = req.query;
  try {
    if (!req.db) return res.status(500).json({ error: 'DB 連線未初始化，請確認 x-company-code 標頭是否正確傳送' });
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId);
    if (status) where.status = status;

    // 使用 raw SQL 避免孤立資料 (員工已刪除但申請紀錄還在) 導致 Prisma 報錯
    let sql = `SELECT mp.*, e.name as employee_name, e.code as employee_code
               FROM "MissedPunchRequest" mp
               LEFT JOIN "Employee" e ON mp.employeeId = e.id`;
    const params = [];
    const conditions = [];
    if (employeeId) { conditions.push(`mp.employeeId = ?`); params.push(parseInt(employeeId)); }
    if (status) { conditions.push(`mp.status = ?`); params.push(status); }
    if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ` ORDER BY mp.created_at DESC`;

    const rows = await req.db.$queryRawUnsafe(sql, ...params);
    // 整理成前端期望的格式
    const requests = rows.map(r => ({
      id: Number(r.id),
      employeeId: Number(r.employeeId),
      date: r.date,
      punch_type: r.punch_type,
      target_time: r.target_time,
      reason: r.reason,
      status: r.status,
      created_at: r.created_at,
      employee: r.employee_name ? { name: r.employee_name, code: r.employee_code } : null
    }));
    res.json(requests);
  } catch (error) {
    console.error('[MissedPunch] getRequests error:', error.message);
    res.status(500).json({ error: '獲取申請失敗', details: error.message });
  }
};

exports.approveRequest = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // APPROVED or REJECTED
  try {
    const request = await req.db.missedPunchRequest.update({
      where: { id: parseInt(id) },
      data: { status },
      include: { employee: true }
    });

    if (status === 'APPROVED') {
      const { employeeId, date, punch_type, target_time } = request;
      const is_in = punch_type === 'IN';
      
      try {
        // 使用更穩定的 upsert 結構
        await req.db.dailyRecord.upsert({
          where: { employeeId_date: { employeeId, date } },
          update: {
            [is_in ? 'clock_in' : 'clock_out']: target_time
          },
          create: {
            employeeId,
            date,
            clock_in: is_in ? target_time : null,
            clock_out: is_in ? null : target_time,
            status: 'PRESENT'
          }
        });

        // 啟動考勤重新計算 (不阻塞主流程，增加錯誤捕捉)
        const AttendanceMatcher = require('../services/AttendanceMatcher');
        AttendanceMatcher.matchAttendance(date.substring(0, 7)).catch(e => {
          console.error('[MissedPunch] Async Matcher Error:', e);
        });
        
      } catch (dbError) {
        console.error('[MissedPunch] DB Update Error:', dbError);
        return res.status(500).json({ error: '更新打卡紀錄失敗' });
      }
    }

    // 建立通知
    const statusMap = { 'PENDING': '待審核', 'APPROVED': '核准', 'REJECTED': '未核准' };
    await req.db.notification.create({
      data: {
        employeeId: request.employeeId,
        title: '補打卡申請審核結果',
        message: `您在 ${request.date} 的補打卡申請已被標記為: ${statusMap[status] || status}`
      }
    });

    res.json(request);
  } catch (error) {
    console.error('[FATAL ERROR]', error);
    res.status(500).json({ 
      error: '審核操作失敗', 
      details: error.message,
      stack: error.stack 
    });
  }
};

exports.deleteRequest = async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers['x-user-role'];
  const userId = req.headers['x-user-id'];

  try {
    const target = await req.db.missedPunchRequest.findUnique({ where: { id: parseInt(id) } });
    if (!target) return res.status(404).json({ error: '找不到該申請紀錄' });

    // 權限檢查
    if (userRole !== 'ADMIN' && userRole !== 'COLLABORATOR') {
      if (target.employeeId !== parseInt(userId)) {
        return res.status(403).json({ error: '您沒有權限刪除此申請' });
      }
      if (target.status !== 'PENDING') {
        return res.status(403).json({ error: '已簽核的申請無法撤回，請洽管理員' });
      }
    }

    await req.db.missedPunchRequest.delete({ where: { id: parseInt(id) } });
    res.json({ message: '刪除成功' });
  } catch (error) {
    res.status(500).json({ error: '刪除失敗' });
  }
};
