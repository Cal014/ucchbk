const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb, runStmt, getOne, getAll, saveDb, withTransaction } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function generateTransactionRef(method) {
    const prefixes = { mtn_momo: 'MTN', telecel_cash: 'TCL', airteltigo_money: 'ATM', card: 'CRD' };
    const prefix = prefixes[method] || 'TXN';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

function luhnCheck(cardNumber) {
    const digits = cardNumber.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits.charAt(i), 10);
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
}

function isValidExpiry(expiry) {
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) return false;
    const [month, year] = expiry.split('/');
    const expiryDate = new Date(`20${year}`, parseInt(month) - 1, 1);
    const currentDate = new Date();
    currentDate.setDate(1); // Compare only year and month
    currentDate.setHours(0,0,0,0);
    return expiryDate >= currentDate;
}

// POST /api/payments
router.post('/', authenticate, authorize('patient'), async (req, res) => {
    try {
        const { appointment_id, payment_method, phone_number, card_number, card_expiry, card_cvv } = req.body;

        if (!appointment_id || !payment_method) {
            return res.status(400).json({ error: 'appointment_id and payment_method are required' });
        }
        if (!['mtn_momo', 'telecel_cash', 'airteltigo_money', 'card'].includes(payment_method)) {
            return res.status(400).json({ error: 'Invalid payment method' });
        }
        if (['mtn_momo', 'telecel_cash', 'airteltigo_money'].includes(payment_method) && !phone_number) {
            return res.status(400).json({ error: 'Phone number is required for mobile money payments' });
        }
        if (payment_method === 'card') {
            if (!card_number || !card_expiry || !card_cvv) {
                return res.status(400).json({ error: 'Card number, expiry, and CVV are required' });
            }
            if (!luhnCheck(card_number)) {
                return res.status(400).json({ error: 'Invalid card number' });
            }
            if (!isValidExpiry(card_expiry)) {
                return res.status(400).json({ error: 'Card has expired. Expiry date must be in the present or future.' });
            }
            if (!/^\d{3,4}$/.test(card_cvv)) {
                return res.status(400).json({ error: 'Invalid CVV' });
            }
        }

        const db = await getDb();

        const patient = await getOne(db, 'SELECT id, account_balance FROM patients WHERE user_id = ?', [req.user.id]);
        if (!patient) return res.status(404).json({ error: 'Patient profile not found' });

        const appointment = await getOne(db, 'SELECT * FROM appointments WHERE id = ? AND patient_id = ?', [appointment_id, patient.id]);
        if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

        const doctor = await getOne(db, 'SELECT consultation_fee FROM doctors WHERE id = ?', [appointment.doctor_id]);
        const amount = doctor ? doctor.consultation_fee : 0;

        // Check if patient has sufficient funds
        const balance = parseFloat(patient.account_balance) || 0;
        if (balance < amount) {
            return res.status(400).json({
                error: `Insufficient funds. Your account balance is GHS ${balance.toFixed(2)} but the consultation fee is GHS ${amount.toFixed(2)}.`
            });
        }

        const paymentId = uuidv4();
        const transactionRef = generateTransactionRef(payment_method);

        await withTransaction(db, async (client) => {
            const existingPayment = await getOne(client,
                "SELECT id FROM payments WHERE appointment_id = ? AND status IN ('completed', 'pending')",
                [appointment_id]
            );
            if (existingPayment) throw new Error('ALREADY_PAID');

            await runStmt(client,
                `INSERT INTO payments (id, appointment_id, patient_id, amount, currency, payment_method, payment_phone, card_last4, transaction_ref, status)
                 VALUES (?, ?, ?, ?, 'GHS', ?, ?, ?, ?, 'pending')`,
                [paymentId, appointment_id, patient.id, amount, payment_method,
                 phone_number || null, card_number ? card_number.slice(-4) : null, transactionRef]
            );

            // Simulate payment gateway — mark as completed
            await runStmt(client,
                "UPDATE payments SET status = 'completed' WHERE id = ?",
                [paymentId]
            );

            // Deduct the amount from the patient's account balance
            await runStmt(client,
                'UPDATE patients SET account_balance = account_balance - ? WHERE id = ?',
                [amount, patient.id]
            );
        });

        const methodNames = {
            mtn_momo: 'MTN Mobile Money', telecel_cash: 'Telecel Cash',
            airteltigo_money: 'AirtelTigo Money', card: 'Card'
        };

        await runStmt(db,
            'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
            [uuidv4(), req.user.id,
             `Payment of GHS ${amount.toFixed(2)} via ${methodNames[payment_method]} confirmed. Ref: ${transactionRef}`,
             'success']
        );

        res.status(201).json({
            message: 'Payment successful',
            payment: { id: paymentId, amount, currency: 'GHS', method: methodNames[payment_method], transaction_ref: transactionRef, status: 'completed' }
        });
    } catch (err) {
        if (err.message === 'ALREADY_PAID') {
            return res.status(409).json({ error: 'Payment already completed for this appointment' });
        }
        console.error('Payment error:', err);
        res.status(500).json({ error: 'Payment processing failed' });
    }
});

