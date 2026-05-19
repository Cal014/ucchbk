const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, runStmt, getOne, getAll, saveDb, withTransaction } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/appointments — book
router.post('/', authenticate, authorize('patient'), async (req, res) => {
    try {
        const { doctor_id, date, time_slot, notes } = req.body;

        if (!doctor_id || !date || !time_slot) {
            return res.status(400).json({ error: 'doctor_id, date, and time_slot are required' });
        }

        const today = new Date().toISOString().split('T')[0];
        if (date < today) {
            return res.status(400).json({ error: 'Cannot book appointments in the past' });
        }

        const db = await getDb();

        const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (!patient) {
            return res.status(404).json({ error: 'Patient profile not found' });
        }

        const doctor = await getOne(db,
            'SELECT d.id, u.name as doctor_name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?',
            [doctor_id]
        );
        if (!doctor) {
            return res.status(404).json({ error: 'Doctor not found' });
        }

        const appointmentId = uuidv4();

        await withTransaction(db, async (client) => {
            // Double booking check
            const existingSlot = await getOne(client,
                "SELECT id FROM appointments WHERE doctor_id = ? AND date = ? AND time_slot = ? AND status IN ('scheduled', 'rescheduled')",
                [doctor_id, date, time_slot]
            );
            if (existingSlot) throw new Error('SLOT_TAKEN');

            // Patient conflict check
            const patientConflict = await getOne(client,
                "SELECT id FROM appointments WHERE patient_id = ? AND date = ? AND time_slot = ? AND status IN ('scheduled', 'rescheduled')",
                [patient.id, date, time_slot]
            );
            if (patientConflict) throw new Error('PATIENT_CONFLICT');

            await runStmt(client,
                "INSERT INTO appointments (id, patient_id, doctor_id, date, time_slot, status, notes) VALUES (?, ?, ?, ?, ?, 'scheduled', ?)",
                [appointmentId, patient.id, doctor_id, date, time_slot, notes || '']
            );

            const doctorUser = await getOne(client, 'SELECT user_id FROM doctors WHERE id = ?', [doctor_id]);

            await runStmt(client,
                'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                [uuidv4(), req.user.id, `Appointment confirmed with ${doctor.doctor_name} on ${date} at ${time_slot}`, 'success']
            );

            if (doctorUser) {
                await runStmt(client,
                    'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                    [uuidv4(), doctorUser.user_id, `New appointment with ${req.user.name} on ${date} at ${time_slot}`, 'info']
                );
            }
        });

        res.status(201).json({
            message: 'Appointment booked successfully',
            appointment: { id: appointmentId, doctor: doctor.doctor_name, date, time_slot, status: 'scheduled' }
        });
    } catch (err) {
        if (err.message === 'SLOT_TAKEN') {
            return res.status(409).json({ error: 'This time slot is already booked. Please choose another.' });
        }
        if (err.message === 'PATIENT_CONFLICT') {
            return res.status(409).json({ error: 'You already have an appointment at this time.' });
        }
        console.error('Book appointment error:', err);
        res.status(500).json({ error: 'Failed to book appointment' });
    }
});

