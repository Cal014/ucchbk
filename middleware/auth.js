const jwt = require('jsonwebtoken');
const { getDb, getOne } = require('../db/database');

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const db = await getDb();
        const tableName = decoded.role === 'admin' ? 'admin' : 'users';
        const user = await getOne(db, `SELECT id, name, email, role, phone, created_at, token_version FROM ${tableName} WHERE id = ?`, [decoded.userId]);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        // Session invalidation: reject tokens issued before password change
        if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.token_version) {
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}

module.exports = { authenticate, authorize };
