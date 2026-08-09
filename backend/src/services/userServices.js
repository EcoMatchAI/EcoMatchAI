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

        await this.issueOtp(normalizedEmail, data.businessName);

        const tempToken = jwtProvider.createJwt({ email: normalizedEmail, step: 'OTP_PENDING' });
        return { email: normalizedEmail, tempToken, message: "OTP sent to email. Valid for 10 minutes." };
    }

    // Creates a fresh 10-minute OTP and emails it.
    // If the email cannot be sent, the OTP record is removed again — otherwise the user
    // sits on a code-entry screen waiting for a code that was never delivered.
    async issueOtp(normalizedEmail, businessName) {
        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, 8);

        await OtpVerification.deleteMany({ email: normalizedEmail });
        await OtpVerification.create({
            email: normalizedEmail,
            otp: hashedOtp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        });

        try {
            await sendOtpEmail(normalizedEmail, otp, businessName);
        } catch (error) {
            await OtpVerification.deleteMany({ email: normalizedEmail });
            throw error;
        }
    }

    async resendSignupOtp(email) {
        if (!email) {
            throw new Error("Email address is required.");
        }
        const normalizedEmail = email.toLowerCase().trim();
        const userRecord = await User.findOne({ email: normalizedEmail });

        if (!userRecord) {
            throw new Error("No pending signup found for this email. Please sign up again.");
        }
        if (userRecord.isEmailVerified) {
            throw new Error("This email address is already verified. Please sign in.");
        }

        await this.issueOtp(normalizedEmail, userRecord.businessName);
        return { email: normalizedEmail, message: "A new OTP has been sent. Valid for 10 minutes." };
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
        let role = profileData.role;
        if (role === 'SELLER') role = UserRoles.SELLER;
        if (role === 'BUYER') role = UserRoles.BUYER;

        const allowedRoles = [UserRoles.BUYER, UserRoles.SELLER];
        if (!role || !allowedRoles.includes(role)) {
            throw new Error(`Invalid role. Allowed roles: ${allowedRoles.join(", ")}`);
        }
        profileData.role = role;

        let addressId = null;
        if (profileData.pickupAddress) {
            const newAddress = await Address.create(profileData.pickupAddress);
            addressId = newAddress._id;
        }

        // Only overwrite what the request actually sent. Assigning undefined wiped
        // out values the user had already saved when they revisited this step.
        const assignIfPresent = (field) => {
            if (profileData[field] !== undefined) userRecord[field] = profileData[field];
        };
        [
            'phoneNumber', 'GSTIN', 'bankDetails', 'IMPORT_EXPORT_Code',
            'preferredPortAndAirport', 'FieldOfInterest',
            'businessTypes', 'businessDetails', 'generatorInfo', 'upcyclerInfo', 'materials'
        ].forEach(assignIfPresent);

        userRecord.role = profileData.role;

        // The questionnaire asks for the operating city / GST separately from the
        // top-level fields; keep them in sync so the profile page shows one truth.
        if (profileData.businessDetails?.gstNumber && !userRecord.GSTIN) {
            userRecord.GSTIN = profileData.businessDetails.gstNumber;
        }
        if (addressId) userRecord.address.push(addressId);

        userRecord.accountStatus = accountStatus.ACTIVE;
        await userRecord.save();

        const authToken = jwtProvider.createJwt({ email: userRecord.email, role: userRecord.role });

        // userRecord was loaded without .select('-password'), so returning it raw
        // shipped the bcrypt hash to the client on every signup.
        const safeUser = userRecord.toObject();
        delete safeUser.password;
        return { user: safeUser, authToken };
    }

    async getUserProfile(jwt) {
        const email = jwtProvider.getEmailFromjwt(jwt)
        return this.getUserByEmail(email);
    }

    async getUserByEmail(email) {
        const user = await User.findOne({ email: email }).select('-password')
        if (!user) {
            throw new Error("User not found")
        }
        return user;
    }

    async getUserById(id) {
        const user = await User.findById(id).select('-password');
        if (!user) {
            throw new Error("User Not Present")
        }
        return user
    }

    async getAllUsers(status) {
        const filter = status ? { accountStatus: status } : {};
        const allUsers = await User.find(filter).select('-password')
        return allUsers
    }

    async updateUser(existingUser, newUserData) {
        // Allow-list: a user must never be able to promote themselves by sending
        // role / accountStatus / isEmailVerified / password in the request body.
        const EDITABLE = [
            'businessName', 'phoneNumber', 'GSTIN', 'IMPORT_EXPORT_Code',
            'preferredPortAndAirport', 'FieldOfInterest', 'bankDetails',
            'businessTypes', 'businessDetails', 'generatorInfo', 'upcyclerInfo', 'materials'
        ];
        const updates = {};
        for (const field of EDITABLE) {
            if (newUserData[field] !== undefined) updates[field] = newUserData[field];
        }

        // `role` is deliberately NOT in EDITABLE — a free-text role would let a
        // user make themselves ADMIN. But switching between the two self-service
        // roles is legitimate (the preferences screen offers it), so allow exactly
        // those two and nothing else.
        //
        // The stored values are prefixed ('ROLE_SELLER'), while the client sends the
        // bare name ('SELLER') — the same normalisation completeProfile does.
        if (newUserData.role !== undefined) {
            const normalized = newUserData.role === 'SELLER' ? UserRoles.SELLER
                : newUserData.role === 'BUYER' ? UserRoles.BUYER
                : newUserData.role;

            const selfAssignable = [UserRoles.BUYER, UserRoles.SELLER];
            if (!selfAssignable.includes(normalized)) {
                throw new Error('Invalid role. Allowed roles: BUYER, SELLER');
            }
            updates.role = normalized;
        }

        const updatedUser = await User.findByIdAndUpdate(existingUser._id, updates, {
            new: true,
            runValidators: true
        }).select('-password');
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
