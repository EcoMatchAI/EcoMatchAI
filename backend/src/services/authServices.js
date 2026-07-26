const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../model/user");
const jwtProvider = require("../util/jwtProvider");
const accountStatus = require("../domain/accountStatus");
const generateOtp = require("../util/generateOTP")
const OtpVerification = require("../model/otpVerification");
const sendPasswordResetOtpEmail = require("../util/sendPasswordResetOtpEmail");





class AuthServices { 

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
        delete userObj.passwordResetToken;
        delete userObj.passwordResetExpires;

        return {
            success: true,
            message: "Signed in successfully.",
            token,
            user: userObj
        };
    }

    async forgotPassword(email) {
        if (!email) {
            throw new Error("Email address is required.");
        }

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

        try {
            const sendEmailFn = typeof sendPasswordResetOtpEmail === 'function'
                ? sendPasswordResetOtpEmail
                : sendPasswordResetOtpEmail.sendPasswordResetOtpEmail;
            await sendEmailFn(normalizedEmail, otp, user.businessName);
        } catch (error) {
            console.error("💥 Failed to send OTP email:", error);
            await OtpVerification.deleteMany({ email: normalizedEmail });
            throw new Error(`Failed to send OTP email: ${error.message || error}`);
        }

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

        if (!user) {
            throw new Error("User account not found.");
        }

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