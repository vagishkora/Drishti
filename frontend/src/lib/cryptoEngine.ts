/**
 * cryptoEngine.ts — Drishti Zero-Knowledge End-to-End Encryption (E2EE)
 * ──────────────────────────────────────────────────────────────────────
 * Architecture:
 * 1. Asymmetric Key Agreement: ECDH (Elliptic Curve Diffie-Hellman over NIST P-256).
 * 2. Symmetric Content Encryption: AES-GCM (256-bit key, 96-bit unique IV/nonce per message).
 * 3. Identity Verification: SHA-256 fingerprint generation for out-of-band key verification.
 * 4. Key Persistence: Client-side IndexedDB key vault (Private key NEVER leaves device).
 *
 * Research Citation:
 * "Drishti employs a hybrid cryptosystem combining ECDH (P-256) for zero-knowledge
 * key negotiation and AES-GCM (256-bit authenticated encryption) for message confidentiality
 * and tamper-detection, strictly preventing server-side eavesdropping."
 */

const DB_NAME = 'drishti_crypto_vault'
const DB_VERSION = 1
const STORE_NAME = 'identity_keys'

// ── 1. IndexedDB Secure Key Storage ──────────────────────────────────────

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function storeLocalKey(key: string, value: any): Promise<void> {
  const db = await openKeyDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function getLocalKey(key: string): Promise<any> {
  const db = await openKeyDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ── 2. Binary Encoding Helpers ──────────────────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// ── 3. Key Generation & Management ──────────────────────────────────────

export interface UserKeyPair {
  publicKeySPKI: string // Base64 encoded SPKI
  fingerprint: string    // Formatted hex fingerprint (SHA-256)
}

/**
 * Computes a human-readable SHA-256 fingerprint for a public key.
 * Used for out-of-band safety numbers / fingerprint comparison.
 */
export async function computeFingerprint(spkiBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', spkiBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(':')
  return hex.toUpperCase()
}

/**
 * Initializes or retrieves the client's ECDH P-256 identity keypair.
 * If not present in IndexedDB, generates a fresh pair and saves it.
 */
export async function getOrCreateIdentityKeyPair(userId: string): Promise<UserKeyPair> {
  const privateKeyStorageKey = `ecdh_priv_${userId}`
  const publicKeyStorageKey = `ecdh_pub_spki_${userId}`
  const fingerprintStorageKey = `ecdh_fp_${userId}`

  const existingPubSPKI = await getLocalKey(publicKeyStorageKey)
  const existingFP = await getLocalKey(fingerprintStorageKey)
  const existingPrivKey = await getLocalKey(privateKeyStorageKey)

  if (existingPubSPKI && existingFP && existingPrivKey) {
    return {
      publicKeySPKI: existingPubSPKI,
      fingerprint: existingFP,
    }
  }

  // Generate ECDH P-256 key pair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false, // Private key is non-extractable from memory after creation if supported, or stored locally
    ['deriveKey', 'deriveBits']
  )

  // Export Public Key to SPKI (SubjectPublicKeyInfo) format
  const exportedPub = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
  const spkiBase64 = arrayBufferToBase64(exportedPub)
  const fp = await computeFingerprint(exportedPub)

  // Store keys in client-side IndexedDB
  await storeLocalKey(privateKeyStorageKey, keyPair.privateKey)
  await storeLocalKey(publicKeyStorageKey, spkiBase64)
  await storeLocalKey(fingerprintStorageKey, fp)

  return {
    publicKeySPKI: spkiBase64,
    fingerprint: fp,
  }
}

/**
 * Imports a peer's Base64 SPKI public key for shared secret derivation.
 */
export async function importPeerPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const buffer = base64ToArrayBuffer(spkiBase64)
  return window.crypto.subtle.importKey(
    'spki',
    buffer,
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    false,
    []
  )
}

/**
 * Derives a shared symmetric AES-GCM (256-bit) encryption key using ECDH key agreement.
 */
export async function deriveSharedSecretKey(
  userId: string,
  peerPublicKeySPKI: string
): Promise<CryptoKey> {
  const privateKey = await getLocalKey(`ecdh_priv_${userId}`)
  if (!privateKey) {
    throw new Error('Local E2EE private key not found on this device.')
  }

  const peerPublicKey = await importPeerPublicKey(peerPublicKeySPKI)

  return window.crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: peerPublicKey,
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

// ── 4. Encryption & Decryption (AES-GCM-256) ─────────────────────────────

export interface EncryptedMessagePayload {
  ciphertext: string // Base64
  iv: string         // Base64 (12 bytes)
}

/**
 * Encrypts plaintext using AES-GCM-256 with a unique 12-byte initialization vector.
 */
export async function encryptE2EEMessage(
  plaintext: string,
  sharedKey: CryptoKey
): Promise<EncryptedMessagePayload> {
  // Generate 12-byte cryptographically secure random IV (standard for AES-GCM)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    sharedKey,
    data
  )

  return {
    ciphertext: arrayBufferToBase64(encryptedBuffer),
    iv: arrayBufferToBase64(iv.buffer),
  }
}

/**
 * Decrypts an AES-GCM-256 ciphertext payload with the shared symmetric key.
 */
export async function decryptE2EEMessage(
  ciphertextBase64: string,
  ivBase64: string,
  sharedKey: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64ToArrayBuffer(ciphertextBase64)
  const ivBuffer = base64ToArrayBuffer(ivBase64)

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    sharedKey,
    ciphertextBuffer
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}
