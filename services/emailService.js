const nodemailer = require('nodemailer');

/**
 * Email Service — 100% Free OTP Delivery
 * Uses Gmail SMTP when credentials are present, falls back to terminal logging.
 */

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });
        console.log('📧 Email service: Gmail SMTP configured');
    } else {
        console.log('📧 Email service: Dev Terminal Logger (no SMTP credentials)');
    }

    return transporter;
}

/**
 * Send a password reset OTP email.
 * Falls back to console logging when SMTP is not configured.
 */
async function sendOtpEmail(toEmail, otpCode) {
    const transport = getTransporter();

    if (transport) {
        // Production: send real email via Gmail SMTP
        await transport.sendMail({
            from: `"UCC Hospital" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: 'Password Reset — UCC Hospital Booking Platform',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #1a1a2e; color: #e0e0e0; border-radius: 12px;">
                    <h2 style="color: #d4a843; text-align: center; margin-bottom: 24px;">Password Reset Code</h2>
                    <p style="text-align: center; font-size: 14px; color: #999;">You requested a password reset for your UCC Hospital account.</p>
                    <div style="text-align: center; margin: 32px 0;">
                        <span style="display: inline-block; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #d4a843; background: rgba(212,168,67,0.1); padding: 16px 32px; border-radius: 8px; border: 2px dashed rgba(212,168,67,0.3);">${otpCode}</span>
                    </div>
                    <p style="text-align: center; font-size: 13px; color: #777;">This code expires in <strong>15 minutes</strong>.</p>
                    <p style="text-align: center; font-size: 12px; color: #555; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
                </div>
            `,
        });
        console.log(`📧 OTP email sent to ${toEmail}`);
    } else {
        // Dev fallback: log to terminal
        console.log('\n' + '═'.repeat(50));
        console.log('  📧 PASSWORD RESET OTP (Dev Terminal Logger)');
        console.log('═'.repeat(50));
        console.log(`  To:    ${toEmail}`);
        console.log(`  Code:  ${otpCode}`);
        console.log(`  Expires in 15 minutes`);
        console.log('═'.repeat(50) + '\n');
    }
}

module.exports = { sendOtpEmail };
