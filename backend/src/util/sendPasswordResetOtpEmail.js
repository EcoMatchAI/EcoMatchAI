const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000
});

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

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || `"EcoMatch Security" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: 'EcoMatch - 6-Digit Password Reset Code',
            html: htmlContent
        });
        console.log(`✉️ Password reset OTP email sent to ${toEmail}`);
        return info;
    } catch (error) {
        console.error(`⚠️ Password reset email sending failed (${error.message}). Development OTP for ${toEmail} is: [ ${otp} ]`);
        return { success: false, error: error.message, otp };
    }
};

sendPasswordResetOtpEmail.sendPasswordResetOtpEmail = sendPasswordResetOtpEmail;
module.exports = sendPasswordResetOtpEmail;
