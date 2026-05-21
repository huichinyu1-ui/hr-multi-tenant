const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { checkPermission } = require('../middlewares/permissionMiddleware');

// 查看操作日誌（需要 AUDIT canView 權限）
router.get('/', checkPermission('AUDIT', 'canView'), auditController.getAuditLogs);

// 一鍵還原操作（需要 AUDIT canEdit 權限 — 高危）
router.post('/:id/revert', checkPermission('AUDIT', 'canEdit'), auditController.revertAuditLog);

// 刪除操作日誌（需要 AUDIT canDelete 權限）
router.post('/batch-delete', checkPermission('AUDIT', 'canDelete'), auditController.deleteAuditLogs);

module.exports = router;
