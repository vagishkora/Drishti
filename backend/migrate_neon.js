const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting deployment of master schema to Neon PostgreSQL...');
    const schemaPath = path.join(__dirname, 'supabase', 'neon_master_schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('📜 Executing SQL statements on Neon...');
    await client.query(sql);

    console.log('✅ Schema deployed successfully!');

    // Verify tables
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\n📊 Verified Public Tables in Neon:');
    tableRes.rows.forEach(r => console.log('  - ' + r.table_name));

    // Verify Admin User
    const adminRes = await client.query(`
      SELECT username, email, credits, is_admin, is_verified 
      FROM public.users 
      WHERE is_admin = true;
    `);
    console.log('\n👤 Seeded Admin User:', adminRes.rows[0]);

    // Verify Genesis Audit Chain
    const auditRes = await client.query(`
      SELECT id, event_type, prev_hash, entry_hash, created_at 
      FROM public.security_audit_logs;
    `);
    console.log('\n⛓️ Genesis Cryptographic Audit Log:', auditRes.rows[0]);

    // Test verify_audit_log_integrity() procedure
    const integrityRes = await client.query(`SELECT public.verify_audit_log_integrity() as result;`);
    console.log('\n🛡️ Initial Cryptographic Audit Chain Verification:', integrityRes.rows[0].result);

    console.log('\n🎉 ALL NEON DATABASE MIGRATIONS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigration();
