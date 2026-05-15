const express = require('express');
const router = express.Router();
const multer = require('multer');
const attendanceController = require('../controllers/attendanceController');

const { checkPermission } = require('../middlewares/permissionMiddleware');

// 使用記憶體儲存上傳的檔案
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', checkPermission('ATT', 'canImport'), upload.single('file'), attendanceController.uploadExcel);
router.get('/summary', checkPermission('ATT', 'canView'), attendanceController.getSummary);
router.get('/export', checkPermission('ATT', 'canView'), attendanceController.exportAttendanceSummary);
router.post('/match', checkPermission('ATT', 'canEdit'), attendanceController.runMatching);
router.get('/today-record', attendanceController.getTodayRecord);
router.post('/punch', checkPermission('ATT', 'canPunch'), attendanceController.punch);
router.get('/', checkPermission('ATT', 'canView'), attendanceController.getAttendances);
router.put('/:id', checkPermission('ATT', 'canEdit'), attendanceController.updateDailyRecord);
router.delete('/batch', checkPermission('ATT', 'canDelete'), attendanceController.batchDeleteAttendances);

module.exports = router;
