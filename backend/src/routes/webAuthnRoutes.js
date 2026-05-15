const express = require('express');
const router = express.Router();
const webAuthnController = require('../controllers/webAuthnController');

// 登入流程 (未登入狀態，需傳 x-company-code)
router.post('/login/start', webAuthnController.authenticationStart);
router.post('/login/finish', webAuthnController.authenticationFinish);

// 設備管理 (需登入後使用，需傳 x-user-id)
router.post('/register/start', webAuthnController.registrationStart);
router.post('/register/finish', webAuthnController.registrationFinish);
router.get('/credentials', webAuthnController.getCredentials);
router.delete('/credentials/:id', webAuthnController.deleteCredential);

module.exports = router;
