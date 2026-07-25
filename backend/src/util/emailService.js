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