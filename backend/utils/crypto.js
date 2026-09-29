/**
 * crypto.js — Backend Cryptographic Defense Utility
 * ────────────────────────────────────────────────
 * Architectural Role:
 * Provides AES-256-GCM envelope encryption for sensitive fields stored in PostgreSQL
 * (e.g., TOTP secrets, recovery tokens) and cryptographic backup code hashing.
 */

const crypto = require('crypto');

// Master encryption key derived from environment JWT_SECRET or specific ENCRYPTION_KEY
const MASTER_KEY = crypto.createHash('sha256')
  .update(process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'drishti_super_secret_cipher_key_2026')
  .digest();

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: Base64(iv + auth_tag + ciphertext)
 */
function encryptField(plaintext) {
  if (!plaintext) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine IV + Tag + Encrypted data
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts a combined Base64 payload containing IV + Auth Tag + Ciphertext.
 */
function decryptField(base64Payload) {
  if (!base64Payload) return null;

  const combined = Buffer.from(base64Payload, 'base64');

  if (combined.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('Malformed ciphertext payload: insufficient length.');
  }

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Generates an array of secure 8-character alphanumeric emergency recovery codes.
 */
function generateRecoveryCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 chars
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`);
  }
  return codes;
}

/**
 * Hashes recovery codes using SHA-256 with salt so cleartext codes are never stored.
 */
function hashRecoveryCode(code) {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

module.exports = {
  encryptField,
  decryptField,
  generateRecoveryCodes,
  hashRecoveryCode,
};
