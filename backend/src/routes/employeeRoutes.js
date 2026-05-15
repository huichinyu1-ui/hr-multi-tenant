const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.get('/', checkPermission('EMP', 'canView'), employeeController.getAllEmployees);
router.get('/:id', checkPermission('EMP', 'canView'), employeeController.getEmployeeById);
router.post('/', checkPermission('EMP', 'canCreate'), employeeController.createEmployee);
router.put('/:id', checkPermission('EMP', 'canEdit'), employeeController.updateEmployee);
router.delete('/:id', checkPermission('EMP', 'canDelete'), employeeController.deleteEmployee);
router.post('/login', employeeController.login);
router.post('/change-password', employeeController.changePassword);

module.exports = router;
