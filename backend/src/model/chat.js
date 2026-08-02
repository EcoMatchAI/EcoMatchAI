 const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    }],
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        default: null // Optional link to a specific product listing
    },
    lastMessage: {
        text: { type: String, default: '' },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
        timestamp: { type: Date, default: Date.now }
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: {} // Key: UserId, Value: Unread Message Count
    }
}, { timestamps: true });


chatSchema.index({ participants: 1, product: 1 });

module.exports = mongoose.model('Chat', chatSchema);