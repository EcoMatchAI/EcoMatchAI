const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    waybillNumber: {
        type: String,
        required: true,
        unique: true
    },
    carrier: {
        type: String,
        default: 'EcoMatch Freight Logistics'
    },
    originCity: { type: String, required: true },
    destinationPincode: { type: String, required: true },
    destinationCity: { type: String, default: 'Mumbai' },
    weightInKg: { type: Number, required: true },
    freightCharges: { type: Number, required: true },
    gstAmount: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    estimatedDeliveryDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['MANIFESTED', 'PICKUP_SCHEDULED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
        default: 'MANIFESTED'
    },
    trackingHistory: [{
        status: String,
        location: String,
        timestamp: { type: Date, default: Date.now },
        remarks: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('Shipment', shipmentSchema);