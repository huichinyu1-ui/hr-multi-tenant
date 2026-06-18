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

const safeStringify = (val) => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

const generateAutoNote = async (db, action, tableName, recordId, originalNote) => {
  if (originalNote) return originalNote;
  if (!db || !recordId) return originalNote;
  try {
    const actStr = action === 'DELETE' ? '刪除' : (action === 'CREATE' ? '新增' : '修改');
    if (tableName === 'Employee' && db.employee) {
      const emp = await db.employee.findUnique({ where: { id: parseInt(recordId) } });
      if (emp) return `${actStr}員工 [${emp.name}] 的資料`;
    } else if (tableName === 'LeaveRequest' && db.leaveRequest) {
      const lr = await db.leaveRequest.findUnique({ where: { id: parseInt(recordId) }, include: { employee: true } });
      if (lr) return `${actStr} [${lr.employee?.name || '未知'}] 的請假單`;
    } else if (tableName === 'OvertimeRequest' && db.overtimeRequest) {
      const ot = await db.overtimeRequest.findUnique({ where: { id: parseInt(recordId) }, include: { employee: true } });
      if (ot) return `${actStr} [${ot.employee?.name || '未知'}] 的加班單`;
    } else if (tableName === 'Attendance' && db.attendance) {
      const att = await db.attendance.findUnique({ where: { id: parseInt(recordId) }, include: { employee: true } });
      if (att) return `${actStr} [${att.employee?.name || '未知'}] ${att.date} 的考勤紀錄`;
    } else if (tableName === 'LeaveQuota' && db.leaveQuota) {
      const q = await db.leaveQuota.findUnique({ where: { id: parseInt(recordId) }, include: { employee: true, leaveType: true } });
      if (q) return `${actStr} [${q.employee?.name || '未知'}] 的 [${q.leaveType?.name || '假別'}] 額度`;
    }
  } catch (e) {
    // 查詢失敗靜默忽略，保留原狀
  }
  return originalNote;
};

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
    let operatorName = '系統';
    if (req.headers['x-user-name']) {
      try {
        operatorName = decodeURIComponent(req.headers['x-user-name']) || '系統';
      } catch (e) {
        operatorName = req.headers['x-user-name'];
      }
    }

    // 若無 AuditLog 資料表（尚未做雲端 Migration），靜默跳過
    if (!db.auditLog) return;

    const finalNote = await generateAutoNote(db, action, tableName, recordId, note);

    await db.auditLog.create({
      data: {
        operatorId,
        operatorName,
        action,
        tableName,
        recordId:  parseInt(recordId) || 0,
        fieldName,
        oldValue:  safeStringify(oldValue),
        newValue:  safeStringify(newValue),
        note: finalNote,
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
    let operatorName = '系統';
    if (req.headers['x-user-name']) {
      try {
        operatorName = decodeURIComponent(req.headers['x-user-name']) || '系統';
      } catch (e) {
        operatorName = req.headers['x-user-name'];
      }
    }

    if (!db.auditLog) return;

    // 只記錄「有變動」的欄位
    const changedFields = Object.keys(newData).filter(
      key => safeStringify(oldData[key]) !== safeStringify(newData[key])
    );

    if (changedFields.length === 0) return;

    const finalNote = await generateAutoNote(db, action, tableName, recordId, note);

    // 將有變動的欄位打包成一個 JSON 物件
    const oldValuesObj = {};
    const newValuesObj = {};
    changedFields.forEach(field => {
      oldValuesObj[field] = safeStringify(oldData[field]);
      newValuesObj[field] = safeStringify(newData[field]);
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
        note: finalNote,
      }
    });
  } catch (err) {
    console.warn('[AuditService] 批次寫入日誌失敗（靜默忽略）：', err.message);
  }
};
