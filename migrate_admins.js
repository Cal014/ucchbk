require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log('1. Finding password_resets foreign key constraint...');
        const res = await client.query(`
            SELECT constraint_name 
            FROM information_schema.key_column_usage 
            WHERE table_name = 'password_resets' AND column_name = 'user_id'
        `);
        
        if (res.rows.length > 0) {
            const constraintName = res.rows[0].constraint_name;
            console.log(`Dropping constraint: ${constraintName}`);
            await client.query(`ALTER TABLE password_resets DROP CONSTRAINT IF EXISTS "${constraintName}"`);
        } else {
            console.log('No foreign key constraint found on password_resets.user_id');
        }

        console.log('1.5. Dropping unexpected foreign key from admin table pointing to users...');
        await client.query(`ALTER TABLE admin DROP CONSTRAINT IF EXISTS "admin_id_fkey"`);

        console.log('2. Migrating admins from users table to admin table...');
        const migrateRes = await client.query(`
            INSERT INTO admin (id, name, email, role, phone, password, token_version, created_at, updated_at)
            SELECT id, name, email, role, phone, password_hash, token_version, created_at, updated_at
            FROM users
            WHERE role = 'admin'
            ON CONFLICT (id) DO NOTHING
            RETURNING id
        `);
        console.log(`Migrated ${migrateRes.rowCount} admins.`);

        console.log('3. Deleting migrated admins from users table...');
        const delRes = await client.query(`
            DELETE FROM users WHERE role = 'admin'
        `);
        console.log(`Deleted ${delRes.rowCount} admins from users table.`);

        await client.query('COMMIT');
        console.log('Migration successful!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

runMigration();
