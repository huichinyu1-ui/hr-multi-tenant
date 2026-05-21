// 移除全域 prisma

// 自動清理門檻設定（天數）
const CLEANUP_READ_DAYS = 30;    // 已讀通知保留天數
const CLEANUP_UNREAD_DAYS = 90;  // 未讀通知保留天數（避免太舊的通知永遠佔用空間）

/**
 * 清理過期通知（附帶執行，不影響主要 API 回應速度）
 * - 已讀且超過 30 天 → 刪除
 * - 未讀且超過 90 天 → 刪除
 */
const cleanupOldNotifications = async (db, employeeId) => {
  try {
    const readCutoff = new Date();
    readCutoff.setDate(readCutoff.getDate() - CLEANUP_READ_DAYS);

    const unreadCutoff = new Date();
    unreadCutoff.setDate(unreadCutoff.getDate() - CLEANUP_UNREAD_DAYS);

    await db.notification.deleteMany({
      where: {
        employeeId: parseInt(employeeId),
        OR: [
          { is_read: true,  created_at: { lt: readCutoff } },
          { is_read: false, created_at: { lt: unreadCutoff } }
        ]
      }
    });
  } catch (e) {
    // 清理失敗不影響主流程，僅靜默記錄
    console.warn('[Notification Cleanup] 清理失敗：', e.message);
  }
};

exports.getNotifications = async (req, res) => {
  const { employeeId } = req.query;
  try {
    // 非同步清理過期通知（不 await，不阻塞主要查詢速度）
    cleanupOldNotifications(req.db, employeeId);

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
