const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');

const { checkPermission } = require('../middlewares/permissionMiddleware');

router.get('/types', leaveController.getLeaveTypes);
router.post('/types', checkPermission('LEAVE_TYPE', 'canEdit'), leaveController.createLeaveType);
router.put('/types/:id', checkPermission('LEAVE_TYPE', 'canEdit'), leaveController.updateLeaveType);
router.delete('/types/:id', checkPermission('LEAVE_TYPE', 'canDelete'), leaveController.deleteLeaveType);

router.get('/requests', checkPermission('LEAVE', 'canView'), leaveController.getLeaveRequests);
router.post('/requests', leaveController.createLeaveRequest);
router.put('/requests/:id/status', checkPermission('LEAVE', 'canApprove'), leaveController.updateLeaveRequestStatus);
router.delete('/requests/batch', checkPermission('LEAVE', 'canDelete'), leaveController.batchDeleteLeaveRequests);
router.delete('/requests/:id', leaveController.deleteLeaveRequest);

// Quotas
router.get('/quotas', leaveController.getLeaveQuotas);
router.get('/export', checkPermission('LEAVE', 'canView'), leaveController.exportLeaves);
router.post('/quotas/batch', checkPermission('LEAVE', 'canEdit'), leaveController.batchUpdateQuotas);
router.post('/quotas/auto', checkPermission('LEAVE', 'canEdit'), leaveController.autoCalculateQuotas);
router.post('/quotas', checkPermission('LEAVE', 'canEdit'), leaveController.updateLeaveQuota);

module.exports = router;
