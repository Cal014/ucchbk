const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, runStmt, getOne, getAll, saveDb } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/medical-records
router.get('/', authenticate, async (req, res) => {
    try {
        const db = await getDb();

        if (req.user.role === 'patient') {
            const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

            const records = await getAll(db, `
                SELECT mr.*, u.name AS doctor_name, d.specialization
                FROM medical_records mr
                JOIN doctors d ON mr.doctor_id = d.id
                JOIN users u ON d.user_id = u.id
                WHERE mr.patient_id = ?
                ORDER BY mr.created_at DESC
            `, [patient.id]);

            return res.json(records);
        }

        if (req.user.role === 'doctor') {
            const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
            if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

            const records = await getAll(db, `
                SELECT mr.*, u.name AS patient_name
                FROM medical_records mr
                JOIN patients p ON mr.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE mr.doctor_id = ?
                ORDER BY mr.created_at DESC
            `, [doctor.id]);

            return res.json(records);
        }

        // Admin sees all
        const records = await getAll(db, `
            SELECT mr.*,
                   pu.name AS patient_name,
                   du.name AS doctor_name,
                   d.specialization
            FROM medical_records mr
            JOIN patients p ON mr.patient_id = p.id
            JOIN users pu ON p.user_id = pu.id
            JOIN doctors d ON mr.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            ORDER BY mr.created_at DESC
        `);
        res.json(records);
    } catch (err) {
        console.error('Error fetching medical records:', err);
        res.status(500).json({ error: 'Failed to fetch medical records' });
    }
});

// POST /api/medical-records
router.post('/', authenticate, authorize('doctor'), async (req, res) => {
    try {
        const { diagnosis, treatment, patient_id, appointment_id } = req.body;

        if (!diagnosis || !treatment || !patient_id) {
            return res.status(400).json({ error: 'Diagnosis, treatment, and patient_id are required' });
        }

        const db = await getDb();

        const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

        const patient = await getOne(db, 'SELECT id FROM patients WHERE id = ?', [patient_id]);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        if (appointment_id) {
            const appointment = await getOne(db,
                'SELECT id FROM appointments WHERE id = ? AND doctor_id = ? AND patient_id = ?',
                [appointment_id, doctor.id, patient_id]
            );
            if (!appointment) {
                return res.status(403).json({ error: 'Appointment does not belong to this doctor and patient' });
            }
        }

        const recordId = uuidv4();
        await runStmt(db,
            'INSERT INTO medical_records (id, diagnosis, treatment, patient_id, doctor_id, appointment_id) VALUES (?, ?, ?, ?, ?, ?)',
            [recordId, diagnosis, treatment, patient_id, doctor.id, appointment_id || null]
        );

        res.status(201).json({ message: 'Medical record created', id: recordId });
    } catch (err) {
        console.error('Error creating medical record:', err);
        res.status(500).json({ error: 'Failed to create medical record' });
    }
});

module.exports = router;
