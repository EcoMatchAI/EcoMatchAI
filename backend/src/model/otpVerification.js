const mongoose = require('mongoose');

const otpVerificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    attempts: {
        type: Number,
        default: 0
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 } // MongoDB automatically deletes record when expired
    }
}, { timestamps: true });

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);