const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
    try {
        const email = 'callistusdjidah06@gmail.com';
        const u1 = await pool.query("SELECT id, name, password_hash, token_version FROM users WHERE email = $1", [email]);
        console.log("Users table:", u1.rows);

        const a1 = await pool.query("SELECT id, name, password, token_version FROM admin WHERE email = $1", [email]);
        console.log("Admin table:", a1.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
