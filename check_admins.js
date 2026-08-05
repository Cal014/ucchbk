const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const a1 = await pool.query("SELECT id, name, email, password, token_version FROM admin");
        console.log("Admin table:", a1.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
