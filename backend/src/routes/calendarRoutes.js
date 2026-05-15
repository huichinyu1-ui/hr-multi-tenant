const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { checkPermission } = require('../middlewares/permissionMiddleware');

router.get('/', checkPermission('CALENDAR', 'canView'), calendarController.getCalendarDays);
router.post('/upsert', checkPermission('CALENDAR', 'canEdit'), calendarController.upsertCalendarDay);
router.post('/generate', checkPermission('CALENDAR', 'canCreate'), calendarController.generateMonth);
router.post('/sync/:year', checkPermission('CALENDAR', 'canEdit'), calendarController.syncGovCalendar);

module.exports = router;
