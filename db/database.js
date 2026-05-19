const { Pool } = require('pg');

// --- Connection Pool ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
});

// --- Placeholder Converter ---
// Converts SQLite-style ? placeholders to PostgreSQL-style $1, $2, $3 ...
// This keeps every route file working without changing their SQL strings.
function convertPlaceholders(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
}

// Returns the shared pool. Routes call: const db = await getDb();
async function getDb() {
    return pool;
}

// No-op: PostgreSQL persists writes immediately — no manual save needed.
// Kept so no route file needs to be changed for saveDb() calls.
function saveDb() {}

// Graceful shutdown — called on SIGINT/SIGTERM in server.js
async function closeDb() {
    await pool.end();
    console.log('Database pool closed.');
}

// Run raw SQL (multi-statement schema init, etc.)
// Accepts a connected client (not the pool) so it participates in transactions.
async function execSQL(client, sql) {
    await client.query(sql);
}

// Wrap a set of operations in a single database transaction.
// The callback receives the transaction `client` — use it instead of `db`
// inside the callback for all runStmt / getOne / getAll calls.
//
// Usage:
//   await withTransaction(db, async (client) => {
//       await runStmt(client, 'INSERT ...', [...]);
//       const row = await getOne(client, 'SELECT ...', [...]);
//   });
async function withTransaction(db, fn) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

// Run an INSERT / UPDATE / DELETE statement.
// Returns { changes: rowCount }.
async function runStmt(db, sql, params = []) {
    const converted = convertPlaceholders(sql);
    const result = await db.query(converted, params);
    return { changes: result.rowCount };
}

// Fetch exactly one row, or null if not found.
async function getOne(db, sql, params = []) {
    const converted = convertPlaceholders(sql);
    const result = await db.query(converted, params);
    return result.rows[0] || null;
}

// Fetch all matching rows (empty array if none).
async function getAll(db, sql, params = []) {
    const converted = convertPlaceholders(sql);
    const result = await db.query(converted, params);
    return result.rows;
}

module.exports = {
    getDb, saveDb, closeDb,
    runStmt, getOne, getAll,
    execSQL, withTransaction,
};
