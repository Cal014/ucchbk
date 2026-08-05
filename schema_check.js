const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
async function run() {
    try {
        const res = await pool.query("SELECT table_name, column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name IN ('admin', 'users')");
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
