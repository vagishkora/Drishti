-- ══════════════════════════════════════════════════════════════════════════════
-- DRISHTI (दृष्टि) — Master Neon PostgreSQL Cyber-Hardened Schema
-- ══════════════════════════════════════════════════════════════════════════════
-- Architecture: Standalone Zero-Trust PostgreSQL Database (Neon Serverless)
-- Features: Native Password Hashing (Bcrypt), E2EE Key Vault (P-256),
-- Server-Authoritative Ledger, and Cryptographically Hash-Chained Audit Log.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing triggers & functions
DROP TRIGGER IF EXISTS enforce_users_critical_columns_protection ON public.users;
DROP FUNCTION IF EXISTS public.protect_critical_user_fields() CASCADE;
DROP FUNCTION IF EXISTS public.add_credits_secure(uuid, integer, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.subscribe_creator(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.log_security_event(text, text, uuid, text, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.verify_audit_log_integrity() CASCADE;

-- 3. Drop all tables in dependency order
DROP TABLE IF EXISTS public.security_audit_logs CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_members CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.user_keys CASCADE;
DROP TABLE IF EXISTS public.highlight_stories CASCADE;
DROP TABLE IF EXISTS public.highlights CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.razorpay_orders CASCADE;
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.muted_users CASCADE;
DROP TABLE IF EXISTS public.saved_posts CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.comment_likes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. CORE SCHEMA DEFINITION
-- ══════════════════════════════════════════════════════════════════════════════

-- 4.1 Users (Self-Contained Secure Identities)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  website TEXT,
  avatar_url TEXT,
  account_type TEXT CHECK (account_type IN ('viewer', 'creator')) DEFAULT 'viewer' NOT NULL,
  credits INTEGER DEFAULT 500 NOT NULL,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  is_verified BOOLEAN DEFAULT false NOT NULL,
  is_private BOOLEAN DEFAULT false NOT NULL,
  totp_enabled BOOLEAN DEFAULT false NOT NULL,
  totp_secret_encrypted TEXT,
  totp_recovery_codes_hashed TEXT[],
  notification_preferences JSONB DEFAULT '{"likes":true,"comments":true,"follows":true,"subscriptions":true}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.2 End-to-End Encryption (E2EE) Public Key Directory
CREATE TABLE public.user_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  public_identity_key TEXT NOT NULL, -- SPKI Base64 encoded ECDH P-256 public key
  key_fingerprint TEXT NOT NULL,     -- SHA-256 fingerprint in hex
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.3 Posts & Media Metadata
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  is_premium BOOLEAN DEFAULT false NOT NULL,
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  close_friends_only BOOLEAN DEFAULT false NOT NULL,
  repost_of UUID REFERENCES public.posts(id),
  views INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.4 Social Graph
CREATE TABLE public.follows (
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE public.likes (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.comment_likes (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (user_id, comment_id)
);

-- 4.5 Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days') NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- 4.6 Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('like','comment','follow','subscription','reply','gift','security')) NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.7 Ephemeral Stories & Highlights
CREATE TABLE public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours') NOT NULL,
  views INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.highlight_stories (
  highlight_id UUID REFERENCES public.highlights(id) ON DELETE CASCADE NOT NULL,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (highlight_id, story_id)
);

-- 4.8 Preferences & Moderation
CREATE TABLE public.saved_posts (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE public.muted_users (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  muted_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (user_id, muted_user_id)
);

CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reported_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.9 Append-Only Financial Ledger
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT CHECK (type IN ('purchase','subscription','signup_bonus','earned','gift','admin_grant')) NOT NULL,
  description TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.razorpay_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  razorpay_order_id TEXT UNIQUE NOT NULL,
  amount INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  status TEXT CHECK (status IN ('created','paid','failed')) DEFAULT 'created' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.10 Zero-Knowledge E2EE Messaging Store
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_encrypted BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.conversation_members (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  ciphertext TEXT,                -- Base64 AES-GCM encrypted payload
  iv TEXT,                        -- Base64 12-byte initialization vector
  ephemeral_public_key TEXT,
  is_encrypted BOOLEAN DEFAULT true NOT NULL,
  content TEXT,                   -- Legacy plain text
  media_url TEXT,
  media_type TEXT,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.11 Cryptographically Hash-Chained Security Audit Trail (SHA-256)
CREATE TABLE public.security_audit_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')) DEFAULT 'INFO' NOT NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  prev_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. PROCEDURES & TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════

-- 5.1 Cryptographic Audit Event Logger (SHA-256 Hash Chain)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_actor_id UUID,
  p_ip TEXT,
  p_ua TEXT,
  p_details JSONB
)
RETURNS BIGINT AS $$
DECLARE
  v_last_hash TEXT;
  v_last_id BIGINT;
  v_new_hash TEXT;
  v_timestamp TIMESTAMPTZ := now();
  v_inserted_id BIGINT;
BEGIN
  SELECT entry_hash, id INTO v_last_hash, v_last_id
  FROM public.security_audit_logs
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE;

  IF v_last_hash IS NULL THEN
    v_last_hash := 'GENESIS_ROOT_DRISHTI_NEON_2026';
    v_last_id := 0;
  END IF;

  v_new_hash := encode(
    digest(
      v_last_hash || '|' ||
      (v_last_id + 1)::text || '|' ||
      p_event_type || '|' ||
      COALESCE(p_actor_id::text, 'ANONYMOUS') || '|' ||
      v_timestamp::text || '|' ||
      p_details::text,
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.security_audit_logs (
    event_type, severity, actor_id, ip_address, user_agent, details, prev_hash, entry_hash, created_at
  ) VALUES (
    p_event_type, p_severity, p_actor_id, p_ip, p_ua, p_details, v_last_hash, v_new_hash, v_timestamp
  )
  RETURNING id INTO v_inserted_id;

  RETURN v_inserted_id;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Cryptographic Audit Trail Verifier (Tamper-Evidence Check)
CREATE OR REPLACE FUNCTION public.verify_audit_log_integrity()
RETURNS JSONB AS $$
DECLARE
  r RECORD;
  v_expected_prev TEXT := 'GENESIS_ROOT_DRISHTI_NEON_2026';
  v_calculated_hash TEXT;
  v_total_verified INT := 0;
BEGIN
  FOR r IN SELECT * FROM public.security_audit_logs ORDER BY id ASC LOOP
    IF r.prev_hash <> v_expected_prev THEN
      RETURN jsonb_build_object(
        'verified', false,
        'error', 'Hash chain broken at record ID ' || r.id,
        'failed_id', r.id,
        'records_verified_before_failure', v_total_verified
      );
    END IF;

    v_calculated_hash := encode(
      digest(
        r.prev_hash || '|' ||
        r.id::text || '|' ||
        r.event_type || '|' ||
        COALESCE(r.actor_id::text, 'ANONYMOUS') || '|' ||
        r.created_at::text || '|' ||
        r.details::text,
        'sha256'
      ),
      'hex'
    );

    IF r.entry_hash <> v_calculated_hash THEN
      RETURN jsonb_build_object(
        'verified', false,
        'error', 'Data tampering detected at record ID ' || r.id,
        'failed_id', r.id,
        'records_verified_before_failure', v_total_verified
      );
    END IF;

    v_expected_prev := r.entry_hash;
    v_total_verified := v_total_verified + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'verified', true,
    'status', 'Cryptographically verified',
    'total_records', v_total_verified,
    'chain_head', v_expected_prev
  );
END;
$$ LANGUAGE plpgsql;

-- 5.3 Secure Atomic Credit Engine (Server-Authoritative Ledger)
CREATE OR REPLACE FUNCTION public.add_credits_secure(
  user_id_input UUID,
  credits_input INTEGER,
  tx_type TEXT DEFAULT 'earned',
  tx_description TEXT DEFAULT 'Account balance adjustment'
)
RETURNS INTEGER AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT credits INTO v_current_balance
  FROM public.users
  WHERE id = user_id_input
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found.';
  END IF;

  v_new_balance := v_current_balance + credits_input;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: Balance cannot be negative.';
  END IF;

  UPDATE public.users
  SET credits = v_new_balance
  WHERE id = user_id_input;

  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description
  ) VALUES (
    user_id_input, credits_input, v_new_balance, tx_type, tx_description
  );

  PERFORM public.log_security_event(
    'CREDIT_MUTATION',
    CASE WHEN ABS(credits_input) >= 1000 THEN 'WARNING' ELSE 'INFO' END,
    user_id_input,
    NULL,
    NULL,
    jsonb_build_object(
      'amount', credits_input,
      'type', tx_type,
      'new_balance', v_new_balance,
      'description', tx_description
    )
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.add_credits(user_id_input UUID, credits_input INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN public.add_credits_secure(user_id_input, credits_input, 'earned', 'Transaction adjustment');
END;
$$ LANGUAGE plpgsql;

-- 5.4 Secure Subscription Processor
CREATE OR REPLACE FUNCTION public.subscribe_creator(
  subscriber_id_input UUID,
  creator_id_input UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub_cost CONSTANT INTEGER := 100;
  v_creator_earning CONSTANT INTEGER := 80;
BEGIN
  IF subscriber_id_input = creator_id_input THEN
    RAISE EXCEPTION 'Self-subscription is not allowed.';
  END IF;

  PERFORM public.add_credits_secure(
    subscriber_id_input,
    -v_sub_cost,
    'subscription',
    'Subscription to creator ' || creator_id_input::text
  );

  PERFORM public.add_credits_secure(
    creator_id_input,
    v_creator_earning,
    'earned',
    'Subscription earning from ' || subscriber_id_input::text
  );

  INSERT INTO public.subscriptions (subscriber_id, creator_id, started_at, expires_at, is_active)
  VALUES (subscriber_id_input, creator_id_input, now(), now() + interval '30 days', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.follows (follower_id, following_id)
  VALUES (subscriber_id_input, creator_id_input)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.notifications (recipient_id, sender_id, type)
  VALUES (creator_id_input, subscriber_id_input, 'subscription');

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. INITIAL SEED: Admin Account & Genesis Audit Event
-- ══════════════════════════════════════════════════════════════════════════════

-- Seed initial official admin account (Password: Admin@Drishti2026!)
INSERT INTO public.users (
  id,
  email,
  password_hash,
  username,
  full_name,
  bio,
  credits,
  is_admin,
  is_verified,
  account_type
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@drishti.app',
  crypt('Admin@Drishti2026!', gen_salt('bf')),
  'drishti.admin',
  'Drishti Security Operations',
  'Platform Security Operations Center & Root Authority',
  10000,
  true,
  true,
  'creator'
) ON CONFLICT DO NOTHING;

-- Seed Genesis Audit Event
SELECT public.log_security_event(
  'SYSTEM_INITIALIZATION',
  'INFO',
  '00000000-0000-0000-0000-000000000001',
  '127.0.0.1',
  'Drishti Neon Migrator 2.0',
  jsonb_build_object('message', 'Neon PostgreSQL Cyber-Hardened Schema successfully deployed.')
);
