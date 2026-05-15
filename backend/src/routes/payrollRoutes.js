const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

const { checkPermission } = require('../middlewares/permissionMiddleware');

router.post('/calculate', checkPermission('PAYROLL', 'canEdit'), payrollController.calculatePayroll);
router.post('/finalize', checkPermission('PAYROLL', 'canEdit'), payrollController.finalizePayroll);
router.post('/unfinalize', checkPermission('PAYROLL', 'canEdit'), payrollController.unfinalizePayroll);
router.get('/export', checkPermission('PAYROLL', 'canView'), payrollController.exportPayroll);
router.get('/', checkPermission('PAYROLL', 'canView'), payrollController.getPayrolls);
router.put('/:id/details', checkPermission('PAYROLL', 'canEdit'), payrollController.updatePayrollDetails);
router.put('/:id/read', payrollController.markAsRead);
router.delete('/:id/read', payrollController.unmarkAsRead);

module.exports = router;
