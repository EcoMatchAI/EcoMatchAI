const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("../model/user");
const jwtProvider = require("../util/jwtProvider");
const { sendPasswordResetEmail } = require("../util/emailService");
const accountStatus = require("../domain/accountStatus");






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
}
module.exports = new AuthServices();