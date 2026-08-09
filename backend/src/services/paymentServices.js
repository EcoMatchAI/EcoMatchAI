const crypto = require('crypto');
const Razorpay = require('razorpay');

const Order = require('../model/order');
const Product = require('../model/product');
const logisticsService = require('./shipmentServices');

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

const GST_RATE = 0.18;

// One client for the process. Created lazily so the server still boots (and every
// other route keeps working) when the Razorpay keys have not been filled in yet.
let client = null;
const getClient = () => {
    if (!KEY_ID || !KEY_SECRET) {
        throw new Error('Payments are not configured on the server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }
    if (!client) {
        client = new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
    }
    return client;
};

const toPaise = (rupees) => Math.round(rupees * 100);

class PaymentService {

    /** Is the server able to take payments at all? Used to hide the pay button. */
    isConfigured() {
        return Boolean(KEY_ID && KEY_SECRET);
    }

    /** The publishable key. Safe to send to the browser; the secret never leaves. */
    getPublicKey() {
        if (!KEY_ID) {
            throw new Error('Payments are not configured on the server.');
        }
        return KEY_ID;
    }

    /**
     * Price the purchase from the database. The client sends only what it is
     * buying (listing, quantity, destination) — never an amount — so a tampered
     * request cannot change what gets charged.
     */
    async quote({ productId, quantity, destinationPincode }) {
        if (!productId || !destinationPincode) {
            throw new Error('Please choose a listing and enter a delivery pincode.');
        }
        if (!/^\d{6}$/.test(String(destinationPincode))) {
            throw new Error('Please enter a valid 6-digit pincode.');
        }

        const product = await Product.findById(productId).populate('seller', 'businessName email');
        if (!product) {
            throw new Error('This listing no longer exists.');
        }
        if (product.status !== 'Active') {
            throw new Error('This listing is not currently available for purchase.');
        }

        const estimate = await logisticsService.estimateFreightAndDelivery({
            productId,
            destinationPincode,
            quantity
        });

        const orderedQuantity = estimate.product.quantity;
        const materialCost = Math.round(product.price * orderedQuantity);
        const freightCost = estimate.pricing.baseFreightCost + estimate.pricing.fuelSurcharge;
        const gstAmount = Math.round((materialCost + freightCost) * GST_RATE);
        const total = materialCost + freightCost + gstAmount;

        return {
            product,
            orderedQuantity,
            estimate,
            breakdown: { materialCost, freightCost, gstAmount, total }
        };
    }

    /** The quote as plain JSON for the checkout summary screen. */
    async getQuote(payload) {
        const { product, orderedQuantity, estimate, breakdown } = await this.quote(payload);
        return {
            product: {
                id: product._id,
                title: product.title,
                unit: product.unit,
                price: product.price,
                priceUnit: product.priceUnit,
                city: product.city,
                sellerName: product.seller?.businessName || 'EcoMatch Seller'
            },
            quantity: orderedQuantity,
            destination: estimate.destination,
            deliveryEstimate: estimate.deliveryEstimate,
            breakdown
        };
    }

    /**
     * Create a Razorpay order and record our own CREATED order alongside it.
     */
    async createOrder(buyerId, payload) {
        const { product, orderedQuantity, breakdown } = await this.quote(payload);

        if (product.seller._id.toString() === buyerId.toString()) {
            throw new Error('You cannot buy your own listing.');
        }
        if (breakdown.total <= 0) {
            throw new Error('This listing is free — use "Request to Source" instead of checkout.');
        }

        const amountInPaise = toPaise(breakdown.total);
        if (amountInPaise < 100) {
            throw new Error('The minimum payable amount is ₹1.');
        }

        const razorpayOrder = await getClient().orders.create({
            amount: amountInPaise,
            currency: 'INR',
            // Razorpay caps receipts at 40 characters.
            receipt: `eco_${Date.now()}`.slice(0, 40),
            notes: {
                productId: String(product._id),
                buyerId: String(buyerId),
                quantity: String(orderedQuantity)
            }
        });

        const order = await Order.create({
            buyer: buyerId,
            seller: product.seller._id,
            product: product._id,
            productTitle: product.title,
            quantity: orderedQuantity,
            unit: product.unit,
            destinationPincode: String(payload.destinationPincode),
            materialCost: toPaise(breakdown.materialCost),
            freightCost: toPaise(breakdown.freightCost),
            gstAmount: toPaise(breakdown.gstAmount),
            amount: amountInPaise,
            currency: 'INR',
            razorpayOrderId: razorpayOrder.id,
            status: 'CREATED'
        });

        return {
            orderId: order._id,
            razorpayOrderId: razorpayOrder.id,
            amount: amountInPaise,
            currency: 'INR',
            keyId: this.getPublicKey(),
            breakdown,
            product: {
                id: product._id,
                title: product.title,
                quantity: orderedQuantity,
                unit: product.unit
            }
        };
    }

    /**
     * Verify the checkout callback and, only if the signature is genuine, mark the
     * order paid and book the freight.
     *
     * The signature is an HMAC-SHA256 of "<order_id>|<payment_id>" keyed with the
     * secret. Because only Razorpay and this server know the secret, a forged
     * callback from the browser cannot produce a matching digest.
     */
    async verifyPayment(buyerId, { razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new Error('Incomplete payment response. Payment could not be verified.');
        }
        if (!KEY_SECRET) {
            throw new Error('Payments are not configured on the server.');
        }

        const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
        if (!order) {
            throw new Error('We could not find that order.');
        }
        if (order.buyer.toString() !== buyerId.toString()) {
            throw new Error('This order belongs to another account.');
        }
        // Replaying an already-verified callback must not book a second shipment.
        if (order.status === 'PAID') {
            return { alreadyVerified: true, order: await this.populateOrder(order._id) };
        }

        const expected = crypto
            .createHmac('sha256', KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        const provided = Buffer.from(razorpay_signature, 'utf8');
        const computed = Buffer.from(expected, 'utf8');
        const signatureValid =
            provided.length === computed.length && crypto.timingSafeEqual(provided, computed);

        if (!signatureValid) {
            order.status = 'FAILED';
            order.failureReason = 'Signature verification failed.';
            await order.save();
            throw new Error('Payment verification failed. If you were charged, the amount will be refunded automatically.');
        }

        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;
        order.status = 'PAID';
        order.failureReason = null;

        // Freight booking is a follow-up action, not part of the payment proof — if
        // it fails the payment still stands and the order records why.
        try {
            const shipment = await logisticsService.createShipment({
                productId: order.product,
                buyerId: order.buyer,
                destinationPincode: order.destinationPincode,
                quantity: order.quantity
            });
            order.shipment = shipment._id;
        } catch (error) {
            order.failureReason = `Paid, but freight booking failed: ${error.message}`;
            console.error('Shipment booking after payment failed:', error.message);
        }

        await order.save();
        return { alreadyVerified: false, order: await this.populateOrder(order._id) };
    }

    /** Called when Razorpay checkout reports a failure or the buyer dismisses it. */
    async markFailed(buyerId, razorpayOrderId, reason) {
        const order = await Order.findOne({ razorpayOrderId });
        if (!order || order.buyer.toString() !== buyerId.toString()) {
            throw new Error('We could not find that order.');
        }
        if (order.status === 'PAID') {
            throw new Error('This order is already paid.');
        }
        order.status = 'FAILED';
        order.failureReason = reason || 'Payment was not completed.';
        await order.save();
        return { message: 'Order marked as failed.' };
    }

    async populateOrder(orderId) {
        return await Order.findById(orderId)
            .populate('product', 'title photos category city unit priceUnit')
            .populate('seller', 'businessName email phoneNumber')
            .populate('shipment', 'waybillNumber status estimatedDeliveryDate destinationCity');
    }

    /** Orders where I am the buyer, plus sales where I am the seller. */
    async getMyOrders(userId) {
        const [purchases, sales] = await Promise.all([
            Order.find({ buyer: userId })
                .populate('product', 'title photos category city unit priceUnit')
                .populate('seller', 'businessName email phoneNumber')
                .populate('shipment', 'waybillNumber status estimatedDeliveryDate destinationCity')
                .sort({ createdAt: -1 }),
            Order.find({ seller: userId, status: 'PAID' })
                .populate('product', 'title photos category city unit priceUnit')
                .populate('buyer', 'businessName email phoneNumber')
                .populate('shipment', 'waybillNumber status estimatedDeliveryDate destinationCity')
                .sort({ createdAt: -1 })
        ]);
        return { purchases, sales };
    }
}

module.exports = new PaymentService();
