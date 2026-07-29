const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, runStmt, getOne, getAll, withTransaction } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Simple in-memory SSE clients store
// { doctorId: [res1, res2...], patientId: [res1, res2...] }
const sseClients = {
    doctors: {},
    patients: {}
};

function sendSseUpdate(type, id, data) {
    const clients = sseClients[type][id];
    if (clients) {
        clients.forEach(res => {
            try {
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (e) {
                // Ignore write errors for disconnected clients
            }
        });
    }
}

// GET /api/queue/stream
router.get('/stream', authenticate, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const userId = req.user.id;
    const role = req.user.role;

    let targetId = null;
    let targetType = null;

    // We need to resolve user_id to doctor_id or patient_id
    (async () => {
        try {
            const db = await getDb();
            if (role === 'doctor') {
                const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [userId]);
                if (doctor) {
                    targetId = doctor.id;
                    targetType = 'doctors';
                }
            } else if (role === 'patient') {
                const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [userId]);
                if (patient) {
                    targetId = patient.id;
                    targetType = 'patients';
                }
            }

            if (targetId && targetType) {
                if (!sseClients[targetType][targetId]) sseClients[targetType][targetId] = [];
                sseClients[targetType][targetId].push(res);
            }
        } catch (err) {
            console.error('SSE setup error:', err);
        }
    })();

    req.on('close', () => {
        if (targetId && targetType && sseClients[targetType][targetId]) {
            sseClients[targetType][targetId] = sseClients[targetType][targetId].filter(c => c !== res);
        }
    });
});

// POST /api/queue/check-in
router.post('/check-in', authenticate, authorize('patient'), async (req, res) => {
    try {
        const db = await getDb();
        const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

        const today = new Date().toISOString().split('T')[0];

        // Find today's appointment
        const appointment = await getOne(db, `
            SELECT id, doctor_id, time_slot FROM appointments 
            WHERE patient_id = ? AND date = ? AND status IN ('scheduled', 'rescheduled')
            ORDER BY time_slot ASC LIMIT 1
        `, [patient.id, today]);

        if (!appointment) {
            return res.status(400).json({ error: 'No active appointments found for today' });
        }

        const queueId = uuidv4();
        let ticketNumber = 1;
        let ticketCode = '';

        await withTransaction(db, async (client) => {
            // Check if already checked in
            const existing = await getOne(client, 'SELECT id, ticket_code, ticket_number FROM patient_queues WHERE appointment_id = ?', [appointment.id]);
            if (existing) {
                throw new Error('ALREADY_CHECKED_IN');
            }

            // Get max ticket number for doctor today
            const maxTicket = await getOne(client, 'SELECT MAX(ticket_number) as max_num FROM patient_queues WHERE doctor_id = ? AND queue_date = ?', [appointment.doctor_id, today]);
            if (maxTicket && maxTicket.max_num) {
                ticketNumber = maxTicket.max_num + 1;
            }

            ticketCode = `#${ticketNumber}`;

            await runStmt(client, `
                INSERT INTO patient_queues (id, appointment_id, doctor_id, patient_id, queue_date, ticket_number, ticket_code, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'checked_in')
            `, [queueId, appointment.id, appointment.doctor_id, patient.id, today, ticketNumber, ticketCode]);
        });

        // Notify doctor
        sendSseUpdate('doctors', appointment.doctor_id, { type: 'queue_update' });

        res.status(201).json({ message: 'Checked in successfully', ticketCode, ticketNumber });
    } catch (err) {
        if (err.message === 'ALREADY_CHECKED_IN') {
            return res.status(409).json({ error: 'You are already checked in for this appointment' });
        }
        console.error('Check-in error:', err);
        res.status(500).json({ error: 'Failed to check in' });
    }
});

