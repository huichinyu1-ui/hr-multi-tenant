const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');

router.post('/login', superAdminController.login);
router.get('/companies', superAdminController.getCompanies);
router.post('/companies', superAdminController.createCompany);
router.get('/companies/:code/export', superAdminController.exportCompany);
router.post('/companies/:code/import', superAdminController.importCompany);
router.get('/companies/:code/impersonate', superAdminController.impersonateCompany);
router.post('/companies/create-admin', superAdminController.createAdmin);
router.delete('/companies/:code', superAdminController.deleteCompany);

module.exports = router;
