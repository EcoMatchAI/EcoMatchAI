const express = require('express');
const router = express.Router();
const paymentController = require('../controller/paymentController');
const authenticate = require('../middlewear/authMiddlewear');

// Public: only exposes whether payments are enabled and the publishable key.
router.get('/config', paymentController.getConfig);

// Everything that touches money or an order requires a logged-in user.
router.use(authenticate);

router.post('/quote', paymentController.getQuote);
router.post('/order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.post('/failed', paymentController.markFailed);
router.get('/my-orders', paymentController.getMyOrders);

module.exports = router;
