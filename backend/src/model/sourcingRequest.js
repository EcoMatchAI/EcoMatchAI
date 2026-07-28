const mongoose = require('mongoose');

const sourcingRequestSchema = new mongoose.Schema({
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    materialCategory: {
        type: String,
        required: true,
        enum: ['PLASTIC', 'TEXTILE', 'ORGANIC', 'METAL', 'PAPER', 'GLASS', 'E_WASTE', 'RUBBER', 'OTHER']
    },
    specificMaterial: {
        type: String,
        required: true,
        trim: true 
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    quantityRequired: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    unit: {
        type: String,
        required: true,
        default: 'KG'
    },
    maxBudgetPerUnit: {
        type: Number,
        required: true,
        min: [0, 'Budget cannot be negative']
    },
    urgencyLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'IMMEDIATE'],
        default: 'MEDIUM'
    },
    location: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address",
        required: true
    },

}, { timestamps: true });

module.exports = mongoose.model('SourcingRequest', sourcingRequestSchema);