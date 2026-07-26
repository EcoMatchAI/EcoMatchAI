# EcoMatch — Login & OTP-Based Forgot Password System Guide

This guide details step-by-step how to implement a secure **Email/Password Authentication** and **OTP-Based Forgot & Reset Password System** for **EcoMatchAI** using **Node.js, Express, MongoDB (Mongoose), JWT, Nodemailer, and Bcrypt**.

The code structure, file placement, and design patterns strictly follow the existing **EcoMatchAI** project backend architecture.

---

## 📌 1. Architecture & System Flow

### A. Login & Session Management Flow
```
[ User Input ]           [ Backend Validation ]          [ Session Token Response ]
--------------           ----------------------          -------------------------
• Email & Password  ──►  • Find User in MongoDB    ──►   • Returns JWT Access Token
                         • Verify Bcrypt Password        • Returns User Profile Object
                         • Check Account Status          • Excludes Password Hash
```

### B. OTP-Based Forgot & Reset Password Flow
```
[ Step 1: Request OTP ]         [ Step 2: Email OTP ]              [ Step 3: Verify & Reset ]
-----------------------         ---------------------              ------------------------
• Enter Email             ──►   • 6-digit OTP code sent      ──►   • Enter Email & 6-digit OTP
• Check User in DB               • 10-minute expiration window      • Enter New Password ×2
• Save Hashed OTP in DB         • Max 3 verification attempts      • Bcrypt Hash New Password
• Always 200 OK (no leak)                                          • Invalidate OTP & Reset Account
```

---

## 📁 2. File & Directory System Arrangement

The backend components fit directly into the existing `backend/src/` folder arrangement:

```text
backend/
├── .env                                <-- System environment variables
├── index.js                            <-- Main Express server entry point
├── src/
│   ├── config/
│   │   └── db.js                       <-- Mongoose DB connection
│   ├── domain/
│   │   ├── Roles.js                    <-- User roles (ADMIN, BUYER, SELLER)
│   │   └── accountStatus.js            <-- Status constants (ACTIVE, SUSPENDED, PENDING_VERIFICATION)
│   ├── model/
│   │   ├── user.js                     <-- User model schema
│   │   ├── address.js                  <-- User address schema
│   │   └── otpVerification.js          <-- OTP verification schema (10-min TTL index)
│   ├── util/
│   │   ├── jwtProvider.js              <-- JWT creation and verification utilities
│   │   ├── emailService.js             <-- Nodemailer helper (sendOtpEmail, sendPasswordResetOtpEmail)
│   │   └── generateOTP.js              <-- 6-digit OTP generator helper
│   ├── services/
│   │   ├── authServices.js             <-- Auth business logic (Login, OTP Request, OTP Reset)
│   │   └── userServices.js             <-- User registration and profile management
│   ├── controller/
│   │   ├── authController.js           <-- Controller handlers for auth endpoints
│   │   └── userController.js           <-- Controller handlers for profile/user actions
│   └── routes/
│       ├── authRoutes.js               <-- Express routes (/api/auth)
│       └── userRoutes.js               <-- Express routes (/api/user)
```

---

## ⚙️ 3. Step-by-Step Code Implementation

### Step 1: OTP Verification Schema (`src/model/otpVerification.js`)

Ensure `src/model/otpVerification.js` includes a 10-minute automatic Time-To-Live (TTL) index:

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
        index: { expires: 0 } // MongoDB automatically deletes expired OTP records
    }
}, { timestamps: true });

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
```

---

### Step 2: OTP Email Helper (`src/util/emailService.js`)

Add `sendPasswordResetOtpEmail` to `src/util/emailService.js`:

```javascript
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
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
        from: process.env.EMAIL_FROM || `"EcoMatchAI Support" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'EcoMatchAI - 6-Digit Verification Code',
        html: htmlContent
    });
};

const sendPasswordResetOtpEmail = async (toEmail, otp, businessName) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #166534;">EcoMatch - Password Reset Code</h2>
            <p>Hello <strong>${businessName || 'EcoMatch User'}</strong>,</p>
            <p>We received a request to reset your password. Use the 6-digit verification code below:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #166534; padding: 20px; background: #f0fdf4; text-align: center; border-radius: 8px; margin: 20px 0;">
                ${otp}
            </div>
            <p style="font-size: 14px; color: #64748b;">This OTP code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
            <p style="margin-top: 20px; font-size: 13px; color: #94a3b8;">If you did not request a password reset, please ignore this email.</p>
        </div>
    `;

    return await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"EcoMatch Security" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'EcoMatch - 6-Digit Password Reset Code',
        html: htmlContent
    });
};

