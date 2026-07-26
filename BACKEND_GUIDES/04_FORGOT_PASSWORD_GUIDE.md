# Forgot Password & Reset Guide (OTP-Based)

This guide implements account recovery for **EcoMatch**: request a **6-digit OTP code** sent by email, validate the OTP code along with the new password, and reset the account credentials.

Prerequisites: guides `01`, `02`, `03`.

---

## 📌 Architecture & OTP Reset Flow

```
[ Step 1: Request OTP ]         [ Step 2: Email OTP ]              [ Step 3: Verify & Reset ]
-----------------------         ---------------------              ------------------------
• Enter Email             ──►   • 6-digit OTP code sent      ──►   • Enter Email & 6-digit OTP
• Check User in DB               • 10-minute expiration window      • Enter New Password ×2
• Save Hashed OTP in DB         • Max 3 verification attempts      • Bcrypt Hash New Password
• Always 200 OK (no leak)                                          • Invalidate OTP & Reset Account
```

---

## 🔐 The Core Security Rules

1. **Store a bcrypt hash of the OTP, never the plain 6-digit code.**
2. **Limit failed attempts to 3 per OTP generation** to prevent brute-forcing a 6-digit number.
3. **Set a 10-minute Time-To-Live (TTL) index** in MongoDB (`expiresAt`).
4. **Delete OTP upon successful password reset**.

---

## 🗄️ Step 1: Database Model (`src/model/otpVerification.js`)

Uses the existing `OtpVerification` model:

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
        index: { expires: 0 }
    }
}, { timestamps: true });

module.exports = mongoose.model('OtpVerification', otpVerificationSchema);
```

---

## 📧 Step 2: Email Sender (`src/util/emailService.js`)

```javascript
const sendPasswordResetOtpEmail = async (toEmail, otp, businessName) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #166534;">EcoMatch - Password Reset Code</h2>
            <p>Hello <strong>${businessName || 'EcoMatch User'}</strong>,</p>
            <p>We received a request to reset your password. Use the 6-digit verification code below:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #166534; padding: 20px; background: #f0fdf4; text-align: center; border-radius: 8px; margin: 20px 0;">
                ${otp}
            </div>
            <p style="font-size: 14px; color: #64748b;">This OTP code is valid for <strong>10 minutes</strong>.</p>
        </div>
    `;

    return await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"EcoMatch Security" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'EcoMatch - 6-Digit Password Reset Code',
        html: htmlContent
    });
};
```

---

## ⚙️ Step 3: Auth Services (`src/services/authServices.js`)

```javascript
const bcrypt = require("bcrypt");
const User = require("../model/user");
const OtpVerification = require("../model/otpVerification");
const generateOtp = require("../util/generateOTP");
const { sendPasswordResetOtpEmail } = require("../util/emailService");

class AuthServices {
    async forgotPassword(email) {
        if (!email) throw new Error("Email address is required.");

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return {
                success: true,
                message: "If an account with that email exists, a 6-digit OTP has been sent."
            };
        }

        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 8);

        await OtpVerification.deleteMany({ email: normalizedEmail });
        await OtpVerification.create({
            email: normalizedEmail,
            otp: hashedOtp,
            attempts: 0,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        await sendPasswordResetOtpEmail(normalizedEmail, otp, user.businessName);

        return {
            success: true,
            message: "If an account with that email exists, a 6-digit OTP has been sent."
        };
    }

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

        if (!user) throw new Error("User account not found.");

        const otpRecord = await OtpVerification.findOne({ email: normalizedEmail });

        if (!otpRecord) {
            throw new Error("OTP code has expired or was not requested. Please request a new OTP.");
        }

        if (otpRecord.attempts >= 3) {
            await OtpVerification.deleteOne({ _id: otpRecord._id });
            throw new Error("Too many failed attempts. Please request a new OTP code.");
        }

        const isOtpValid = await bcrypt.compare(otp.trim(), otpRecord.otp);

        if (!isOtpValid) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            throw new Error(`Invalid OTP code. ${3 - otpRecord.attempts} attempt(s) remaining.`);
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

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

## 🔗 Step 4: API Endpoints

### 1. Request Reset OTP (`POST /api/auth/forgot-password`)
- **Body**: `{ "email": "user@example.com" }`
- **Response**: `{ "success": true, "message": "If an account with that email exists, a 6-digit OTP has been sent." }`

### 2. Verify OTP & Set Password (`POST /api/auth/reset-password`)
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "482910",
    "newPassword": "NewPassword123!",
    "confirmPassword": "NewPassword123!"
  }
  ```
- **Response**: `{ "success": true, "message": "Password reset successful. You can now log in with your new password." }`
