const buyer=require("../model/buyer");
const jwtProvider=require("../util/jwtProvider");
const address=require("../model/address");





class  BuyerServices{
  async createBuyer(data){
    const userFound =await buyer.findOne({email=data.email})
    if(userFound){
        throw new Error("buyer already exists");

    }
let saveAddress=data.address
saveAddress = await Address.create(data.pickupAddress);
        const newBuyer = await buyer.create({
            businessName:data.businessName,
            email:data.email,
            phoneNumber:data.phoneNumber,
            password:data.password,
            address:saveAddress._id,
            GSTIN:data.GSTIN,
            bankDetails:data.bankDetails,
            IMPORT_EXPORT_Code:data.IMPORT_EXPORT_Code,
            preferredPortAndAirport:data.preferredPortAndAirport,
            FieldOfInterest:data.FieldOfInterest

        })
        return newBuyer;
  }
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
    async getBuyerProfile(jwt){
        const email = jwtProvider.getEmailFromjwt(jwt)
        return this.getBuyerByEmail(email);
    }

    async getBuyerByEmail(email){
        const buyer = await buyer.findOne({email:email})
        if (!buyer){
            throw new Error("buyer not found")
        }
        return buyer;

    }
    
    async getBuyerById(id){
        const buyer = await buyer.findById(id);
        if (!buyer){
            throw new Error("buyer Not Present")
        }
        return buyer
    }
    async getAllBuyer(status){
        const allBuyers = await buyer.find({accountStatus:status})
        return allBuyers
    }
    async updateBuyer(existingBuyer,newBuyerData){
        const updatedBuyer = await buyer.findByIdAndUpdate(existingBuyer._id,newBuyerData,{new:true});
        return updatedBuyer;
    }
    
    async updateBuyerStatus(buyerId, status){
        return await buyer.findByIdAndUpdate(buyerId,
            {$set:{accountStatus:status}},
            {new:true})
    }

    async deleteBuyer(buyerId){
        return await buyer.findByIdAndDelete(buyerId);
    }
} 
module.exports=new BuyerServices();


