/**
 * Environment Validator
 * Checks required .env variables on boot and warns on optional ones.
 */
function validateEnv() {
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const optional = [
        { key: 'SMTP_USER', hint: 'callistusdjidah06@gmail.com' },
        { key: 'SMTP_PASS', hint: 'kcwjgejvlyfkllsi' },
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error('\n❌ FATAL: Missing required environment variables:');
        missing.forEach(key => console.error(`   - ${key}`));
        console.error('\n   Add them to your .env file and restart.\n');
        process.exit(1);
    }

    const missingOptional = optional.filter(o => !process.env[o.key]);
    if (missingOptional.length > 0) {
        console.log('\n⚠️  Optional environment variables not set:');
        missingOptional.forEach(o => console.log(`   - ${o.key}: ${o.hint}`));
        console.log('   OTP emails will be logged to terminal instead of sent via SMTP.\n');
    }
}

module.exports = { validateEnv };