module.exports = { sendOtpEmail, sendPasswordResetOtpEmail };
```

---

### Step 3: Implement Auth Services (`src/services/authServices.js`)

Implement login, OTP request, and OTP verification reset logic in `src/services/authServices.js`:

```javascript
const bcrypt = require("bcrypt");
const User = require("../model/user");
const OtpVerification = require("../model/otpVerification");
const jwtProvider = require("../util/jwtProvider");
const generateOtp = require("../util/generateOTP");
const { sendPasswordResetOtpEmail } = require("../util/emailService");
const accountStatus = require("../domain/accountStatus");

class AuthServices {
    /**
     * Authenticate user with email and password
     */
    async loginUser({ email, password }) {
        if (!email || !password) {
            throw new Error("Email and password are required.");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            throw new Error("Invalid email or password.");
        }

        // Verify Bcrypt Password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error("Invalid email or password.");
        }

        // Check Account Status
        if (user.accountStatus === accountStatus.BANNED || user.accountStatus === accountStatus.SUSPENDED) {
            throw new Error(`Account is ${user.accountStatus.toLowerCase()}. Please contact support.`);
        }

        // Generate JWT Token
        const token = jwtProvider.createJwt({
            userId: user._id,
            email: user.email,
            role: user.role
        });

        // Format return object without exposing password hash
        const userObj = user.toObject();
        delete userObj.password;

        return {
            success: true,
            message: "Signed in successfully.",
            token,
            user: userObj
        };
    }

    /**
     * Fetch authenticated user details (/auth/me)
     */
    async getMe(token) {
        if (!token) {
            throw new Error("Authorization token is required.");
        }

        const decoded = jwtProvider.verifyjwt(token);
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            throw new Error("User not found.");
        }

        return {
            success: true,
            user
        };
    }

    /**
     * Request Password Reset OTP
     * Sends a 6-digit OTP code to the user's email
     */
    async forgotPassword(email) {
        if (!email) {
            throw new Error("Email address is required.");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        // Anti-enumeration: Return success response even if user not found
        if (!user) {
            return {
                success: true,
                message: "If an account with that email exists, a 6-digit OTP has been sent."
            };
        }

        // Generate 6-digit OTP
        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 8);

        // Remove old OTP records and save new OTP with 10-minute expiration
        await OtpVerification.deleteMany({ email: normalizedEmail });
        await OtpVerification.create({
            email: normalizedEmail,
            otp: hashedOtp,
            attempts: 0,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        // Send OTP via email
        try {
            await sendPasswordResetOtpEmail(normalizedEmail, otp, user.businessName);
        } catch (error) {
            await OtpVerification.deleteMany({ email: normalizedEmail });
            throw new Error("Failed to send OTP email. Please try again later.");
        }

        return {
            success: true,
            message: "If an account with that email exists, a 6-digit OTP has been sent."
        };
    }

    /**
     * Reset Password using Email + OTP + New Password
     */
    async resetPassword({ email, otp, newPassword, confirmPassword }) {
        if (!email || !otp || !newPassword || !confirmPassword) {
            throw new Error("Email, OTP code, new password, and confirmation password are required.");
        }

        if (newPassword !== confirmPassword) {
            throw new Error("Passwords do not match.");
        }

        if (newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters long.");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            throw new Error("User account not found.");
        }

        // Find OTP record in DB
        const otpRecord = await OtpVerification.findOne({ email: normalizedEmail });

        if (!otpRecord) {
            throw new Error("OTP code has expired or was not requested. Please request a new OTP.");
        }

        // Check max attempt limit (max 3 attempts)
        if (otpRecord.attempts >= 3) {
            await OtpVerification.deleteOne({ _id: otpRecord._id });
            throw new Error("Too many failed attempts. Please request a new OTP code.");
        }

        // Verify incoming OTP against hashed OTP in database
        const isOtpValid = await bcrypt.compare(otp.trim(), otpRecord.otp);

        if (!isOtpValid) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            throw new Error(`Invalid OTP code. ${3 - otpRecord.attempts} attempt(s) remaining.`);
        }

        // Hash new password and update user document
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Delete used OTP record
        await OtpVerification.deleteOne({ _id: otpRecord._id });

        return {
            success: true,
            message: "Password reset successful. You can now log in with your new password."
        };
    }
}

