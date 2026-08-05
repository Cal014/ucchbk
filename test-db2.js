require('dotenv').config();
const { getDb, runStmt, getAll } = require('./db/database');
const { v4: uuidv4 } = require('uuid');

async function testInsert() {
    const db = await getDb();
    try {
        const userId = 'fa4e3414-7c5e-496b-aec5-79dc5fb80f54'; // Callistus ID
        const otpCode = '123456';
        
        console.log('Attempting insert...');
        const res = await runStmt(db,
            "INSERT INTO password_resets (id, user_id, otp_code, expires_at) VALUES (?, ?, ?, NOW() + INTERVAL '15 minutes')",
            [uuidv4(), userId, otpCode]
        );
        console.log('Insert result:', res);
        
        const check = await getAll(db, 'SELECT * FROM password_resets');
        console.log('Check DB:', check);
        
    } catch(err) {
        console.error('Error:', err);
    }
    process.exit();
}

testInsert();
