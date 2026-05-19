const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb, runStmt, getOne, saveDb, withTransaction } = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Simple email format validation
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, phone, specialization, bio, date_of_birth, blood_group, gender, address } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (!['patient', 'doctor'].includes(role)) {
            return res.status(400).json({ error: 'Role must be patient or doctor' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        // Validate doctor-specific fields BEFORE any insert
        if (role === 'doctor' && !specialization) {
            return res.status(400).json({ error: 'Specialization is required for doctors' });
        }

        const db = await getDb();

        const existing = await getOne(db, 'SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Use async bcrypt to avoid blocking the event loop
        const passwordHash = await bcrypt.hash(password, 10);

        // Wrap entire registration in a transaction to prevent orphaned rows
        await withTransaction(db, async (client) => {
            const userId = uuidv4();

            await runStmt(client,
                'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, name, email, passwordHash, role, phone || null]
            );

            if (role === 'doctor') {
                await runStmt(client,
                    'INSERT INTO doctors (id, user_id, specialization, bio) VALUES (?, ?, ?, ?)',
                    [uuidv4(), userId, specialization, bio || '']
                );
            } else {
                await runStmt(client,
                    'INSERT INTO patients (id, user_id, date_of_birth, gender, blood_group, address) VALUES (?, ?, ?, ?, ?, ?)',
                    [uuidv4(), userId, date_of_birth || null, gender || null, blood_group || null, address || '']
                );
            }

            await runStmt(client,
                'INSERT INTO notifications (id, user_id, message, type) VALUES (?, ?, ?, ?)',
                [uuidv4(), userId, `Welcome to the Hospital Management System, ${name}!`, 'success']
            );
        });

        saveDb();
        res.status(201).json({ message: 'Registration successful. Please login.' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const db = await getDb();
        const user = await getOne(db, 'SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Use async bcrypt compare to avoid blocking
        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    const db = await getDb();
    const userData = { ...req.user };

    if (req.user.role === 'doctor') {
        const doctor = await getOne(db, 'SELECT * FROM doctors WHERE user_id = ?', [req.user.id]);
        userData.doctor = doctor;
    } else if (req.user.role === 'patient') {
        const patient = await getOne(db, 'SELECT * FROM patients WHERE user_id = ?', [req.user.id]);
        userData.patient = patient;
    }

    res.json(userData);
});

// POST /api/auth/reset-password — Admin-only password reset
// In production, replace this with an email-based OTP/token flow.
router.post('/reset-password', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { email, new_password } = req.body;

        if (!email || !new_password) {
            return res.status(400).json({ error: 'Email and new password are required' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const db = await getDb();

        const user = await getOne(db, 'SELECT id, name FROM users WHERE email = ?', [email]);
        if (!user) {
            return res.status(404).json({ error: 'No account found with that email address' });
        }

        const passwordHash = await bcrypt.hash(new_password, 10);
        await runStmt(db,
            "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
            [passwordHash, user.id]
        );

        saveDb();
        res.json({ message: `Password for ${user.name} has been reset successfully.` });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// GET /api/auth/profile — get current user's full profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        const user = await getOne(db, 'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const profile = { ...user };

        if (user.role === 'patient') {
            const patient = await getOne(db, 'SELECT date_of_birth, gender, blood_group, address FROM patients WHERE user_id = ?', [user.id]);
            if (patient) Object.assign(profile, patient);
        } else if (user.role === 'doctor') {
            const doctor = await getOne(db, 'SELECT specialization, bio, consultation_fee FROM doctors WHERE user_id = ?', [user.id]);
            if (doctor) Object.assign(profile, doctor);
        }

        res.json(profile);
    } catch (err) {
        console.error('Get profile error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// PUT /api/auth/profile — update editable fields
router.put('/profile', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        const { name, phone, date_of_birth, gender, blood_group, address, bio, consultation_fee } = req.body;

        // Update common user fields
        if (name) {
            await runStmt(db, "UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?", [name.trim(), req.user.id]);
        }
        if (phone !== undefined) {
            await runStmt(db, "UPDATE users SET phone = ?, updated_at = NOW() WHERE id = ?", [phone.trim(), req.user.id]);
        }

        // Role-specific updates
        if (req.user.role === 'patient') {
            const patient = await getOne(db, 'SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
            if (patient) {
                if (date_of_birth !== undefined) await runStmt(db, 'UPDATE patients SET date_of_birth = ? WHERE user_id = ?', [date_of_birth, req.user.id]);
                if (gender !== undefined) await runStmt(db, 'UPDATE patients SET gender = ? WHERE user_id = ?', [gender, req.user.id]);
                if (blood_group !== undefined) await runStmt(db, 'UPDATE patients SET blood_group = ? WHERE user_id = ?', [blood_group, req.user.id]);
                if (address !== undefined) await runStmt(db, 'UPDATE patients SET address = ? WHERE user_id = ?', [address.trim(), req.user.id]);
            }
        } else if (req.user.role === 'doctor') {
            const doctor = await getOne(db, 'SELECT id FROM doctors WHERE user_id = ?', [req.user.id]);
            if (doctor) {
                if (bio !== undefined) await runStmt(db, 'UPDATE doctors SET bio = ? WHERE user_id = ?', [bio.trim(), req.user.id]);
                if (consultation_fee !== undefined) {
                    const fee = parseFloat(consultation_fee);
                    if (!isNaN(fee) && fee >= 0) {
                        await runStmt(db, 'UPDATE doctors SET consultation_fee = ? WHERE user_id = ?', [fee, req.user.id]);
                    }
                }
            }
        }

        saveDb();

        // Update the stored user name in the token's associated data
        const updatedUser = await getOne(db, 'SELECT id, name, email, phone, role FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// POST /api/auth/change-password — change password (requires old password)
router.post('/change-password', authenticate, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }

        const db = await getDb();
        const user = await getOne(db, 'SELECT id, password_hash FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(current_password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newHash = await bcrypt.hash(new_password, 10);
        await runStmt(db, "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [newHash, user.id]);
        saveDb();

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
