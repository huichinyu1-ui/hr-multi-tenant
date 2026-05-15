const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/insuranceVersionController');

// 記憶體存儲（不寫入磁碟，直接解析 buffer）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 上限
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('spreadsheet') || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('只接受 .xlsx 或 .xls 格式的 Excel 檔案'));
    }
  }
});

router.get('/',                ctrl.getVersions);
router.get('/:id/grades',     ctrl.getVersionGrades);
router.post('/upload',        upload.single('file'), ctrl.uploadVersion);
router.post('/apply',         ctrl.applyVersion);
router.post('/generate',      ctrl.generateFromMinWage);
router.delete('/:id',         ctrl.deleteVersion);

module.exports = router;
