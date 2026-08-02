require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initializeDatabase } = require('./db/init');
const { closeDb } = require('./db/database');
const { validateEnv } = require('./config/env');
const { sanitizeInput } = require('./middleware/sanitize');

const app = express();

// Validate environment variables on boot
validateEnv();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled — SPA serves inline scripts
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: { error: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/verify-otp', authLimiter);
app.use('/api/auth/confirm-reset', authLimiter);

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/medical-records', require('./routes/medical-records'));
app.use('/api/queue', require('./routes/queue'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server after DB init
const PORT = process.env.PORT || 3000;

async function start() {
    await initializeDatabase();
    const server = app.listen(PORT, () => {
        console.log(`\n Hospital Management System running at http://localhost:${PORT}\n`);
    });

    // Graceful shutdown — save DB before exit
    function gracefulShutdown(signal) {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(() => {
            console.log('HTTP server closed.');
            closeDb();
            console.log('Database saved and closed.');
            process.exit(0);
        });
        // Force exit after 5 seconds if server doesn't close
        setTimeout(() => {
            console.error('Forced shutdown after timeout.');
            closeDb();
            process.exit(1);
        }, 5000);
    }

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
        console.error('Uncaught exception:', err);
        closeDb();
        process.exit(1);
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
