const express = require('express');
const router = express.Router();
const shiftController = require('../controllers/shiftController');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.get('/', checkPermission('SHIFT', 'canView'), shiftController.getAllShifts);
router.post('/', checkPermission('SHIFT', 'canCreate'), shiftController.createShift);
router.put('/:id', checkPermission('SHIFT', 'canEdit'), shiftController.updateShift);
router.delete('/:id', checkPermission('SHIFT', 'canDelete'), shiftController.deleteShift);

module.exports = router;
