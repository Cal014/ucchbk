/**
 * Email Service — OTP Delivery via Brevo (formerly Sendinblue) API
 *
 * WHY BREVO?
 *   - Render blocks outbound SMTP (ports 25/465/587)
 *   - Resend free tier only delivers to the account owner's email
 *   - Brevo free tier: 300 emails/day to ANY recipient
 *   - Only requires verifying your sender email (no domain needed)
 *   - Uses HTTPS API, so Render does NOT block it
 *
 * SETUP:
 *   1. Sign up at https://brevo.com
 *   2. Verify your sender email in Brevo dashboard
 *   3. Get API key from Settings → SMTP & API → API Keys
 *   4. Add BREVO_API_KEY to your .env file
 */

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

    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
        console.warn('📧 BREVO_API_KEY missing — OTP logged to terminal only');
        return;
    }

    const senderEmail = process.env.SMTP_USER || 'noreply@ucchospital.com';

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                sender: { name: 'UCC Hospital', email: senderEmail },
                to: [{ email: toEmail }],
                subject: 'Password Reset — UCC Hospital Booking Platform',
                htmlContent: `
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
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || JSON.stringify(data));
        }

        console.log(`📧 OTP email sent to ${toEmail} via Brevo (messageId: ${data.messageId})`);
    } catch (err) {
        console.error(`📧 Failed to send OTP to ${toEmail}:`, err.message);
        console.log('📧 OTP is still available in the terminal log above.');
    }
}

module.exports = { sendOtpEmail };
