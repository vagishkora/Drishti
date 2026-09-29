/**
 * Supabase Client Configuration (Compatibility Layer)
 * ───────────────────────────────────────────────────
 * Provides safe fallback when operating in pure standalone PostgreSQL (Neon) mode.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder_anon_key';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key';

let supabase = null;
let supabaseAdmin = null;

try {
  supabase = createClient(supabaseUrl, supabaseKey);
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
} catch (e) {
  // Standalone Neon Mode active
}

module.exports = { 
  supabase, 
  supabaseAdmin,
  getAnonClient: () => supabase,
  getServiceClient: () => supabaseAdmin
};