// GET /api/payments
router.get('/', authenticate, async (req, res) => {
    try {
        const db = await getDb();

        if (req.user.role === 'patient') {
            const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient) return res.json([]);

            const payments = await getAll(db, `
                SELECT p.*, a.date, a.time_slot, du.name as doctor_name
                FROM payments p
                JOIN appointments a ON p.appointment_id = a.id
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users du ON d.user_id = du.id
                WHERE p.patient_id = ?
                ORDER BY p.created_at DESC
            `, [patient.id]);
            return res.json(payments);
        }

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const payments = await getAll(db, `
            SELECT p.*, a.date, a.time_slot,
                   pu.name as patient_name,
                   du.name as doctor_name
            FROM payments p
            JOIN appointments a ON p.appointment_id = a.id
            JOIN patients pt ON p.patient_id = pt.id
            JOIN users pu ON pt.user_id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            ORDER BY p.created_at DESC
        `);
        res.json(payments);
    } catch (err) {
        console.error('List payments error:', err);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// GET /api/payments/stats — must come before /:id
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        const db = await getDb();

        const totalRevenueRow = await getOne(db, "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed'");
        const totalPaymentsRow = await getOne(db, "SELECT COUNT(*) as count FROM payments WHERE status = 'completed'");

        const byMethod = await getAll(db, `
            SELECT payment_method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
            FROM payments WHERE status = 'completed'
            GROUP BY payment_method
        `);

        const today = new Date().toISOString().split('T')[0];
        const todayRevenueRow = await getOne(db,
            "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE status = 'completed' AND DATE(created_at) = ?",
            [today]
        );

        res.json({
            totalRevenue: totalRevenueRow.total,
            totalPayments: totalPaymentsRow.count,
            todayRevenue: todayRevenueRow.total,
            byMethod
        });
    } catch (err) {
        console.error('Payment stats error:', err);
        res.status(500).json({ error: 'Failed to fetch payment stats' });
    }
});

// GET /api/payments/receipt/:id
router.get('/receipt/:id', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        const payment = await getOne(db, `
            SELECT p.*,
                   a.date, a.time_slot,
                   pu.name as patient_name, pu.email as patient_email, pu.phone as patient_phone,
                   du.name as doctor_name, d.specialization
            FROM payments p
            JOIN appointments a ON p.appointment_id = a.id
            JOIN patients pt ON p.patient_id = pt.id
            JOIN users pu ON pt.user_id = pu.id
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users du ON d.user_id = du.id
            WHERE p.id = ?
        `, [req.params.id]);

        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        if (req.user.role === 'patient') {
            const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (!patient || patient.id !== payment.patient_id) {
                return res.status(403).json({ error: 'You can only view your own payment receipts' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        res.json(payment);
    } catch (err) {
        console.error('Receipt error:', err);
        res.status(500).json({ error: 'Failed to fetch receipt' });
    }
});

module.exports = router;
