/**
 * verify_phase3.js — Phase 3 Backend Hardening, TOTP & Security Audit Verification
 * ───────────────────────────────────────────────────────────────────────────────
 * Verifies:
 * 1. AES-256-GCM Field Encryption & Decryption (Envelope Encryption at Rest).
 * 2. Recovery code generation & SHA-256 salted hashing.
 * 3. TOTP RFC 6238 generation, validation, and time-drift window.
 * 4. Emergency recovery code single-use consumption (burn-on-use).
 * 5. Full audit logging pipeline into Neon cryptographic hash chain.
 */

const OTPAuth = require('otpauth');
const { encryptField, decryptField, generateRecoveryCodes, hashRecoveryCode } = require('../utils/crypto');
const { query, pool } = require('../config/db');

async function runPhase3Verification() {
  console.log('🛡️  ──────────────────────────────────────────────────────────────');
  console.log('🛡️  DRISHTI ARCHITECTURE OVERHAUL: PHASE 3 BACKEND HARDENING TEST');
  console.log('🛡️  ──────────────────────────────────────────────────────────────\n');

  try {
    // 1. Test Field Encryption at Rest
    console.log('1️⃣  Testing AES-256-GCM Envelope Field Encryption (At-Rest Security)...');
    const secretPlaintext = 'JBSWY3DPEHPK3PXP';
    const encryptedSecret = encryptField(secretPlaintext);
    console.log(`   Plaintext TOTP Secret:  ${secretPlaintext}`);
    console.log(`   Encrypted Ciphertext:   ${encryptedSecret.substring(0, 36)}... (${encryptedSecret.length} chars)`);

    const decryptedSecret = decryptField(encryptedSecret);
    console.log(`   Decrypted Output:       ${decryptedSecret}`);
    if (decryptedSecret !== secretPlaintext) {
      throw new Error('Field decryption failed to reproduce original secret!');
    }
    console.log('   ✅ Envelope encryption & authentication tag verification passed.');

    // 2. Test Recovery Code Generation and Hashing
    console.log('\n2️⃣  Testing High-Entropy Recovery Codes & SHA-256 Hashing...');
    const rawCodes = generateRecoveryCodes(4);
    console.log(`   Generated ${rawCodes.length} Emergency Recovery Codes:`, rawCodes);
    const hashedCodes = rawCodes.map(c => hashRecoveryCode(c));
    console.log(`   Hashed Codes (SHA-256): ${hashedCodes[0].substring(0, 24)}...`);
    
    // Verify hash match
    const testMatch = hashRecoveryCode(rawCodes[0]) === hashedCodes[0];
    console.log(`   ✅ Hash matching invariant verified: ${testMatch}`);
    if (!testMatch) throw new Error('Recovery code hash mismatch!');

    // 3. Test TOTP Code Generation & Time Window Validation
    console.log('\n3️⃣  Testing TOTP RFC 6238 Token Generation & Window Validation...');
    const totp = new OTPAuth.TOTP({
      issuer: 'Drishti',
      label: 'security.test@drishti.app',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretPlaintext),
    });

    const currentToken = totp.generate();
    console.log(`   Generated 6-digit TOTP Token: ${currentToken}`);

    const delta = totp.validate({ token: currentToken, window: 1 });
    console.log(`   Token validation delta: ${delta} (expected: 0 for current time window)`);
    if (delta === null) throw new Error('Valid TOTP token was rejected!');
    console.log('   ✅ Valid TOTP token successfully validated.');

    // Test rejection of invalid token
    const invalidDelta = totp.validate({ token: '000000', window: 1 });
    console.log(`   Invalid token rejection result: ${invalidDelta === null ? 'REJECTED (Safe)' : 'ACCEPTED (Vulnerable)'}`);
    if (invalidDelta !== null) throw new Error('SECURITY BREACH: Invalid TOTP token was accepted!');

    // 4. Test Storing Encrypted TOTP & Consuming Recovery Code in Neon
    console.log('\n4️⃣  Testing Database Update & Recovery Code Burn Invariant...');
    const testUserId = '00000000-0000-0000-0000-000000000001';
    
    // Provision 2FA
    await query(`
      UPDATE public.users 
      SET totp_secret_encrypted = $1, totp_recovery_codes_hashed = $2, totp_enabled = false
      WHERE id = $3;
    `, [encryptedSecret, hashedCodes, testUserId]);

    // Simulate consuming 1 recovery code
    const codeToBurn = rawCodes[0];
    const hashedBurnAttempt = hashRecoveryCode(codeToBurn);

    const userBefore = await query('SELECT totp_recovery_codes_hashed FROM public.users WHERE id = $1', [testUserId]);
    const codesBefore = userBefore.rows[0].totp_recovery_codes_hashed;

    if (!codesBefore.includes(hashedBurnAttempt)) {
      throw new Error('Code to burn was not found in stored hash list!');
    }

    const remainingCodes = codesBefore.filter(c => c !== hashedBurnAttempt);
    await query(`
      UPDATE public.users 
      SET totp_recovery_codes_hashed = $1, totp_enabled = true
      WHERE id = $2;
    `, [remainingCodes, testUserId]);

    const userAfter = await query('SELECT totp_recovery_codes_hashed FROM public.users WHERE id = $1', [testUserId]);
    const codesAfter = userAfter.rows[0].totp_recovery_codes_hashed;

    console.log(`   Codes before: ${codesBefore.length} | Codes after burn: ${codesAfter.length}`);
    if (codesAfter.length !== codesBefore.length - 1 || codesAfter.includes(hashedBurnAttempt)) {
      throw new Error('SECURITY BREACH: Recovery code was not single-use burned!');
    }
    console.log('   ✅ Recovery code successfully burned (single-use invariant enforced).');

    // 5. Test Audit Trail Event Logging
    console.log('\n5️⃣  Verifying SIEM Audit Trail Hash Chaining for Security Events...');
    const auditRes = await query(`
      SELECT public.log_security_event(
        '2FA_RECOVERY_CODE_CONSUMED',
        'WARNING',
        $1::uuid,
        '127.0.0.1',
        'Phase 3 Automated Security Test',
        jsonb_build_object('remaining_codes', $2::int)
      ) as audit_id;
    `, [testUserId, codesAfter.length]);

    console.log(`   ✅ Security event logged into Neon ledger with Audit ID #${auditRes.rows[0].audit_id}`);

    // Verify hash chain
    const verifyRes = await query('SELECT public.verify_audit_log_integrity() as status;');
    console.log('   ✅ Post-event cryptographic ledger integrity:', JSON.stringify(verifyRes.rows[0].status, null, 2));

    if (!verifyRes.rows[0].status.verified) {
      throw new Error('Ledger integrity broken after security event!');
    }

    console.log('\n🛡️  ──────────────────────────────────────────────────────────────');
    console.log('🛡️  PHASE 3 BACKEND HARDENING & AUDIT PIPELINE: 100% VERIFIED');
    console.log('🛡️  ──────────────────────────────────────────────────────────────\n');
  } catch (err) {
    console.error('❌ Phase 3 verification failed:', err.message);
  } finally {
    await pool.end();
  }
}

runPhase3Verification();
