/**
 * db.js — Neon Serverless PostgreSQL Connection Pool
 * ──────────────────────────────────────────────────
 * Architectural Role:
 * Central connection pool for Neon Serverless PostgreSQL.
 * Provides query helper and transaction management.
 */

const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config(); // Fallback to cwd if present

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[DB WARNING] DATABASE_URL not set in environment.');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('connect', () => {
  // Connected successfully
});

pool.on('error', (err) => {
  console.error('[NEON DB ERROR]:', err.message);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
