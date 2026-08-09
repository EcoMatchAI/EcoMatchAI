const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['Organic', 'Textiles', 'Wood', 'Plastics', 'Metals', 'Grain']
    },
    description: {
        type: String,
        required: true
    },
    purity: { type: String, default: null },      
    photos: [{ type: String }],                   
    docName:  [{ type: String }],    

   
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unit: {
        type: String,
        
        default:"kg"
     
    },
    frequency: {
        type: String,
        enum: ['One-time', 'Daily', 'Weekly', 'Monthly'],
        default: 'Weekly'
    },
    price: { type: Number, default: 0, min: 0 },
    priceUnit: {
        type: String,

        default: 'per kg'
    },
    // The create-listing form has always collected these; without them the values
    // were dropped on save and the marketplace showed hardcoded placeholders.
    pricingModel: {
        type: String,
        enum: ['Fixed', 'Negotiable', 'Free — disposal saving'],
        default: 'Negotiable'
    },
    moisture: {
        type: String,
        enum: ['Dry', 'Wet', 'Mixed', 'Clean / Sorted', 'Contaminated'],
        default: 'Dry'
    },
    availableFrom: { type: Date, default: null },
    logistics: {
        type: String,
        enum: ['Local Pickup', 'Freight (supplier-arranged)', 'Courier', 'Buyer-arranged'],
        default: 'Local Pickup'
    },
    packaging: {
        type: String,
        enum: ['Loose / bulk', 'Bagged', 'Palletised', 'Container'],
        default: 'Bagged'
    },


    city: {
        type: String,
        required: true,
        trim: true
    },
status: {
        type: String,
        enum: ['Active', 'Paused', 'Reserved'],
        default: 'Active'
    },
}, { timestamps: true });


productSchema.index({ category: 1, city: 1, status: 1 });

const product = mongoose.model('product', productSchema);

module.exports = product;