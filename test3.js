const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
    try {
        const today = '2026-08-02';
        const doc = 'fc1c5022-1c2e-4b9e-a7a3-80d849ca38d2';
        const ticket = 2;
        
        const ahead = await pool.query(`
            SELECT COUNT(*) as count FROM patient_queues 
            WHERE doctor_id = $1 AND queue_date = $2 AND status IN ('checked_in') AND ticket_number < $3
        `, [doc, today, ticket]);
        console.log('Ahead:', ahead.rows);
        
        const serving = await pool.query(`
            SELECT ticket_code FROM patient_queues
            WHERE doctor_id = $1 AND queue_date = $2 AND status IN ('called', 'in_consultation')
            ORDER BY ticket_number ASC LIMIT 1
        `, [doc, today]);
        console.log('Serving:', serving.rows);
        
    } catch(err) { 
        console.error('Error:', err); 
    }
    pool.end();
}
test();
