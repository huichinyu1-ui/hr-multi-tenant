const express = require('express');
const router = express.Router();
const insuranceController = require('../controllers/insuranceController');
const policyController = require('../controllers/insurancePolicyController');

// 方案管理 (Policies) - 必須放在前面，否則會被 /:type/:grade 攔截
router.get('/policies', policyController.getInsurancePolicies);
router.post('/policies', policyController.createInsurancePolicy);
router.put('/policies/:id', policyController.updateInsurancePolicy);
router.delete('/policies/:id', policyController.deleteInsurancePolicy);
router.post('/policies/assign', policyController.assignPolicyToEmployees);

// 級距管理 (Grades)
router.get('/', insuranceController.getAllGrades);
router.post('/batch', insuranceController.updateGrades);
router.post('/global-adjust', insuranceController.globalAdjust);
router.get('/presets', insuranceController.getPresets);
router.post('/import-preset', insuranceController.importPreset);
router.delete('/:type/:grade', insuranceController.deleteGrade);

module.exports = router;

