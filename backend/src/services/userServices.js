const bcrypt = require("bcrypt");
const User = require("../model/user");
const jwtProvider = require("../util/jwtProvider");
const Address = require("../model/address");
const OtpVerification = require("../model/otpVerification");
const { sendOtpEmail } = require("../util/emailService");
const generateOtp = require("../util/generateOTP");
const accountStatus = require('../domain/accountStatus');
const UserRoles = require('../domain/Roles');

class UserServices {
    async initiateSignup(data) {
        if (data.password !== data.confirmPassword) {
            throw new Error("Passwords do not match");
        }

        const normalizedEmail = data.email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser && existingUser.isEmailVerified) {
            throw new Error("An account with this email address already exists.");
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Save or update pending user record
        let userRecord = existingUser;
        if (!userRecord) {
            userRecord = await User.create({
                businessName: data.businessName,
                email: normalizedEmail,
                password: hashedPassword,
                isEmailVerified: false
            });
        } else {
            userRecord.businessName = data.businessName;
            userRecord.password = hashedPassword;
            await userRecord.save();
        }

        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 8);
        // Store OTP with 10-minute expiry (10 * 60 * 1000 ms)
        await OtpVerification.deleteMany({ email: normalizedEmail });
        await OtpVerification.create({
            email: normalizedEmail,
            otp: hashedOtp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)

        });
        // Send OTP via Nodemailer
        await sendOtpEmail(normalizedEmail, otp, data.businessName);

        const tempToken = jwtProvider.createJwt({ email: normalizedEmail, step: 'OTP_PENDING' });
        return { email: normalizedEmail, tempToken, message: "OTP sent to email. Valid for 10 minutes." };
    }

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
        await User.updateOne({ email: normalizedEmail }, { isEmailVerified: true });
        await OtpVerification.deleteOne({ _id: otpRecord._id });

        const verificationToken = jwtProvider.createJwt({ email: normalizedEmail, isEmailVerified: true });
        return { email: normalizedEmail, verificationToken, message: "Email verified successfully." };
    }


    async completeProfile(email, profileData) {
        const normalizedEmail = email.toLowerCase().trim();
        const userRecord = await User.findOne({ email: normalizedEmail });

        if (!userRecord || !userRecord.isEmailVerified) {
            throw new Error("Email address must be verified first.");
        }

        // Role is provided by the user in the complete-profile step
        const allowedRoles = [UserRoles.BUYER, UserRoles.SELLER];
        if (!profileData.role || !allowedRoles.includes(profileData.role)) {
            throw new Error(`Invalid role. Allowed roles: ${allowedRoles.join(", ")}`);
        }

        let addressId = null;
        if (profileData.pickupAddress) {
            const newAddress = await Address.create(profileData.pickupAddress);
            addressId = newAddress._id;
        }

        userRecord.phoneNumber = profileData.phoneNumber;
        userRecord.GSTIN = profileData.GSTIN;
        userRecord.bankDetails = profileData.bankDetails;
        userRecord.IMPORT_EXPORT_Code = profileData.IMPORT_EXPORT_Code;
        userRecord.preferredPortAndAirport = profileData.preferredPortAndAirport;
        userRecord.FieldOfInterest = profileData.FieldOfInterest;
        userRecord.role = profileData.role;
        if (addressId) userRecord.address.push(addressId);

        userRecord.accountStatus = accountStatus.ACTIVE;
        await userRecord.save();

        const authToken = jwtProvider.createJwt({ email: userRecord.email, role: userRecord.role });
        return { user: userRecord, authToken };
    }

    async getUserProfile(jwt) {
        const email = jwtProvider.getEmailFromjwt(jwt)
        return this.getUserByEmail(email);
    }

    async getUserByEmail(email) {
        const user = await User.findOne({ email: email })
        if (!user) {
            throw new Error("User not found")
        }
        return user;
    }

    async getUserById(id) {
        const user = await User.findById(id);
        if (!user) {
            throw new Error("User Not Present")
        }
        return user
    }

    async getAllUsers(status) {
        const allUsers = await User.find({ accountStatus: status })
        return allUsers
    }

    async updateUser(existingUser, newUserData) {
        const updatedUser = await User.findByIdAndUpdate(existingUser._id, newUserData, { new: true });
        return updatedUser;
    }

    async updateUserStatus(userId, status) {
        return await User.findByIdAndUpdate(userId,
            { $set: { accountStatus: status } },
            { new: true })
    }

    async deleteUser(userId) {
        return await User.findByIdAndDelete(userId);
    }
}
module.exports = new UserServices();
