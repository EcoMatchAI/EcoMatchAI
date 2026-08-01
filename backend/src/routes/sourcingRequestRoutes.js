const express = require('express');
const router = express.Router();
const sourcingController = require('../controller/sourcingRequestController');
const authenticate = require('../middlewear/authMiddlewear');

router.get('/', sourcingController.getAllRequests);

// `/my-requests` must be declared BEFORE `/:id`, otherwise Express matches it as an
// id and Mongo throws: Cast to ObjectId failed for value "my-requests".
router.get('/my-requests', authenticate, sourcingController.getMyRequests);

router.get('/:id', sourcingController.getRequestById);

router.use(authenticate);

router.post('/', sourcingController.createRequest);
router.patch('/:id/status', sourcingController.updateStatus);
router.patch('/:id', sourcingController.updateRequest);
router.delete('/:id', sourcingController.deleteRequest);

module.exports = router;
