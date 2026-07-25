const seller = require("../model/seller");
const jwtProvider = require("../util/jwtProvider");
const address = require("../model/address");

const generateOtp = require("../util/generateOTP");


 


class SellerServices {
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

       const otp= generateOtp();
        // Send OTP via Nodemailer
        await sendOtpEmail(normalizedEmail, otp, businessName);

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
        await Seller.updateOne({ email: normalizedEmail }, { isEmailVerified: true });
        await OtpVerification.deleteOne({ _id: otpRecord._id });

        const verificationToken = jwtProvider.createJwt({ email: normalizedEmail, isEmailVerified: true });
        return { email: normalizedEmail, verificationToken, message: "Email verified successfully." };
    }

    
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
    async getSellerProfile(jwt) {
        const email = jwtProvider.getEmailFromjwt(jwt)
        return this.getSellerByEmail(email);
    }

    async getSellerByEmail(email) {
        const seller = await Seller.findOne({ email: email })
        if (!seller) {
            throw new Error("Seller not found")
        }
        return seller;

    }

    async getSellerById(id) {
        const seller = await Seller.findById(id);
        if (!seller) {
            throw new Error("Seller Not Present")
        }
        return seller
    }
    async getAllSeller(status) {
        const allSellers = await Seller.find({ accountStatus: status })
        return allSellers
    }
    async updateSeller(existingSeller, newSellerData) {
        const updatedSeller = await Seller.findByIdAndUpdate(existingSeller._id, newSellerData, { new: true });
        return updatedSeller;
    }

    async updateSellerStatus(sellerId, status) {
        return await Seller.findByIdAndUpdate(sellerId,
            { $set: { accountStatus: status } },
            { new: true })
    }

    async deleteSeller(sellerId) {
        return await Seller.findByIdAndDelete(sellerId);
    }
}
module.exports = new SellerServices();


