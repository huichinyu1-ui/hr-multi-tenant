exports.getRequests = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const { getSelfOnlyId } = require('../middlewares/permissionMiddleware');
    const selfOnlyId = getSelfOnlyId(req, 'LEAVE'); 
    
    const where = {};
    if (selfOnlyId) where.employeeId = selfOnlyId;
    if (start_date && end_date) {
      where.date = { gte: start_date, lte: end_date };
    }

    const requests = await req.db.overtimeRequest.findMany({
      where,
      include: { employee: true },
      orderBy: [{ date: 'desc' }]
    });
    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '獲取加班單失敗' });
  }
};

exports.createRequest = async (req, res) => {
  try {
    const { employeeId, date, start_time, end_time, reason } = req.body;
    if (!employeeId || !date || !start_time || !end_time) {
      return res.status(400).json({ error: '欄位不完整' });
    }

    const request = await req.db.overtimeRequest.create({
      data: { employeeId: parseInt(employeeId), date, start_time, end_time, reason }
    });
    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '申請失敗' });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const request = await req.db.overtimeRequest.update({
      where: { id: parseInt(id) },
      data: { status },
      include: { employee: true }
    });

    // 建立通知
    const statusMap = { 'PENDING': '待審核', 'APPROVED': '核准', 'REJECTED': '未核准' };
    await req.db.notification.create({
      data: {
        employeeId: request.employeeId,
        title: '加班申請狀態更新',
        message: `您的加班申請 (${request.date} ${request.start_time} ~ ${request.end_time}) 已被標記為: ${statusMap[status] || status}`
      }
    });

    res.json(request);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '更新狀態失敗' });
  }
};

exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;
    await req.db.overtimeRequest.delete({ where: { id: parseInt(id) } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '刪除失敗' });
  }
};
