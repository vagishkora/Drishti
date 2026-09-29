/**
 * CORS Middleware Configuration
 * ─────────────────────────────
 * Architectural Role: Enforces strict Cross-Origin Resource Sharing policy.
 * Only the approved frontend origin is whitelisted. Credentials (httpOnly
 * cookies) are explicitly allowed for secure token rotation.
 */

const cors = require('cors');
require('dotenv').config();

const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

module.exports = cors(corsOptions);
