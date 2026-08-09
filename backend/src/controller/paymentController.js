const paymentService = require('../services/paymentServices');

class PaymentController {

    /** GET /api/payment/config — lets the UI hide checkout when keys are missing. */
    async getConfig(req, res) {
        const configured = paymentService.isConfigured();
        res.status(200).json({
            configured,
            keyId: configured ? paymentService.getPublicKey() : null
        });
    }

    /** POST /api/payment/quote — price breakdown before the buyer commits. */
    async getQuote(req, res) {
        try {
            const quote = await paymentService.getQuote(req.body);
            res.status(200).json({ success: true, quote });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /** POST /api/payment/order */
    async createOrder(req, res) {
        try {
            const order = await paymentService.createOrder(req.user._id, req.body);
            res.status(201).json({ success: true, ...order });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /** POST /api/payment/verify */
    async verifyPayment(req, res) {
        try {
            const result = await paymentService.verifyPayment(req.user._id, req.body);
            res.status(200).json({
                success: true,
                message: result.alreadyVerified
                    ? 'This payment was already confirmed.'
                    : 'Payment verified successfully.',
                order: result.order
            });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /** POST /api/payment/failed */
    async markFailed(req, res) {
        try {
            const result = await paymentService.markFailed(
                req.user._id,
                req.body.razorpay_order_id,
                req.body.reason
            );
            res.status(200).json({ success: true, ...result });
        } catch (error) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    /** GET /api/payment/my-orders */
    async getMyOrders(req, res) {
        try {
            const { purchases, sales } = await paymentService.getMyOrders(req.user._id);
            res.status(200).json({
                success: true,
                purchaseCount: purchases.length,
                salesCount: sales.length,
                purchases,
                sales
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new PaymentController();
