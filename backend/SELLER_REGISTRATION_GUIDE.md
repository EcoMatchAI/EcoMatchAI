# Seller Registration & Email OTP Verification Guide

This guide details step-by-step how to implement a 3-stage seller registration and email verification system for **EcoMatchAI** using **Node.js, Express, MongoDB, and Nodemailer**.

---

## 📌 Architecture & Registration Flow

```
[ Step 1: Initial Signup ]  ──►  [ Step 2: Email Verification ]  ──►  [ Step 3: Complete Profile ]
--------------------------       -----------------------------       ----------------------------
• Business Name                  • Enter 6-digit OTP code            • Phone Number
• Email Address                  • Verified within 10 minutes        • GSTIN & IEC Code
• Password & Confirm Password    • 3 maximum attempt limit           • Bank Details (IFSC, Acc No)
                                                                     • Pickup Address
```

---

## 🛠️ Step 1: Install Dependencies

Run the following command in your `backend` directory:

```bash
npm install nodemailer bcrypt express-rate-limit
```

---

## 🗄️ Step 2: Database Schemas Configuration

### 1. OTP Verification Model (`src/model/otpVerification.js`)
Create a schema to store temporary OTPs with an automatic **10-minute Time-To-Live (TTL)** index.

```javascript
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
```

---

### 2. Update Seller Model (`src/model/seller.js`)
Ensure the `seller` schema allows saving credentials at Step 1 and populating profile fields at Step 3.

```javascript
const mongoose = require('mongoose');
const UserRoles = require('../domain/Roles');
const accountStatus = require('../domain/accountStatus');

const sellerSchema = new mongoose.Schema({
    businessName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    
    // Captured in Step 3
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
    role: { type: String, default: UserRoles.SELLER },
    accountStatus: {
        type: String,
        enum: Object.values(accountStatus),
        default: accountStatus.PENDING_VERIFICATION
    }
}, { timestamps: true });

module.exports = mongoose.model('seller', sellerSchema);
```

---

## 📧 Step 3: Nodemailer Email Transporter Utility

Create `src/util/emailService.js` to handle sending the 10-minute OTP verification email:

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOtpEmail = async (toEmail, otp, businessName) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2>EcoMatchAI Email Verification</h2>
            <p>Hello <strong>${businessName}</strong>,</p>
            <p>Your 6-digit verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #166534; padding: 15px; background: #f0fdf4; text-align: center;">
                ${otp}
            </div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
        </div>
    `;

    return await transporter.sendMail({
        from: `"EcoMatchAI Support" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'EcoMatchAI - 6-Digit Verification Code',
        html: htmlContent
    });
};

module.exports = { sendOtpEmail };
```

Add these environment variables to your `.env` file:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

---

## ⚡ Step 4: Business Logic & Services (`src/services/sellerServices.js`)

Implement the three workflow methods in your service class:

```javascript
const Seller = require('../model/seller');
const Address = require('../model/address');
const OtpVerification = require('../model/otpVerification');
const bcrypt = require('bcrypt');
const jwtProvider = require('../util/jwtProvider');
const { sendOtpEmail } = require('../util/emailService');

class SellerServices {

