require('dotenv').config();

// Reuse the single verified transporter instead of opening a second SMTP pool.
const { transporter } = require('./emailService');

const EMAIL_FROM = process.env.EMAIL_FROM || `"EcoMatch Security" <${process.env.SMTP_USER}>`;

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
            from: EMAIL_FROM,
            to: toEmail,
            subject: 'EcoMatch - 6-Digit Password Reset Code',
            html: htmlContent
        });
        console.log(`✉️  Password reset OTP email sent to ${toEmail} (${info.response})`);
        return info;
    } catch (error) {
        console.error(`❌ Password reset email to ${toEmail} failed: ${error.message}`);
        throw new Error('Could not send the reset email. Please try again in a moment.');
    }
};

sendPasswordResetOtpEmail.sendPasswordResetOtpEmail = sendPasswordResetOtpEmail;
module.exports = sendPasswordResetOtpEmail;
