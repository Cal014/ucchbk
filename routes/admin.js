const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb, runStmt, getOne, getAll, saveDb, withTransaction } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return '"' + str + '"';
}

// GET /api/admin/users
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const db = await getDb();
        const users = await getAll(db, `
            SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at,
                   d.specialization, d.id as doctor_id
            FROM users u
            LEFT JOIN doctors d ON d.user_id = u.id
            ORDER BY u.created_at DESC
        `);
        res.json(users);
    } catch (err) {
        console.error('List users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const db = await getDb();
        const user = await getOne(db, 'SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin users' });

        await withTransaction(db, async (client) => {
            if (user.role === 'doctor') {
                const doctor = await getOne(client, 'SELECT id FROM doctors WHERE user_id = ?', [req.params.id]);
                if (doctor) {
                    await runStmt(client, 'DELETE FROM doctor_availability WHERE doctor_id = ?', [doctor.id]);
                    await runStmt(client, `DELETE FROM payments WHERE appointment_id IN (
                        SELECT id FROM appointments WHERE doctor_id = ?
                    )`, [doctor.id]);
                    await runStmt(client, 'DELETE FROM medical_records WHERE doctor_id = ?', [doctor.id]);
                    await runStmt(client, 'DELETE FROM appointments WHERE doctor_id = ?', [doctor.id]);
                    await runStmt(client, 'DELETE FROM doctors WHERE id = ?', [doctor.id]);
                }
            } else if (user.role === 'patient') {
                const patient = await getOne(client, 'SELECT id FROM patients WHERE user_id = ?', [req.params.id]);
                if (patient) {
                    await runStmt(client, 'DELETE FROM payments WHERE patient_id = ?', [patient.id]);
                    await runStmt(client, 'DELETE FROM medical_records WHERE patient_id = ?', [patient.id]);
                    await runStmt(client, 'DELETE FROM appointments WHERE patient_id = ?', [patient.id]);
                    await runStmt(client, 'DELETE FROM patients WHERE id = ?', [patient.id]);
                }
            }
            await runStmt(client, 'DELETE FROM notifications WHERE user_id = ?', [req.params.id]);
            await runStmt(client, 'DELETE FROM users WHERE id = ?', [req.params.id]);
        });

        res.json({ message: `User ${user.name} deleted` });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// GET /api/admin/stats
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        const db = await getDb();

        const totalUsers        = (await getOne(db, 'SELECT COUNT(*) as count FROM users')).count;
        const totalDoctors      = (await getOne(db, "SELECT COUNT(*) as count FROM users WHERE role = 'doctor'")).count;
        const totalPatients     = (await getOne(db, "SELECT COUNT(*) as count FROM users WHERE role = 'patient'")).count;
        const totalAppointments = (await getOne(db, 'SELECT COUNT(*) as count FROM appointments')).count;
        const scheduledAppointments = (await getOne(db, "SELECT COUNT(*) as count FROM appointments WHERE status IN ('scheduled', 'rescheduled')")).count;
        const completedAppointments = (await getOne(db, "SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'")).count;
        const cancelledAppointments = (await getOne(db, "SELECT COUNT(*) as count FROM appointments WHERE status = 'cancelled'")).count;

        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = (await getOne(db,
            "SELECT COUNT(*) as count FROM appointments WHERE date = ? AND status IN ('scheduled', 'rescheduled')",
            [today]
        )).count;

        const recentAppointments = await getAll(db, `
            SELECT a.*, pu.name as patient_name, du.name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users pu ON p.user_id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            ORDER BY a.created_at DESC LIMIT 10
        `);

        res.json({
            totalUsers,
            totalDoctors,
            totalPatients,
            totalAppointments,
            scheduledAppointments,
            completedAppointments,
            cancelledAppointments,
            todayAppointments,
            recentAppointments
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// GET /api/admin/export
router.get('/export', authenticate, authorize('admin'), async (req, res) => {
    try {
        const db = await getDb();
        const appointments = await getAll(db, `
            SELECT a.id, a.date, a.time_slot, a.status, a.notes, a.created_at,
                   pu.name as patient_name, pu.email as patient_email,
                   du.name as doctor_name, d.specialization
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users pu ON p.user_id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            ORDER BY a.date DESC
        `);

        let csv = 'ID,Date,Time,Status,Patient,Patient Email,Doctor,Specialization,Notes,Created At\n';
        for (const a of appointments) {
            csv += [
                csvEscape(a.id), csvEscape(a.date), csvEscape(a.time_slot),
                csvEscape(a.status), csvEscape(a.patient_name), csvEscape(a.patient_email),
                csvEscape(a.doctor_name), csvEscape(a.specialization),
                csvEscape(a.notes), csvEscape(a.created_at)
            ].join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=appointments_export.csv');
        res.send(csv);
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

// POST /api/admin/doctors — Admin-only doctor account creation
router.post('/doctors', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { name, email, password, specialization, consultation_fee, phone, bio } = req.body;

        if (!name || !email || !password || !specialization) {
            return res.status(400).json({ error: 'Name, email, password, and specialization are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const db = await getDb();
        const existing = await getOne(db, 'SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await withTransaction(db, async (client) => {
            const userId = uuidv4();
            const doctorId = uuidv4();

            await runStmt(client,
                'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, name, email, passwordHash, 'doctor', phone || null]
            );

            await runStmt(client,
                'INSERT INTO doctors (id, user_id, specialization, bio, consultation_fee) VALUES (?, ?, ?, ?, ?)',
                [doctorId, userId, specialization, bio || '', parseFloat(consultation_fee) || 0]
            );

            await runStmt(client,
                'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                [uuidv4(), userId, `Welcome Dr. ${name}! Your verified doctor account has been created by the administrator.`, 'success']
            );
        });

        saveDb();
        res.status(201).json({ message: `Doctor account for ${name} created successfully.` });
    } catch (err) {
        console.error('Admin create doctor error:', err);
        res.status(500).json({ error: 'Failed to create doctor account' });
    }
});

module.exports = router;
