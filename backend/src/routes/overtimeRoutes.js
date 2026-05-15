const express = require('express');
const router = express.Router();
const overtimeController = require('../controllers/overtimeController');

const { checkPermission } = require('../middlewares/permissionMiddleware');

// 由於「請假/加班」共用同一個側邊欄項目，我們在此使用 LEAVE 權限來控制加班單
router.get('/', checkPermission('LEAVE', 'canView'), overtimeController.getRequests);
router.post('/', checkPermission('LEAVE', 'canCreate'), overtimeController.createRequest);
router.put('/:id/status', checkPermission('LEAVE', 'canApprove'), overtimeController.updateStatus);
router.delete('/:id', checkPermission('LEAVE', 'canDelete'), overtimeController.deleteRequest);

module.exports = router;
