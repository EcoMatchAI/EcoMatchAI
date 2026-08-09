const mongoose = require('mongoose');

/**
 * One purchase of a listing, paid through Razorpay.
 *
 * Money is always recalculated on the server and stored here in paise (the unit
 * Razorpay works in) so the amount we charge can be compared byte-for-byte with
 * the amount Razorpay reports back.
 */
const orderSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },

    // What the buyer bought — snapshotted so the order stays readable even if the
    // seller later edits or deletes the listing.
    productTitle: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: 'kg' },

    destinationPincode: { type: String, required: true },

    // All amounts in paise. materialCost + freightCost + gstAmount = amount.
    materialCost: { type: Number, required: true, min: 0 },
    freightCost: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 100 },
    currency: { type: String, default: 'INR' },

    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },

    status: {
        type: String,
        enum: ['CREATED', 'PAID', 'FAILED'],
        default: 'CREATED'
    },
    failureReason: { type: String, default: null },

    // Filled in once payment is verified and the freight booking succeeds.
    shipment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shipment',
        default: null
    }
}, { timestamps: true });

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ seller: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
