const express = require('express');
const router = express.Router();
const sourcingController = require('../controller/sourcingRequestController');
const authenticate = require('../middlewear/authMiddlewear');

router.get('/', sourcingController.getAllRequests);
router.get('/:id', sourcingController.getRequestById);

router.use(authenticate);

router.post('/', sourcingController.createRequest);
router.get('/my-requests', sourcingController.getMyRequests);
router.patch('/:id', sourcingController.updateRequest);
router.patch('/:id/status', sourcingController.updateStatus);
router.delete('/:id', sourcingController.deleteRequest);

module.exports = router;