    // 1. Step 1: Save basic credentials & send 10-minute OTP
    async initiateSignup({ businessName, email, password, confirmPassword }) {
        if (password !== confirmPassword) {
            throw new Error("Passwords do not match");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingSeller = await Seller.findOne({ email: normalizedEmail });
        
        if (existingSeller && existingSeller.isEmailVerified) {
            throw new Error("An account with this email address already exists.");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Save or update pending seller record
        let sellerRecord = existingSeller;
        if (!sellerRecord) {
            sellerRecord = await Seller.create({
                businessName,
                email: normalizedEmail,
                password: hashedPassword,
                isEmailVerified: false
            });
        } else {
            sellerRecord.businessName = businessName;
            sellerRecord.password = hashedPassword;
            await sellerRecord.save();
        }

        // Generate 6-digit OTP & Hash it before storing
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 8);

        // Store OTP with 10-minute expiry (10 * 60 * 1000 ms)
        await OtpVerification.deleteMany({ email: normalizedEmail });
        await OtpVerification.create({
            email: normalizedEmail,
            otp: hashedOtp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        // Send OTP via Nodemailer
        await sendOtpEmail(normalizedEmail, otp, businessName);

        const tempToken = jwtProvider.createJwt({ email: normalizedEmail, step: 'OTP_PENDING' });
        return { email: normalizedEmail, tempToken, message: "OTP sent to email. Valid for 10 minutes." };
    }

    // 2. Step 2: Verify 6-digit OTP
    async verifyEmailOtp({ email, otp }) {
        const normalizedEmail = email.toLowerCase().trim();
        const otpRecord = await OtpVerification.findOne({ email: normalizedEmail });

        if (!otpRecord) {
            throw new Error("OTP code expired or invalid. Please request a new OTP.");
        }

        if (otpRecord.attempts >= 3) {
            await OtpVerification.deleteOne({ _id: otpRecord._id });
            throw new Error("Maximum attempts (3) exceeded. Please request a new OTP.");
        }

        const isValid = await bcrypt.compare(otp, otpRecord.otp);
        if (!isValid) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            throw new Error(`Invalid OTP code. ${3 - otpRecord.attempts} attempt(s) remaining.`);
        }

        // Mark email as verified
        await Seller.updateOne({ email: normalizedEmail }, { isEmailVerified: true });
        await OtpVerification.deleteOne({ _id: otpRecord._id });

        const verificationToken = jwtProvider.createJwt({ email: normalizedEmail, isEmailVerified: true });
        return { email: normalizedEmail, verificationToken, message: "Email verified successfully." };
    }

    // 3. Step 3: Complete required business profile
    async completeProfile(email, profileData) {
        const normalizedEmail = email.toLowerCase().trim();
        const sellerRecord = await Seller.findOne({ email: normalizedEmail });

        if (!sellerRecord || !sellerRecord.isEmailVerified) {
            throw new Error("Email address must be verified first.");
        }

        let addressId = null;
        if (profileData.pickupAddress) {
            const newAddress = await Address.create(profileData.pickupAddress);
            addressId = newAddress._id;
        }

        sellerRecord.phoneNumber = profileData.phoneNumber;
        sellerRecord.GSTIN = profileData.GSTIN;
        sellerRecord.bankDetails = profileData.bankDetails;
        sellerRecord.IMPORT_EXPORT_Code = profileData.IMPORT_EXPORT_Code;
        sellerRecord.preferredPortAndAirport = profileData.preferredPortAndAirport;
        sellerRecord.FieldOfInterest = profileData.FieldOfInterest;
        if (addressId) sellerRecord.address.push(addressId);
        
        sellerRecord.accountStatus = 'ACTIVE';
        await sellerRecord.save();

        const authToken = jwtProvider.createJwt({ email: sellerRecord.email, role: sellerRecord.role });
        return { seller: sellerRecord, authToken };
    }
}

module.exports = new SellerServices();
```

---

## 🚦 Step 5: Routes & Controllers Setup

### 1. Controllers (`src/controller/sellerController.js`)
Add handlers for `initiateSignup`, `verifyEmailOtp`, and `completeProfile`.

### 2. Routes (`src/routes/sellerRoutes.js`)
Expose the 3 registration endpoints:

```javascript
const express = require('express');
const router = express.Router();
const SellerController = require('../controller/sellerController');

// Step 1: Initial signup (Business Name, Email, Password, Confirm Password)
router.post('/signup/initiate', SellerController.initiateSignup);

// Step 2: Verify 6-digit OTP code received via email
router.post('/signup/verify-otp', SellerController.verifyEmailOtp);

// Step 3: Submit official business profile (GSTIN, Bank, Address, IEC, Ports)
router.post('/signup/complete-profile', SellerController.completeProfile);

module.exports = router;
```

---

## 🔒 Security Summary & Best Practices

1. **OTP Expiry**: Set to exactly **10 minutes** using MongoDB `expiresAt` TTL index.
2. **Brute Force Protection**: Max **3 incorrect attempts** before OTP deletion.
3. **Password Security**: Hash passwords using `bcrypt` with salt rounds `10`.
4. **Email Verification Guard**: Prevent completing Step 3 unless `isEmailVerified === true`.
