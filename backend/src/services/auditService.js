/**
 * auditService.js
 * 系統操作日誌服務 (Audit Log Service)
 *
 * 使用方式（在任何 Controller 中）：
 *   const { writeAuditLog } = require('../services/auditService');
 *   await writeAuditLog(req.db, req, 'UPDATE', 'LeaveQuota', quotaId, 'total_hours', oldVal, newVal);
 *
 * 注意：此服務採「靜默失敗」設計，寫入日誌失敗不會影響主業務邏輯。
 */

/**
 * 寫入一筆操作日誌
 * @param {object} db         - req.db (租戶資料庫連線)
 * @param {object} req        - Express request (讀取操作人資訊)
 * @param {string} action     - 操作類型: 'UPDATE' | 'CREATE' | 'DELETE'
 * @param {string} tableName  - 資料表名稱 (例如 'LeaveQuota', 'Employee')
 * @param {number} recordId   - 被異動的資料筆 ID
 * @param {string} fieldName  - 被異動的欄位 (例如 'total_hours', 'base_salary')
 * @param {*}      oldValue   - 異動前的值
 * @param {*}      newValue   - 異動後的值
 * @param {string} [note]     - 可選備註說明
 */
exports.writeAuditLog = async (db, req, action, tableName, recordId, fieldName, oldValue, newValue, note = null) => {
  try {
    const operatorId   = parseInt(req.headers['x-user-id'])   || 0;
    const operatorName = req.headers['x-user-name']            || '系統';

    // 若無 AuditLog 資料表（尚未做雲端 Migration），靜默跳過
    if (!db.auditLog) return;

    await db.auditLog.create({
      data: {
        operatorId,
        operatorName,
        action,
        tableName,
        recordId:  parseInt(recordId) || 0,
        fieldName,
        oldValue:  String(oldValue ?? ''),
        newValue:  String(newValue ?? ''),
        note,
      }
    });
  } catch (err) {
    // 靜默失敗：日誌寫入失敗不可影響主業務
    console.warn('[AuditService] 寫入日誌失敗（靜默忽略）：', err.message);
  }
};

/**
 * 批次寫入多個欄位的異動日誌（適合一次修改多個欄位時使用）
 * @param {object} db
 * @param {object} req
 * @param {string} action
 * @param {string} tableName
 * @param {number} recordId
 * @param {object} oldData   - { field1: oldVal1, field2: oldVal2, ... }
 * @param {object} newData   - { field1: newVal1, field2: newVal2, ... }
 * @param {string} [note]
 */
exports.writeAuditLogBatch = async (db, req, action, tableName, recordId, oldData, newData, note = null) => {
  try {
    const operatorId   = parseInt(req.headers['x-user-id'])   || 0;
    const operatorName = req.headers['x-user-name']            || '系統';

    if (!db.auditLog) return;

    // 只記錄「有變動」的欄位
    const changedFields = Object.keys(newData).filter(
      key => String(oldData[key] ?? '') !== String(newData[key] ?? '')
    );

    if (changedFields.length === 0) return;

    // 將有變動的欄位打包成一個 JSON 物件
    const oldValuesObj = {};
    const newValuesObj = {};
    changedFields.forEach(field => {
      oldValuesObj[field] = String(oldData[field] ?? '');
      newValuesObj[field] = String(newData[field] ?? '');
    });

    await db.auditLog.create({
      data: {
        operatorId,
        operatorName,
        action,
        tableName,
        recordId:  parseInt(recordId) || 0,
        fieldName: 'MULTIPLE_FIELDS',
        oldValue:  JSON.stringify(oldValuesObj),
        newValue:  JSON.stringify(newValuesObj),
        note,
      }
    });
  } catch (err) {
    console.warn('[AuditService] 批次寫入日誌失敗（靜默忽略）：', err.message);
  }
};
