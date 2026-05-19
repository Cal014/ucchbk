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
        console.log('✅ Schema applied');
    } finally {
        client.release();
    }

    // Seed default admin if not present
    const existingAdmin = await getOne(db, 'SELECT id FROM users WHERE email = ?', ['admin@hospital.com']);
    if (!existingAdmin) {
        const adminId = uuidv4();
        const passwordHash = await bcrypt.hash('admin123', 10);
        await runStmt(db,
            'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
            [adminId, 'System Admin', 'admin@hospital.com', passwordHash, 'admin', '+1-000-000-0000']
        );
        console.log('✅ Default admin seeded: admin@hospital.com / admin123');
    }

    // Seed demo doctor 1
    const existingDoctor = await getOne(db, 'SELECT id FROM users WHERE email = ?', ['dr.smith@hospital.com']);
    if (!existingDoctor) {
        await withTransaction(db, async (client) => {
            const doctorUserId = uuidv4();
            const doctorId = uuidv4();
            const passwordHash = await bcrypt.hash('doctor123', 10);

            await runStmt(client,
                'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
                [doctorUserId, 'Dr. Sarah Smith', 'dr.smith@hospital.com', passwordHash, 'doctor', '+1-555-0101']
            );
            await runStmt(client,
                'INSERT INTO doctors (id, user_id, specialization, bio, consultation_fee) VALUES (?, ?, ?, ?, ?)',
                [doctorId, doctorUserId, 'General Medicine', 'Experienced general practitioner with 10+ years of clinical practice.', 50]
            );

            for (let day = 1; day <= 5; day++) {
                await runStmt(client,
                    'INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
                    [uuidv4(), doctorId, day, '09:00', '17:00']
                );
            }
        });
        console.log('✅ Demo doctor seeded: dr.smith@hospital.com / doctor123');
    }

    // Seed demo doctor 2
    const existingDoctor2 = await getOne(db, 'SELECT id FROM users WHERE email = ?', ['dr.jones@hospital.com']);
    if (!existingDoctor2) {
        await withTransaction(db, async (client) => {
            const doctorUserId2 = uuidv4();
            const doctorId2 = uuidv4();
            const passwordHash = await bcrypt.hash('doctor123', 10);

            await runStmt(client,
                'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
                [doctorUserId2, 'Dr. Michael Jones', 'dr.jones@hospital.com', passwordHash, 'doctor', '+1-555-0102']
            );
            await runStmt(client,
                'INSERT INTO doctors (id, user_id, specialization, bio, consultation_fee) VALUES (?, ?, ?, ?, ?)',
                [doctorId2, doctorUserId2, 'Cardiology', 'Board-certified cardiologist specializing in preventive heart care.', 75]
            );

            for (let day = 1; day <= 5; day++) {
                await runStmt(client,
                    'INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
                    [uuidv4(), doctorId2, day, '10:00', '16:00']
                );
            }
        });
        console.log('✅ Demo doctor 2 seeded: dr.jones@hospital.com / doctor123');
    }

    console.log('✅ Database initialized successfully');
}

module.exports = { initializeDatabase };