module.exports = new AuthServices();
```

---

### Step 4: Implement Auth Controller (`src/controller/authController.js`)

Create `src/controller/authController.js`:

```javascript
const authServices = require("../services/authServices");

class AuthController {
    /**
     * POST /api/auth/login
     */
    async login(req, res) {
        try {
            const result = await authServices.loginUser(req.body);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * GET /api/auth/me
     */
    async getMe(req, res) {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                return res.status(401).json({
                    success: false,
                    message: "Access token is missing or invalid."
                });
            }
            const token = authHeader.split(" ")[1];
            const result = await authServices.getMe(token);
            res.status(200).json(result);
        } catch (error) {
            res.status(401).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/forgot-password
     * User enters email -> Receives 6-digit OTP code in email
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const result = await authServices.forgotPassword(email);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/reset-password
     * User enters email, OTP, new password, and confirm password
     */
    async resetPassword(req, res) {
        try {
            const result = await authServices.resetPassword(req.body);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * POST /api/auth/logout
     */
    async logout(req, res) {
        res.status(200).json({
            success: true,
            message: "Logged out successfully."
        });
    }
}

module.exports = new AuthController();
```

---

### Step 5: Define Express Auth Routes (`src/routes/authRoutes.js`)

Create `src/routes/authRoutes.js`:

```javascript
const express = require('express');
const router = express.Router();
const AuthController = require('../controller/authController');

// Authentication & Session Endpoints
router.post('/login', AuthController.login);
router.get('/me', AuthController.getMe);
router.post('/logout', AuthController.logout);

// OTP-Based Password Recovery Endpoints
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);

module.exports = router;
```

---

## 🔗 4. API Request & Response Contracts

### 1. Request Password Reset OTP (`POST /api/auth/forgot-password`)

**Request Body:**
```json
{
  "email": "greenbrew@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If an account with that email exists, a 6-digit OTP has been sent."
}
```

---

### 2. Reset Password with OTP (`POST /api/auth/reset-password`)

**Request Body:**
```json
{
  "email": "greenbrew@example.com",
  "otp": "482910",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successful. You can now log in with your new password."
}
```

**Error Response - Invalid OTP (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid OTP code. 2 attempt(s) remaining."
}
```

---

## 🧪 5. Testing & Verification Guide

### cURL Verification Commands

#### 1. Request Password Reset OTP
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"greenbrew@example.com"}'
```

#### 2. Reset Password using Email + OTP + New Password
```bash
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "greenbrew@example.com",
    "otp": "123456",
    "newPassword": "NewSecurePassword123!",
    "confirmPassword": "NewSecurePassword123!"
  }'
```

---

## 🛡️ 6. Security Standards Summary

1. **OTP Hashing**: OTPs are hashed using `bcrypt` before storage in MongoDB.
2. **Short 10-Minute Window**: Uses Mongoose `expiresAt` TTL index to clean up expired OTPs automatically.
3. **Attempt Limiting**: Allows a maximum of **3 failed OTP entries** per request before invalidating the code.
4. **Anti-User Enumeration**: Returns the same success message regardless of whether the email exists.
