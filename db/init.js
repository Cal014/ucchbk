const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, runStmt, getOne, execSQL, withTransaction } = require('./database');

async function initializeDatabase() {
    const db = await getDb();

    // Acquire a dedicated client to run the schema SQL as a single transaction
    const client = await db.connect();
    try {
        const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
        await execSQL(client, schema);
        console.log('Schema applied');
    } finally {
        client.release();
    }

    // Seed default admin if not present
    const existingAdmin = await getOne(db, 'SELECT id FROM admin WHERE email = ?', ['admin@gmail.com']);
    if (!existingAdmin) {
        const adminId = uuidv4();
        const passwordHash = await bcrypt.hash('admin123', 10);
        await runStmt(db,
            'INSERT INTO admin (id, name, email, password, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [adminId, 'System Admin', 'admin@gmail.com', passwordHash, 'admin', '0530000000']
        );
        console.log('Default admin seeded: admin@gmail.com / admin123');
    }


    console.log('Database initialized successfully');
}

module.exports = { initializeDatabase };
