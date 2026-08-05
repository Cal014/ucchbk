const { Resend } = require('resend');

/**
 * Email Service — OTP Delivery via Resend API
 * Bypasses SMTP entirely to work seamlessly on Render's free tier.
 */

// Initialize Resend with the API key from your environment
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Log OTP to terminal (dev fallback).
 */
function logOtpToTerminal(toEmail, otpCode) {
    console.log('\n' + '═'.repeat(50));
    console.log('  📧 PASSWORD RESET OTP (Dev Terminal Logger)');
    console.log('═'.repeat(50));
    console.log(`  To:    ${toEmail}`);
    console.log(`  Code:  ${otpCode}`);
    console.log(`  Expires in 15 minutes`);
    console.log('═'.repeat(50) + '\n');
}

/**
 * Send a password reset OTP email using Resend API.
 */
async function sendOtpEmail(toEmail, otpCode) {
    // If no API key is provided, fall back to logging in the terminal
    if (!process.env.RESEND_API_KEY) {
        console.warn('📧 RESEND_API_KEY missing — falling back to terminal logging');
        logOtpToTerminal(toEmail, otpCode);
        return;
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'UCC Hospital <onboarding@resend.dev>', // Use onboarding@resend.dev for testing on free tier
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
            </div>
            `,
        });

        if (error) {
            throw new Error(error.message);
        }

        console.log(`📧 OTP email sent to ${toEmail} via Resend. ID: ${data.id}`);
    } catch (err) {
        console.error(`📧 Failed to send OTP email to ${toEmail}:`, err.message);
        console.warn('📧 Falling back to terminal logging');
        logOtpToTerminal(toEmail, otpCode);
    }
}

module.exports = { sendOtpEmail };
