const express = require('express');
const router = express.Router();
const missedPunchController = require('../controllers/missedPunchController');


const { checkPermission } = require('../middlewares/permissionMiddleware');

router.post('/', missedPunchController.createRequest);
router.get('/', missedPunchController.getRequests);
router.put('/:id/approve', checkPermission('MISSED_PUNCH', 'canApprove'), missedPunchController.approveRequest);
router.delete('/:id', missedPunchController.deleteRequest);

module.exports = router;
