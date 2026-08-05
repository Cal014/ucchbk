const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
    try {
        const res = await pool.query('SELECT * FROM medical_records');
        console.log('Medical records count:', res.rows.length);
        
        // Also let's check appointments schema
        const appts = await pool.query('SELECT * FROM appointments LIMIT 1');
        console.log('Sample appointment:', appts.rows[0]);
    } catch(err) { 
        console.error('Error:', err); 
    }
    pool.end();
}
test();
