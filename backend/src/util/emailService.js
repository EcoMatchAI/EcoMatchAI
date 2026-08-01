const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail shows an app password as "abcd efgh ijkl mnop". The spaces are for readability
// only — they must be stripped before the password goes over SASL.
const SMTP_PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
const SMTP_USER = process.env.SMTP_USER;

// Gmail rewrites (or rejects) any From address that is not the authenticated account,
// and a mismatched From is a common reason OTP mails land in spam. Default to the
// authenticated user unless EMAIL_FROM is a verified "send as" alias.
const EMAIL_FROM = process.env.EMAIL_FROM || `"EcoMatch" <${SMTP_USER}>`;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000
});

// Fail loudly at boot instead of silently at the first signup.
const verifyMailer = async () => {
    if (!SMTP_USER || !SMTP_PASS) {
        console.error('⚠️  SMTP_USER / SMTP_PASS are missing from .env — OTP emails cannot be sent.');
        return false;
    }
    try {
        await transporter.verify();
        console.log(`✅ SMTP ready — sending as ${EMAIL_FROM}`);
        return true;
    } catch (error) {
        console.error(`❌ SMTP login failed: ${error.message}`);
        console.error('   Gmail needs 2-Step Verification ON and a 16-character App Password in SMTP_PASS.');
        return false;
    }
};

const sendOtpEmail = async (toEmail, otp, businessName) => {
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2>EcoMatchAI Email Verification</h2>
            <p>Hello <strong>${businessName || 'EcoMatch User'}</strong>,</p>
            <p>Your 6-digit verification code is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #166534; padding: 15px; background: #f0fdf4; text-align: center;">
                ${otp}
            </div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: toEmail,
            subject: 'EcoMatchAI - 6-Digit Verification Code',
            html: htmlContent
        });
        console.log(`✉️  Verification OTP email sent to ${toEmail} (${info.response})`);
        return info;
    } catch (error) {
        // Do NOT swallow this. If it is swallowed the API answers "OTP sent" while
        // nothing was ever delivered, which is impossible to debug from the UI.
        console.error(`❌ OTP email to ${toEmail} failed: ${error.message}`);
        throw new Error('Could not send the verification email. Please try again in a moment.');
    }
};

module.exports = { sendOtpEmail, verifyMailer, transporter };
