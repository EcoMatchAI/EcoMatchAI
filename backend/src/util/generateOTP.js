function generateOTP(){
     const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOtp = await bcrypt.hash(otp, 8);

        // Store OTP with 10-minute expiry (10 * 60 * 1000 ms)
        await OtpVerification.deleteMany({ email: normalizedEmail });
        await OtpVerification.create({
            email: normalizedEmail,
            otp: hashedOtp,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000)
        
        });
        return otp;
}

module.exports = generateOTP;