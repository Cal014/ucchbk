const email = 'otp_user@example.com';
const password = 'Password1!';
const name = 'OTP User';
const new_password = 'NewPassword2@';

async function test() {
    let res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
    });
    console.log("Register:", res.status);

    res = await fetch('http://localhost:3000/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    console.log("Forgot Password:", res.status);

    const { Pool } = require('pg');
    require('dotenv').config();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    
    // Get OTP
    let otpRes = await pool.query("SELECT otp_code FROM password_resets ORDER BY created_at DESC LIMIT 1");
    let otp = otpRes.rows[0].otp_code;
    console.log("OTP:", otp);
    
    // Confirm Reset
    res = await fetch('http://localhost:3000/api/auth/confirm-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password })
    });
    console.log("Confirm Reset:", res.status, await res.json());

    // Try Login with original password
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    console.log("Login with Original:", res.status, await res.json());

    // Try Login with new password
    res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: new_password })
    });
    console.log("Login with New:", res.status, await res.json());

    pool.end();
}
test();
