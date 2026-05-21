/**
 * auditController.js
 * 系統操作日誌 API Controller
 */

// 取得操作日誌列表（支援分頁，預設最新 50 筆）
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, tableName, operatorId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (tableName)  where.tableName  = tableName;
    if (operatorId) where.operatorId = parseInt(operatorId);

    // 使用 raw SQL 以相容舊版雲端 DB（AuditLog 表可能尚未存在）
    const logs = await req.db.$queryRawUnsafe(`
      SELECT * FROM "AuditLog"
      ${tableName  ? `WHERE tableName = '${tableName}'`  : ''}
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${skip}
    `).catch(() => []);

    const total = await req.db.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "AuditLog"
    `).then(r => Number(r[0]?.count || 0)).catch(() => 0);

    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('[Audit] getAuditLogs error:', error);
    res.status(500).json({ error: '獲取操作日誌失敗' });
  }
};

// 一鍵還原指定的操作日誌（高危功能，需 AUDIT canEdit 權限）
exports.revertAuditLog = async (req, res) => {
  const { id } = req.params;
  const operatorId   = parseInt(req.headers['x-user-id'])   || 0;
  const operatorName = req.headers['x-user-name']            || '系統';

  try {
    // 查詢該筆日誌
    const logs = await req.db.$queryRawUnsafe(
      `SELECT * FROM "AuditLog" WHERE id = ?`, parseInt(id)
    ).catch(() => []);

    const log = logs[0];
    if (!log) return res.status(404).json({ error: '找不到此操作日誌' });
    if (log.action === 'DELETE') return res.status(400).json({ error: '刪除操作無法自動還原，請手動重建資料' });

    // 動態還原：將 recordId 對應的資料，還原欄位值為 oldValue
    const tableMap = {
      LeaveQuota:  req.db.leaveQuota,
      Employee:    req.db.employee,
      DailyRecord: req.db.dailyRecord,
      PayrollItem: req.db.payrollItem,
      LeaveType:   req.db.leaveType
    };

    const model = tableMap[log.tableName];
    if (!model) return res.status(400).json({ error: `資料表 "${log.tableName}" 目前不支援自動還原` });

    // 轉換回正確的型別
    const numericFields = [
      'total_hours', 'annual_hours', 'carried_over_hours', 'base_salary', 'insurance_salary',
      'full_attendance_bonus', 'production_bonus', 'performance_bonus', 'meal_allowance', 'festival_bonus',
      'health_dependents', 'pension_rate', 'custom_1', 'custom_2', 'custom_3', 'custom_4', 'custom_5', 'custom_6',
      'deduction_ratio', 'default_days', 'carry_over_expiry_months', 'default_amount', 'sort_order'
    ];
    
    const booleanFields = [
      'is_paid', 'is_all_employees', 'is_carry_over_enabled', 'is_active', 'is_global'
    ];

    const updateData = {};
    
    if (log.fieldName === 'MULTIPLE_FIELDS') {
      try {
        const parsedOldValues = JSON.parse(log.oldValue);
        for (const [key, value] of Object.entries(parsedOldValues)) {
          if (numericFields.includes(key)) {
            updateData[key] = value === 'null' ? null : (parseFloat(value) || 0);
          } else if (booleanFields.includes(key)) {
            updateData[key] = (value === 'true');
          } else if (value === 'null') {
            updateData[key] = null;
          } else {
            updateData[key] = value;
          }
        }
      } catch (e) {
        return res.status(400).json({ error: '無法解析日誌的多欄位資料，還原失敗' });
      }
    } else {
      // 舊版單一欄位還原相容
      let revertValue = log.oldValue;
      if (numericFields.includes(log.fieldName)) {
        revertValue = log.oldValue === 'null' ? null : (parseFloat(log.oldValue) || 0);
      } else if (booleanFields.includes(log.fieldName)) {
        revertValue = (log.oldValue === 'true');
      } else if (log.oldValue === 'null') {
        revertValue = null;
      }
      updateData[log.fieldName] = revertValue;
    }

    await model.update({
      where: { id: parseInt(log.recordId) },
      data:  updateData
    });

    // 寫入「還原操作」的日誌，確保完整稽核鏈
    await req.db.auditLog.create({
      data: {
        operatorId,
        operatorName,
        action:    'UPDATE',
        tableName: log.tableName,
        recordId:  parseInt(log.recordId),
        fieldName: log.fieldName,
        oldValue:  log.newValue,
        newValue:  log.oldValue,
        note:      `系統還原：由 ${operatorName} 執行，還原日誌 ID #${log.id}`,
      }
    });

    res.json({ message: `✅ 已成功還原：${log.tableName} #${log.recordId} 的 ${log.fieldName} 從 ${log.newValue} 改回 ${log.oldValue}` });
  } catch (error) {
    console.error('[Audit] revertAuditLog error:', error);
    res.status(500).json({ error: '還原操作失敗：' + error.message });
  }
};

// 批次刪除操作日誌（需 AUDIT canDelete 權限）
exports.deleteAuditLogs = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '請提供要刪除的日誌 IDs' });
    }

    const deleteIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    
    // 使用 queryRawUnsafe 來相容舊版
    if (deleteIds.length > 0) {
      await req.db.$executeRawUnsafe(
        `DELETE FROM "AuditLog" WHERE id IN (${deleteIds.join(',')})`
      );
    }
    
    res.json({ message: `成功刪除 ${deleteIds.length} 筆日誌紀錄` });
  } catch (error) {
    console.error('[Audit] deleteAuditLogs error:', error);
    res.status(500).json({ error: '刪除操作日誌失敗' });
  }
};
