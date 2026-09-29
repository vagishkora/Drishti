const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const mc = require('../controllers/messageController');

// All messaging endpoints require valid JWT authentication
router.use(authenticate);

// Public Key Vault & Fingerprint
router.post('/keys', mc.publishPublicKey);
router.get('/keys/:userId', mc.getPublicKey);

// Conversations & Message Exchange
router.get('/conversations', mc.getConversations);
router.post('/conversation/start', mc.startConversation);
router.get('/conversation/:conversationId', mc.getMessages);
router.post('/send', mc.sendMessage);

module.exports = router;
