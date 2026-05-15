// 移除全域 prisma

exports.getNotifications = async (req, res) => {
  const { employeeId } = req.query;
  try {
    const notifications = await req.db.notification.findMany({
      where: { employeeId: parseInt(employeeId) },
      orderBy: { created_at: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: '獲取通知失敗' });
  }
};

exports.markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    await req.db.notification.update({
      where: { id: parseInt(id) },
      data: { is_read: true }
    });
    res.json({ message: '已標記為已讀' });
  } catch (error) {
    res.status(500).json({ error: '更新失敗' });
  }
};

exports.markAllAsRead = async (req, res) => {
  const { employeeId } = req.body;
  try {
    await req.db.notification.updateMany({
      where: { employeeId: parseInt(employeeId), is_read: false },
      data: { is_read: true }
    });
    res.json({ message: '全部標記為已讀' });
  } catch (error) {
    res.status(500).json({ error: '更新失敗' });
  }
};
