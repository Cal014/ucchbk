/**
 * Email Service — OTP Delivery via Google SMTP
 *
 * SETUP:
 *   1. Use a Gmail account or Google Workspace account.
 *   2. Turn on 2-Step Verification for the Google account.
 *   3. Generate an App Password in the account's Security settings.
 *   4. Add SMTP_USER (your email) and SMTP_PASS (your app password) to your .env file.
 */
const nodemailer = require('nodemailer');


/**
 * Log OTP to terminal (always called as a fallback).
 */
function logOtpToTerminal(toEmail, otpCode) {
    console.log('\n' + '═'.repeat(50));
    console.log('  📧 PASSWORD RESET OTP');
    console.log('═'.repeat(50));
    console.log(`  To:    ${toEmail}`);
    console.log(`  Code:  ${otpCode}`);
    console.log(`  Expires in 15 minutes`);
    console.log('═'.repeat(50) + '\n');
}

/**
 * Send a password-reset OTP email via Brevo HTTP API.
 */
async function sendOtpEmail(toEmail, otpCode) {
    // Always log to terminal so devs can grab the code
    logOtpToTerminal(toEmail, otpCode);

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
        console.warn('📧 SMTP_USER or SMTP_PASS missing — OTP logged to terminal only');
        return;
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: smtpUser,
                pass: smtpPass,
            },
        });

        const info = await transporter.sendMail({
            from: `"Hospital Appointment System" <${smtpUser}>`,
            to: toEmail,
            subject: 'Password Reset — Hospital Appointment System',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1a1a2e; color: #e0e0e0; border-radius: 12px;">
                <h2 style="color: #d4a843; text-align: center; margin-bottom: 24px;">Password Reset Code</h2>
                <p style="text-align: center; font-size: 14px; color: #999;">You requested a password reset for your Hospital Appointment System account.</p>
                <div style="text-align: center; margin: 32px 0;">
                    <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #d4a843; background: rgba(212,168,67,0.1); padding: 16px 32px; border-radius: 8px; border: 2px dashed rgba(212,168,67,0.3);">${otpCode}</span>
                </div>
                <p style="text-align: center; font-size: 13px; color: #777;">This code expires in <strong>15 minutes</strong>.</p>
                <p style="text-align: center; font-size: 12px; color: #555; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
            </div>
            `,
        });

        console.log(`📧 OTP email sent to ${toEmail} via Google SMTP (messageId: ${info.messageId})`);
    } catch (err) {
        console.error(`📧 Failed to send OTP to ${toEmail}:`, err.message);
        console.log('📧 OTP is still available in the terminal log above.');
    }
}

module.exports = { sendOtpEmail };
