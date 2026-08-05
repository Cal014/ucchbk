const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function test() {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('today:', today);
        const result = await pool.query(`
            SELECT q.*, d.specialization, u.name as doctor_name 
            FROM patient_queues q
            JOIN doctors d ON q.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE q.queue_date = $1 AND q.status NOT IN ('completed', 'no_show', 'cancelled')
            ORDER BY q.check_in_time DESC LIMIT 1
        `, [today]);
        console.log('Result:', result.rows);
    } catch(err) { 
        console.error('Error:', err); 
    }
    pool.end();
}
test();
