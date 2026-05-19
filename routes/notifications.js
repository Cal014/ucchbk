const express = require('express');
const { getDb, runStmt, getAll, saveDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        const notifications = await getAll(db, `
            SELECT * FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        `, [req.user.id]);
        res.json(notifications);
    } catch (err) {
        console.error('Get notifications error:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// PATCH /api/notifications/read-all — MUST come BEFORE /:id/read
router.patch('/read-all', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        await runStmt(db, 'UPDATE notifications SET read = TRUE WHERE user_id = ?', [req.user.id]);
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        console.error('Mark all read error:', err);
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
    try {
        const db = await getDb();
        await runStmt(db, 'UPDATE notifications SET read = TRUE WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]);
        res.json({ message: 'Notification marked as read' });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

module.exports = router;
