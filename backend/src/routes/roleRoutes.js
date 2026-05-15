const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { requireAuth, checkPermission } = require('../middlewares/permissionMiddleware');

// 模組清單（所有人可取得，供前端渲染）
router.get('/modules', roleController.getModules);

// 以下路由由動態權限控管
router.get('/', checkPermission('EMP', 'canManageRole'), roleController.getRoles);
router.post('/', checkPermission('EMP', 'canManageRole'), roleController.createRole);
router.put('/:id', checkPermission('EMP', 'canManageRole'), roleController.updateRole);
router.delete('/:id', checkPermission('EMP', 'canManageRole'), roleController.deleteRole);
router.put('/:id/permissions', checkPermission('EMP', 'canManageRole'), roleController.updatePermissions);

module.exports = router;
