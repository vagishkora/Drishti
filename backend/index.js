/**
 * Drishti Backend — Express Server Entry Point v2
 * ──────────────────────────────────────────────────
 * Architectural Role: Central orchestrator for the Express application.
 * Wires all middleware and modular route handlers:
 *   - auth (OTP/2FA), videos (legacy), subscriptions
 *   - posts (unified photo+video), follows, credits, notifications, comments, search
 *
 * Security posture:
 *   - Helmet.js for HTTP security headers
 *   - Strict CORS (credentials + origin whitelist)
 *   - IP-based rate limiting on auth endpoints
 *   - express-validator on all mutation inputs
 *   - httpOnly cookies for refresh token storage
 */

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();

const corsMiddleware = require('./middleware/cors');
const { generalLimiter } = require('./middleware/rateLimiter');

// Legacy routes
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const subscriptionRoutes = require('./routes/subscriptions');

// New feature routes
const postRoutes = require('./routes/posts');
const followRoutes = require('./routes/follows');
const creditRoutes = require('./routes/credits');
const notificationRoutes = require('./routes/notifications');
const commentRoutes = require('./routes/comments');
const searchRoutes = require('./routes/search');
const storiesRoutes = require('./routes/stories');
const userRoutes = require('./routes/users');
const razorpayRoutes = require('./routes/razorpay');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Global Middleware ─────────────────────────────────────
app.use(helmet());
app.use(corsMiddleware);
app.use(generalLimiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── API Routes ────────────────────────────────────────────
// Auth & Legacy
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// New Feature Modules
app.use('/api/posts', postRoutes);
app.use('/api/follows', followRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);

// ── Health Check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    name: 'Drishti API',
    timestamp: new Date().toISOString(),
    features: ['auth', 'posts', 'follows', 'credits', 'notifications', 'comments', 'search', 'admin'],
  });
});

// ── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🔮 Drishti API v2 running on http://localhost:${PORT}`);
  console.log(`📖 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
