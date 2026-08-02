 const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    attachments: [{
        url: String,
        fileType: String // e.g. "image/png", "application/pdf"
    }],
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Message', messageSchema);