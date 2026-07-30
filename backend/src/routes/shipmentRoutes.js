const express = require('express');
const router = express.Router();
const logisticsController = require('../controller/shipmentController');
const authenticate = require('../middlewear/authMiddlewear');

// Public Routes (Product Page Checker & Waybill Tracking)
router.post('/estimate', logisticsController.estimateCostAndEDD);
router.get('/track/:waybillNumber', logisticsController.track);

// Protected Routes (Requires Login)
router.use(authenticate);
router.post('/book', logisticsController.bookShipment);
router.get('/my-shipments', logisticsController.getMyShipments);
router.patch('/shipments/:waybillNumber/status', logisticsController.updateShipmentStatus);

module.exports = router;