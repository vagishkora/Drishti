/**
 * verify_phase1.js — Phase 1 Database Root-of-Trust Invariant Verification
 * ────────────────────────────────────────────────────────────────────────
 * Verifies:
 * 1. Neon connection and master schema tables.
 * 2. Atomic credit transactions and underflow protection.
 * 3. SHA-256 cryptographic hash chaining in security_audit_logs.
 * 4. Stored procedure verify_audit_log_integrity().
 */

const { query, pool } = require('../config/db');

async function runPhase1Verification() {
  console.log('🔒 ──────────────────────────────────────────────────────────────');
  console.log('🔒 DRISHTI ARCHITECTURE OVERHAUL: PHASE 1 INVARIANT VERIFICATION');
  console.log('🔒 ──────────────────────────────────────────────────────────────\n');

  try {
    // 1. Table schema verification
    console.log('1️⃣  Verifying Neon Master Schema Tables...');
    const tableRes = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tableRes.rows.map(r => r.table_name);
    console.log(`   ✅ Total public tables detected: ${tables.length}`);
    const criticalTables = ['users', 'user_keys', 'security_audit_logs', 'credit_transactions', 'posts', 'messages'];
    criticalTables.forEach(t => {
      if (tables.includes(t)) {
        console.log(`      ✓ Table [${t}] online`);
      } else {
        throw new Error(`CRITICAL: Table [${t}] missing from Neon!`);
      }
    });

    // 2. Fetch Root Admin
    console.log('\n2️⃣  Verifying Root Authority Identity...');
    const adminRes = await query(`
      SELECT id, email, username, credits, is_admin, is_verified 
      FROM public.users 
      WHERE email = $1;
    `, ['admin@drishti.app']);
    
    if (adminRes.rows.length === 0) {
      throw new Error('CRITICAL: Root admin user not found in public.users!');
    }
    const admin = adminRes.rows[0];
    console.log(`   ✅ Root Admin identity confirmed: ${admin.username} (${admin.email})`);
    console.log(`      Credits: ${admin.credits} | Admin: ${admin.is_admin} | Verified: ${admin.is_verified}`);

    // 3. Test Atomic Credit Engine (Positive Mutation)
    console.log('\n3️⃣  Testing Server-Authoritative Credit Engine (add_credits_secure)...');
    const prevBalance = admin.credits;
    const addRes = await query(`
      SELECT public.add_credits_secure($1::uuid, $2::integer, $3::text, $4::text) as new_balance;
    `, [admin.id, 50, 'earned', 'Phase 1 Invariant Verification Credit Grant']);
    const newBalance = addRes.rows[0].new_balance;
    console.log(`   ✅ Balance updated: ${prevBalance} -> ${newBalance} (+50 credits)`);

    // 4. Test Underflow Prevention (Negative Overdraft Attempt)
    console.log('\n4️⃣  Testing Negative Overdraft Protection (Underflow Guard)...');
    try {
      await query(`
        SELECT public.add_credits_secure($1::uuid, $2::integer, $3::text, $4::text);
      `, [admin.id, -9999999, 'subscription', 'Malicious balance underflow attempt']);
      throw new Error('SECURITY BREACH: Underflow check failed to prevent negative balance!');
    } catch (underflowErr) {
      if (underflowErr.message.includes('INSUFFICIENT_CREDITS')) {
        console.log('   ✅ Negative balance underflow strictly BLOCKED by Neon stored procedure:');
        console.log(`      "${underflowErr.message.trim()}"`);
      } else {
        throw underflowErr;
      }
    }

    // 5. Test Cryptographic Hash Chain Integrity
    console.log('\n5️⃣  Verifying Mathematical Hash Chain Integrity (verify_audit_log_integrity)...');
    const integrityRes = await query(`SELECT public.verify_audit_log_integrity() as status;`);
    const status = integrityRes.rows[0].status;
    console.log('   ✅ Stored procedure result:', JSON.stringify(status, null, 2));

    if (!status.verified) {
      throw new Error(`CRITICAL: Audit log integrity verification FAILED: ${status.error}`);
    }

    // 6. Inspect Recent Audit Blocks
    console.log('\n6️⃣  Inspecting Latest SHA-256 Chained Blocks...');
    const auditRes = await query(`
      SELECT id, event_type, severity, prev_hash, entry_hash, created_at 
      FROM public.security_audit_logs 
      ORDER BY id DESC 
      LIMIT 3;
    `);
    auditRes.rows.forEach(block => {
      console.log(`   Block #${block.id} [${block.event_type} - ${block.severity}]`);
      console.log(`     Prev:  ${block.prev_hash.substring(0, 24)}...`);
      console.log(`     Entry: ${block.entry_hash.substring(0, 24)}...`);
      console.log(`     Time:  ${block.created_at}`);
    });

    console.log('\n🔒 ──────────────────────────────────────────────────────────────');
    console.log('🔒 PHASE 1 DATABASE ROOT-OF-TRUST: 100% VERIFIED & PRODUCTION READY');
    console.log('🔒 ──────────────────────────────────────────────────────────────\n');
  } catch (err) {
    console.error('❌ Phase 1 verification failed:', err.message);
  } finally {
    await pool.end();
  }
}

runPhase1Verification();
