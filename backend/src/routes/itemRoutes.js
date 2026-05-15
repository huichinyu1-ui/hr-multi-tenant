const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.get('/', checkPermission('FORMULA', 'canView'), itemController.getAllItems);
router.post('/', checkPermission('FORMULA', 'canCreate'), itemController.createItem);
router.put('/:id', checkPermission('FORMULA', 'canEdit'), itemController.updateItem);
router.delete('/:id', checkPermission('FORMULA', 'canDelete'), itemController.deleteItem);

module.exports = router;
