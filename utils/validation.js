/**
 * Validates a password against strong security policy rules.
 * Requirements:
 * - At least 8 characters long
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (e.g., !@#$%^&*)
 *
 * @param {string} password 
 * @returns {object} { isValid: boolean, message: string }
 */
function validatePassword(password) {
    if (!password || password.length < 8) {
        return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }
    
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    
    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one number.' };
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one special character.' };
    }
    
    return { isValid: true, message: 'Password is strong.' };
}

module.exports = {
    validatePassword
};
