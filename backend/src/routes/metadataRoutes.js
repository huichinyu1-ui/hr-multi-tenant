const express = require('express');
const router = express.Router();
const metadataController = require('../controllers/metadataController');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.get('/', metadataController.getAllMetadata);
router.put('/batch-update', checkPermission('SETTINGS', 'canManageSettings'), metadataController.batchUpdateMetadata);
router.post('/', checkPermission('EMP', 'canManageMetadata'), metadataController.createMetadata);
router.put('/:id', checkPermission('EMP', 'canManageMetadata'), metadataController.updateMetadata);
router.delete('/:id', checkPermission('EMP', 'canManageMetadata'), metadataController.deleteMetadata);

module.exports = router;
