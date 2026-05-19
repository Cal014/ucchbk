const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, runStmt, getOne, getAll, saveDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/doctors — list all doctors
router.get('/', async (req, res) => {
    try {
        const db = await getDb();
        const doctors = await getAll(db, `
            SELECT d.id, d.specialization, d.bio, d.consultation_fee,
                   u.name, u.email, u.phone
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            ORDER BY u.name
        `);
        res.json(doctors);
    } catch (err) {
        console.error('List doctors error:', err);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// POST /api/doctors/availability — must be ABOVE /:id routes
router.post('/availability', authenticate, authorize('doctor'), async (req, res) => {
    try {
        const { day_of_week, start_time, end_time } = req.body;

        if (day_of_week === undefined || !start_time || !end_time) {
            return res.status(400).json({ error: 'day_of_week, start_time, and end_time are required' });
        }
        if (day_of_week < 0 || day_of_week > 6) {
            return res.status(400).json({ error: 'day_of_week must be 0-6 (Sunday-Saturday)' });
        }
        if (start_time >= end_time) {
            return res.status(400).json({ error: 'start_time must be before end_time' });
        }

        const db = await getDb();
        const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

        const existing = await getOne(db,
            'SELECT id FROM doctor_availability WHERE doctor_id = ? AND day_of_week = ? AND start_time = ?',
            [doctor.id, day_of_week, start_time]
        );
        if (existing) {
            return res.status(409).json({ error: 'Availability already set for this day and start time' });
        }

        const id = uuidv4();
        await runStmt(db,
            'INSERT INTO doctor_availability (id, doctor_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?)',
            [id, doctor.id, day_of_week, start_time, end_time]
        );

        res.status(201).json({ message: 'Availability added', id });
    } catch (err) {
        console.error('Set availability error:', err);
        res.status(500).json({ error: 'Failed to set availability' });
    }
});

// GET /api/doctors/availability/me — must be ABOVE /:id routes
router.get('/availability/me', authenticate, authorize('doctor'), async (req, res) => {
    try {
        const db = await getDb();
        const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

        const availability = await getAll(db, `
            SELECT * FROM doctor_availability
            WHERE doctor_id = ?
            ORDER BY day_of_week, start_time
        `, [doctor.id]);

        res.json(availability);
    } catch (err) {
        console.error('Get availability error:', err);
        res.status(500).json({ error: 'Failed to fetch availability' });
    }
});

// DELETE /api/doctors/availability/:id — must be ABOVE /:id routes
router.delete('/availability/:id', authenticate, authorize('doctor'), async (req, res) => {
    try {
        const db = await getDb();
        const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

        const result = await runStmt(db,
            'DELETE FROM doctor_availability WHERE id = ? AND doctor_id = ?',
            [req.params.id, doctor.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Availability slot not found' });
        }

        res.json({ message: 'Availability removed' });
    } catch (err) {
        console.error('Delete availability error:', err);
        res.status(500).json({ error: 'Failed to remove availability' });
    }
});

// GET /api/doctors/:id/slots?date=YYYY-MM-DD — AFTER /availability routes
router.get('/:id/slots', async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter is required (YYYY-MM-DD)' });
        }

        const db = await getDb();

        const doctor = await getOne(db, `
            SELECT d.*, u.name FROM doctors d JOIN users u ON d.user_id = u.id WHERE d.id = ?
        `, [id]);
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

        const dayOfWeek = new Date(date + 'T00:00:00').getDay();

        const availability = await getAll(db, `
            SELECT * FROM doctor_availability
            WHERE doctor_id = ? AND day_of_week = ?
            ORDER BY start_time
        `, [id, dayOfWeek]);

        if (availability.length === 0) {
            return res.json({ doctor: doctor.name, date, slots: [] });
        }

        // Generate 30-min slots
        const slots = [];
        for (const window of availability) {
            let [startH, startM] = window.start_time.split(':').map(Number);
            const [endH, endM] = window.end_time.split(':').map(Number);
            const endMinutes = endH * 60 + endM;

            while (startH * 60 + startM + 30 <= endMinutes) {
                const slotTime = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;
                slots.push(slotTime);
                startM += 30;
                if (startM >= 60) { startH += 1; startM -= 60; }
            }
        }

        const bookedRows = await getAll(db, `
            SELECT time_slot FROM appointments
            WHERE doctor_id = ? AND date = ? AND status IN ('scheduled', 'rescheduled')
        `, [id, date]);
        const booked = bookedRows.map(a => a.time_slot);

        const availableSlots = slots.map(slot => ({
            time: slot,
            available: !booked.includes(slot)
        }));

        res.json({ doctor: doctor.name, date, slots: availableSlots });
    } catch (err) {
        console.error('Get slots error:', err);
        res.status(500).json({ error: 'Failed to fetch slots' });
    }
});

module.exports = router;