// GET /api/appointments
router.get('/', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        let appointments;

        if (req.user.role === 'patient') {
            const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient) return res.json([]);

            appointments = await getAll(db, `
                SELECT a.*, u.name as doctor_name, d.specialization
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users u ON d.user_id = u.id
                WHERE a.patient_id = ?
                ORDER BY a.date DESC, a.time_slot DESC
            `, [patient.id]);

        } else if (req.user.role === 'doctor') {
            const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
            if (!doctor) return res.json([]);

            appointments = await getAll(db, `
                SELECT a.*, u.name as patient_name, p.blood_group
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE a.doctor_id = ?
                ORDER BY a.date DESC, a.time_slot DESC
            `, [doctor.id]);

        } else {
            appointments = await getAll(db, `
                SELECT a.*,
                    pu.name as patient_name,
                    du.name as doctor_name,
                    d.specialization
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users pu ON p.user_id = pu.id
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users du ON d.user_id = du.id
                ORDER BY a.date DESC, a.time_slot DESC
            `);
        }

        res.json(appointments || []);
    } catch (err) {
        console.error('List appointments error:', err);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// PUT /api/appointments/:id — reschedule
router.put('/:id', authenticate, authorize('patient', 'admin'), async (req, res) => {
    try {
        const { date, time_slot } = req.body;
        if (!date || !time_slot) {
            return res.status(400).json({ error: 'date and time_slot are required' });
        }

        const db = await getDb();
        const appointment = await getOne(db, 'SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        if (appointment.status === 'cancelled' || appointment.status === 'completed') {
            return res.status(400).json({ error: 'Cannot reschedule a ' + appointment.status + ' appointment' });
        }

        if (req.user.role === 'patient') {
            const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient || patient.id !== appointment.patient_id) {
                return res.status(403).json({ error: 'You can only reschedule your own appointments' });
            }
        }

        await withTransaction(db, async (client) => {
            const conflict = await getOne(client,
                "SELECT id FROM appointments WHERE doctor_id = ? AND date = ? AND time_slot = ? AND status IN ('scheduled', 'rescheduled') AND id != ?",
                [appointment.doctor_id, date, time_slot, req.params.id]
            );
            if (conflict) throw new Error('SLOT_TAKEN');

            await runStmt(client,
                "UPDATE appointments SET date = ?, time_slot = ?, status = 'rescheduled', updated_at = NOW() WHERE id = ?",
                [date, time_slot, req.params.id]
            );

            const doctorUser = await getOne(client,
                'SELECT u.id as user_id, u.name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?',
                [appointment.doctor_id]
            );
            const patientUser = await getOne(client,
                'SELECT u.id as user_id, u.name FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
                [appointment.patient_id]
            );

            if (doctorUser) {
                await runStmt(client, 'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                    [uuidv4(), doctorUser.user_id, `Appointment with ${patientUser?.name || 'patient'} rescheduled to ${date} at ${time_slot}`, 'warning']
                );
            }
            if (patientUser) {
                await runStmt(client, 'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                    [uuidv4(), patientUser.user_id, `Your appointment with ${doctorUser?.name || 'doctor'} has been rescheduled to ${date} at ${time_slot}`, 'warning']
                );
            }
        });

        res.json({ message: 'Appointment rescheduled', date, time_slot });
    } catch (err) {
        if (err.message === 'SLOT_TAKEN') {
            return res.status(409).json({ error: 'New time slot is already booked' });
        }
        console.error('Reschedule error:', err);
        res.status(500).json({ error: 'Failed to reschedule appointment' });
    }
});

// PATCH /api/appointments/:id/cancel
router.patch('/:id/cancel', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        const appointment = await getOne(db, 'SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
        if (appointment.status === 'cancelled') return res.status(400).json({ error: 'Appointment is already cancelled' });
        if (appointment.status === 'completed') return res.status(400).json({ error: 'Cannot cancel a completed appointment' });

        if (req.user.role === 'patient') {
            const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient || patient.id !== appointment.patient_id) {
                return res.status(403).json({ error: 'You can only cancel your own appointments' });
            }
        } else if (req.user.role === 'doctor') {
            const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
            if (!doctor || doctor.id !== appointment.doctor_id) {
                return res.status(403).json({ error: 'You can only cancel your own appointments' });
            }
        }

        await runStmt(db,
            "UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = ?",
            [req.params.id]
        );

        const doctorUser = await getOne(db,
            'SELECT u.id as user_id, u.name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?',
            [appointment.doctor_id]
        );
        const patientUser = await getOne(db,
            'SELECT u.id as user_id, u.name FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
            [appointment.patient_id]
        );

        if (doctorUser) {
            await runStmt(db, 'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                [uuidv4(), doctorUser.user_id, `Appointment on ${appointment.date} at ${appointment.time_slot} has been cancelled`, 'error']
            );
        }
        if (patientUser) {
            await runStmt(db, 'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                [uuidv4(), patientUser.user_id, `Your appointment on ${appointment.date} at ${appointment.time_slot} has been cancelled`, 'error']
            );
        }

        res.json({ message: 'Appointment cancelled' });
    } catch (err) {
        console.error('Cancel error:', err);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
});

// PATCH /api/appointments/:id/complete
router.patch('/:id/complete', authenticate, authorize('doctor'), async (req, res) => {
    try {
        const { notes } = req.body;
        const db = await getDb();
        const appointment = await getOne(db, 'SELECT * FROM appointments WHERE id = ?', [req.params.id]);
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doctor || doctor.id !== appointment.doctor_id) {
            return res.status(403).json({ error: 'You can only complete your own appointments' });
        }
        if (appointment.status === 'cancelled') return res.status(400).json({ error: 'Cannot complete a cancelled appointment' });
        if (appointment.status === 'completed') return res.status(400).json({ error: 'Appointment is already completed' });

        await runStmt(db,
            "UPDATE appointments SET status = 'completed', notes = COALESCE(?, notes), updated_at = NOW() WHERE id = ?",
            [notes || null, req.params.id]
        );

        const patientUser = await getOne(db,
            'SELECT u.id as user_id FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?',
            [appointment.patient_id]
        );
        if (patientUser) {
            await runStmt(db, 'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                [uuidv4(), patientUser.user_id, `Your appointment on ${appointment.date} has been marked as completed`, 'success']
            );
        }

        res.json({ message: 'Appointment completed' });
    } catch (err) {
        console.error('Complete error:', err);
        res.status(500).json({ error: 'Failed to complete appointment' });
    }
});

module.exports = router;