// GET /api/queue/patient/active
router.get('/patient/active', authenticate, authorize('patient'), async (req, res) => {
    try {
        const db = await getDb();
        const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });

        const today = new Date().toISOString().split('T')[0];

        const activeQueue = await getOne(db, `
            SELECT q.*, d.specialization, u.name as doctor_name 
            FROM patient_queues q
            JOIN doctors d ON q.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE q.patient_id = ? AND q.queue_date = ? AND q.status NOT IN ('completed', 'no_show', 'cancelled')
            ORDER BY q.check_in_time DESC LIMIT 1
        `, [patient.id, today]);

        if (!activeQueue) {
            return res.json(null);
        }

        // Calculate people ahead
        const ahead = await getOne(db, `
            SELECT COUNT(*) as count FROM patient_queues 
            WHERE doctor_id = ? AND queue_date = ? AND status IN ('checked_in') AND ticket_number < ?
        `, [activeQueue.doctor_id, today, activeQueue.ticket_number]);

        // Find who is currently serving
        const serving = await getOne(db, `
            SELECT ticket_code FROM patient_queues
            WHERE doctor_id = ? AND queue_date = ? AND status IN ('called', 'in_consultation')
            ORDER BY ticket_number ASC LIMIT 1
        `, [activeQueue.doctor_id, today]);

        res.json({
            ...activeQueue,
            peopleAhead: ahead.count,
            currentlyServing: serving ? serving.ticket_code : 'None'
        });
    } catch (err) {
        console.error('Get active queue error:', err);
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
});

// GET /api/queue/doctor/active
router.get('/doctor/active', authenticate, authorize('doctor'), async (req, res) => {
    try {
        const db = await getDb();
        const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

        const today = new Date().toISOString().split('T')[0];

        const queue = await getAll(db, `
            SELECT q.*, pu.name as patient_name, a.time_slot
            FROM patient_queues q
            JOIN patients p ON q.patient_id = p.id
            JOIN users pu ON p.user_id = pu.id
            LEFT JOIN appointments a ON q.appointment_id = a.id
            WHERE q.doctor_id = ? AND q.queue_date = ? AND q.status NOT IN ('completed', 'no_show', 'cancelled')
            ORDER BY q.ticket_number ASC
        `, [doctor.id, today]);

        res.json(queue);
    } catch (err) {
        console.error('Get doctor queue error:', err);
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
});

// PUT /api/queue/:id/status
router.put('/:id/status', authenticate, authorize('doctor'), async (req, res) => {
    try {
        const { status } = req.body;
        if (!['called', 'in_consultation', 'completed', 'no_show'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const db = await getDb();
        const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
        if (!doctor) return res.status(403).json({ error: 'Not authorized' });

        const queueEntry = await getOne(db, 'SELECT * FROM patient_queues WHERE id = ?', [req.params.id]);
        if (!queueEntry) return res.status(404).json({ error: 'Queue entry not found' });

        if (queueEntry.doctor_id !== doctor.id) {
            return res.status(403).json({ error: 'Not your patient' });
        }

        const updates = ['status = ?'];
        const params = [status];
        if (status === 'called') {
            updates.push('called_at = NOW()');
        } else if (status === 'completed' || status === 'no_show') {
            updates.push('completed_at = NOW()');
        }
        params.push(req.params.id);

        await runStmt(db, `UPDATE patient_queues SET ${updates.join(', ')} WHERE id = ?`, params);

        // Also update appointment status if completed or no_show
        if (queueEntry.appointment_id) {
            if (status === 'completed') {
                await runStmt(db, "UPDATE appointments SET status = 'completed', updated_at = NOW() WHERE id = ?", [queueEntry.appointment_id]);
            } else if (status === 'no_show') {
                await runStmt(db, "UPDATE appointments SET status = 'cancelled', updated_at = NOW() WHERE id = ?", [queueEntry.appointment_id]);
            }
        }

        // Notify patient
        sendSseUpdate('patients', queueEntry.patient_id, { type: 'queue_update', newStatus: status, ticket: queueEntry.ticket_code });
        // Notify doctor's own SSE to refresh
        sendSseUpdate('doctors', queueEntry.doctor_id, { type: 'queue_update' });

        res.json({ message: 'Status updated successfully', appointmentId: queueEntry.appointment_id });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
