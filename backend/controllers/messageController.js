/**
 * messageController.js — Neon PostgreSQL Zero-Knowledge E2EE Messaging Controller
 * ─────────────────────────────────────────────────────────────────────────────
 * Architectural Role:
 * Handles encrypted messaging exchange, public key vault storage, and conversation management.
 * The server stores only ciphertext and IVs — zero plaintext visibility.
 */

const { query } = require('../config/db');

// POST /api/messages/keys — Publish or update own E2EE public key and fingerprint
exports.publishPublicKey = async (req, res) => {
  const { publicKeySPKI, fingerprint } = req.body;
  const userId = req.user.id;

  if (!publicKeySPKI || !fingerprint) {
    return res.status(400).json({ error: 'publicKeySPKI and fingerprint are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO public.user_keys (user_id, public_identity_key, key_fingerprint, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id) 
       DO UPDATE SET public_identity_key = $2, key_fingerprint = $3, updated_at = now()
       RETURNING *;`,
      [userId, publicKeySPKI, fingerprint]
    );

    res.json({ success: true, key: result.rows[0] });
  } catch (err) {
    console.error('[messageController.publishPublicKey]', err.message);
    res.status(500).json({ error: 'Failed to publish public key: ' + err.message });
  }
};

// GET /api/messages/keys/:userId — Retrieve peer public key & fingerprint
exports.getPublicKey = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await query(
      `SELECT user_id, public_identity_key, key_fingerprint, created_at, updated_at
       FROM public.user_keys
       WHERE user_id = $1;`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'E2EE public key not found for user.' });
    }

    res.json({ key: result.rows[0] });
  } catch (err) {
    console.error('[messageController.getPublicKey]', err.message);
    res.status(500).json({ error: 'Failed to fetch public key: ' + err.message });
  }
};

// GET /api/messages/conversations — Get all active conversations for current user
exports.getConversations = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await query(
      `SELECT 
         c.id,
         c.is_encrypted,
         c.created_at,
         c.last_message_at,
         peer.id AS peer_id,
         peer.username AS peer_username,
         peer.full_name AS peer_full_name,
         peer.avatar_url AS peer_avatar_url,
         peer.is_verified AS peer_is_verified,
         pk.key_fingerprint AS peer_key_fingerprint,
         (
           SELECT json_build_object(
             'id', m.id,
             'ciphertext', m.ciphertext,
             'iv', m.iv,
             'is_encrypted', m.is_encrypted,
             'created_at', m.created_at,
             'sender_id', m.sender_id
           )
           FROM public.messages m
           WHERE m.conversation_id = c.id
           ORDER BY m.created_at DESC
           LIMIT 1
         ) AS last_message
       FROM public.conversations c
       JOIN public.conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = $1
       JOIN public.conversation_members cm_peer ON cm_peer.conversation_id = c.id AND cm_peer.user_id != $1
       JOIN public.users peer ON peer.id = cm_peer.user_id
       LEFT JOIN public.user_keys pk ON pk.user_id = peer.id
       ORDER BY c.last_message_at DESC;`,
      [userId]
    );

    const conversations = result.rows.map(row => ({
      id: row.id,
      is_encrypted: row.is_encrypted,
      created_at: row.created_at,
      last_message_at: row.last_message_at,
      otherMember: {
        id: row.peer_id,
        username: row.peer_username,
        full_name: row.peer_full_name,
        avatar_url: row.peer_avatar_url,
        is_verified: row.peer_is_verified,
        key_fingerprint: row.peer_key_fingerprint,
      },
      lastMessage: row.last_message,
    }));

    res.json({ conversations });
  } catch (err) {
    console.error('[messageController.getConversations]', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations: ' + err.message });
  }
};

// GET /api/messages/conversation/:conversationId — Get messages in conversation
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.id;

  try {
    // Verify user is a member of this conversation
    const memberCheck = await query(
      `SELECT 1 FROM public.conversation_members WHERE conversation_id = $1 AND user_id = $2;`,
      [conversationId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this conversation.' });
    }

    const result = await query(
      `SELECT id, conversation_id, sender_id, ciphertext, iv, ephemeral_public_key, is_encrypted, content, media_url, media_type, post_id, created_at
       FROM public.messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC;`,
      [conversationId]
    );

    res.json({ messages: result.rows });
  } catch (err) {
    console.error('[messageController.getMessages]', err.message);
    res.status(500).json({ error: 'Failed to fetch messages: ' + err.message });
  }
};

// POST /api/messages/send — Send an encrypted message
exports.sendMessage = async (req, res) => {
  const userId = req.user.id;
  const { conversationId, ciphertext, iv, mediaUrl, mediaType, postId } = req.body;

  if (!conversationId) {
    return res.status(400).json({ error: 'conversationId is required.' });
  }

  if (!ciphertext) {
    return res.status(400).json({ error: 'Ciphertext is required for E2EE delivery.' });
  }

  try {
    // Verify membership
    const memberCheck = await query(
      `SELECT 1 FROM public.conversation_members WHERE conversation_id = $1 AND user_id = $2;`,
      [conversationId, userId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Forbidden: You are not a member of this conversation.' });
    }

    // Insert message into Neon
    const msgResult = await query(
      `INSERT INTO public.messages (conversation_id, sender_id, ciphertext, iv, is_encrypted, media_url, media_type, post_id, created_at)
       VALUES ($1, $2, $3, $4, true, $5, $6, $7, now())
       RETURNING *;`,
      [conversationId, userId, ciphertext, iv, mediaUrl || null, mediaType || null, postId || null]
    );

    // Update conversation timestamp
    await query(
      `UPDATE public.conversations SET last_message_at = now() WHERE id = $1;`,
      [conversationId]
    );

    res.json({ success: true, message: msgResult.rows[0] });
  } catch (err) {
    console.error('[messageController.sendMessage]', err.message);
    res.status(500).json({ error: 'Failed to send message: ' + err.message });
  }
};

// POST /api/messages/conversation/start — Find or create conversation with peer
exports.startConversation = async (req, res) => {
  const userId = req.user.id;
  const { peerId } = req.body;

  if (!peerId) {
    return res.status(400).json({ error: 'peerId is required.' });
  }

  if (userId === peerId) {
    return res.status(400).json({ error: 'Cannot start conversation with yourself.' });
  }

  try {
    // Check if conversation already exists between the two users
    const existing = await query(
      `SELECT cm1.conversation_id 
       FROM public.conversation_members cm1
       JOIN public.conversation_members cm2 ON cm1.conversation_id = cm2.conversation_id
       WHERE cm1.user_id = $1 AND cm2.user_id = $2
       LIMIT 1;`,
      [userId, peerId]
    );

    if (existing.rows.length > 0) {
      return res.json({ conversationId: existing.rows[0].conversation_id, isNew: false });
    }

    // Create new conversation
    const newConv = await query(
      `INSERT INTO public.conversations (is_encrypted, created_at, last_message_at)
       VALUES (true, now(), now())
       RETURNING id;`
    );

    const convId = newConv.rows[0].id;

    // Add members
    await query(
      `INSERT INTO public.conversation_members (conversation_id, user_id, joined_at)
       VALUES ($1, $2, now()), ($1, $3, now());`,
      [convId, userId, peerId]
    );

    res.json({ conversationId: convId, isNew: true });
  } catch (err) {
    console.error('[messageController.startConversation]', err.message);
    res.status(500).json({ error: 'Failed to start conversation: ' + err.message });
  }
};
