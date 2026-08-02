/**
 * Lightweight XSS Sanitizer Middleware
 * Trims and escapes HTML special characters in string fields of req.body.
 * IMPORTANT: Skips password fields to allow special characters in passwords.
 */
function sanitizeInput(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        sanitizeObject(req.body);
    }
    next();
}

const PASSWORD_FIELDS = ['password', 'new_password', 'current_password', 'confirm_password'];

function sanitizeObject(obj) {
    for (const key of Object.keys(obj)) {
        if (typeof obj[key] === 'string') {
            // Skip password fields — users may use <, >, & in passwords
            if (PASSWORD_FIELDS.includes(key)) continue;
            obj[key] = obj[key]
                .trim()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}

module.exports = { sanitizeInput };
