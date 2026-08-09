const mongoose = require('mongoose');
const UserRoles = require('../domain/Roles');
const accountStatus = require('../domain/accountStatus');

const userSchema = mongoose.Schema({
    businessName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    phoneNumber: { type: String, default: null },
    GSTIN: { type: String, default: null },
    IMPORT_EXPORT_Code: { type: String, default: null },
    preferredPortAndAirport: { type: String, default: null },
    FieldOfInterest: { type: String, default: null },

    bankDetails: {
        accountHolderName: { type: String, default: null },
        accountNumber: { type: String, default: null },
        bankName: { type: String, default: null },
        ifscCode: { type: String, default: null }
    },
    address: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Address"
    }],

    // ---- Business profile (collected by the Preferences questionnaire) ----
    // A company can be both a generator (supplies waste) and an upcycler (consumes
    // it). `role` only holds one value, so the pair is stored separately.
    businessTypes: {
        generator: { type: Boolean, default: false },
        upcycler: { type: Boolean, default: false }
    },
    businessDetails: {
        industry: { type: String, default: null },
        companySize: { type: String, default: null },
        address: { type: String, default: null },
        city: { type: String, default: null },
        serviceRadius: { type: String, default: null },
        gstNumber: { type: String, default: null },
        docName: { type: String, default: null }
    },
    generatorInfo: {
        byproducts: { type: String, default: null },
        volume: { type: String, default: null },
        frequency: { type: String, default: null }
    },
    upcyclerInfo: {
        feedstock: { type: String, default: null },
        purity: { type: String, default: null },
        minVolume: { type: String, default: null },
        maxVolume: { type: String, default: null },
        maxDistance: { type: String, default: null }
    },
    materials: [{
        _id: false,
        id: { type: String },
        name: { type: String },
        selection: { type: String, enum: ['primary', 'secondary', 'none'], default: 'none' }
    }],

    role: {
        type: String,
        enum: [
            UserRoles.ADMIN,
            UserRoles.BUYER,
            UserRoles.SELLER
        ],
        default: null
    },
    accountStatus: {
        type: String,
        enum: [
            accountStatus.ACTIVE,
            accountStatus.SUSPENDED,
            accountStatus.DEACTIVATED,
            accountStatus.BANNED,
            accountStatus.CLOSED,
            accountStatus.PENDING_VERIFICATION],
        default: accountStatus.PENDING_VERIFICATION
    }
}, { timestamps: true });

const user = mongoose.model('user', userSchema);

module.exports = user;
