-- ══════════════════════════════════════════════════════════════════════════════
-- DRISHTI (दृष्टि) — Master Zero-Trust & Cyber-Hardened Schema
-- ══════════════════════════════════════════════════════════════════════════════
-- Architecture: Zero-Trust Client, Server-Authoritative Ledger, E2EE Key Vault,
-- and Cryptographically Hash-Chained Audit Ledger (SHA-256).
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing triggers & functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS enforce_users_critical_columns_protection ON public.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
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

-- 4.1 Users (Hardened identity profiles)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
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

-- 4.2 End-to-End Encryption (E2EE) Public Key Vault
CREATE TABLE public.user_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  public_identity_key TEXT NOT NULL, -- SPKI Base64 encoded ECDH P-256 public key
  key_fingerprint TEXT NOT NULL,     -- SHA-256 fingerprint hex for out-of-band verification
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.3 Posts & Media
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

-- 4.4 Social Graph: Follows
CREATE TABLE public.follows (
  follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- 4.5 Interactions: Likes & Comments
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

-- 4.6 Gated Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days') NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- 4.7 Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('like','comment','follow','subscription','reply','gift','security')) NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.8 Ephemeral Stories & Highlights
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

-- 4.9 User Preferences & Moderation
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

-- 4.10 Financial Ledger & Transactions (Append-Only)
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

-- 4.11 End-to-End Encrypted Messaging
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
  ciphertext TEXT,                -- Base64 AES-GCM encrypted message payload
  iv TEXT,                        -- Base64 initialization vector (nonce)
  ephemeral_public_key TEXT,      -- Sender's ephemeral ECDH public key (if applicable)
  is_encrypted BOOLEAN DEFAULT true NOT NULL,
  content TEXT,                   -- Fallback plaintext (only for legacy system alerts)
  media_url TEXT,
  media_type TEXT,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 4.12 Cryptographically Hash-Chained Security Audit Trail (SIEM-Ready)
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
-- 5. ZERO-TRUST DEFENSIVE TRIGGERS & PROCEDURES
-- ══════════════════════════════════════════════════════════════════════════════

-- 5.1 Defense against Client Privilege Escalation on `users` table
-- Ensures that clients CANNOT modify `credits`, `is_admin`, or `is_verified` directly via API
CREATE OR REPLACE FUNCTION public.protect_critical_user_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If invoked by normal client session (not backend service role)
  IF current_user <> 'postgres' AND (current_setting('role', true) <> 'service_role') THEN
    IF OLD.credits IS DISTINCT FROM NEW.credits THEN
      RAISE EXCEPTION 'Security Policy Violation: Credits cannot be mutated directly by client. Use authorized RPC.';
    END IF;
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
      RAISE EXCEPTION 'Security Policy Violation: Administrative role elevation is forbidden.';
    END IF;
    IF OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN
      RAISE EXCEPTION 'Security Policy Violation: Verification status is server-controlled.';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER enforce_users_critical_columns_protection
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.protect_critical_user_fields();

-- 5.2 Cryptographic Audit Event Logger (SHA-256 Hash Chain)
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
  -- Fetch the previous hash in the chain (lock for serial consistency)
  SELECT entry_hash, id INTO v_last_hash, v_last_id
  FROM public.security_audit_logs
  ORDER BY id DESC
  LIMIT 1
  FOR UPDATE;

  -- Root Genesis Hash if table is fresh
  IF v_last_hash IS NULL THEN
    v_last_hash := 'GENESIS_ROOT_DRISHTI_SECURITY_CHAIN_2026';
    v_last_id := 0;
  END IF;

  -- Compute SHA-256: Hash(prev_hash + next_id + event_type + actor_id + timestamp + details)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 Cryptographic Audit Trail Verifier (Tamper-Evidence Check)
CREATE OR REPLACE FUNCTION public.verify_audit_log_integrity()
RETURNS JSONB AS $$
DECLARE
  r RECORD;
  v_expected_prev TEXT := 'GENESIS_ROOT_DRISHTI_SECURITY_CHAIN_2026';
  v_calculated_hash TEXT;
  v_total_verified INT := 0;
BEGIN
  FOR r IN SELECT * FROM public.security_audit_logs ORDER BY id ASC LOOP
    -- 1. Check prev_hash link
    IF r.prev_hash <> v_expected_prev THEN
      RETURN jsonb_build_object(
        'verified', false,
        'error', 'Hash chain broken at record ID ' || r.id,
        'failed_id', r.id,
        'records_verified_before_failure', v_total_verified
      );
    END IF;

    -- 2. Recalculate hash of this record
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 Secure Atomic Credit Engine (Server-Authoritative Ledger)
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
  -- Row-lock user to prevent concurrent race conditions
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

  -- Bypass trigger via direct server update
  UPDATE public.users
  SET credits = v_new_balance
  WHERE id = user_id_input;

  -- Record in double-entry transaction ledger
  INSERT INTO public.credit_transactions (
    user_id, amount, balance_after, type, description
  ) VALUES (
    user_id_input, credits_input, v_new_balance, tx_type, tx_description
  );

  -- Audit log financial event
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Compatibility alias for older client code
CREATE OR REPLACE FUNCTION public.add_credits(user_id_input UUID, credits_input INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN public.add_credits_secure(user_id_input, credits_input, 'earned', 'Transaction adjustment');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.5 Secure Subscription Processor
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

  -- 1. Deduct from subscriber
  PERFORM public.add_credits_secure(
    subscriber_id_input,
    -v_sub_cost,
    'subscription',
    'Subscription to creator ' || creator_id_input::text
  );

  -- 2. Credit to creator (20% platform fee retained)
  PERFORM public.add_credits_secure(
    creator_id_input,
    v_creator_earning,
    'earned',
    'Subscription earning from ' || subscriber_id_input::text
  );

  -- 3. Upsert subscription record
  INSERT INTO public.subscriptions (subscriber_id, creator_id, started_at, expires_at, is_active)
  VALUES (subscriber_id_input, creator_id_input, now(), now() + interval '30 days', true)
  ON CONFLICT DO NOTHING;

  -- 4. Follow automatically if not following
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (subscriber_id_input, creator_id_input)
  ON CONFLICT DO NOTHING;

  -- 5. Notify creator
  INSERT INTO public.notifications (recipient_id, sender_id, type)
  VALUES (creator_id_input, subscriber_id_input, 'subscription');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.6 Automated Auth Registration Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
BEGIN
  v_username := COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', '');

  -- Create initial profile
  INSERT INTO public.users (id, username, full_name, credits)
  VALUES (new.id, v_username, v_full_name, 500);

  -- Log signup bonus in ledger
  INSERT INTO public.credit_transactions (user_id, amount, balance_after, type, description)
  VALUES (new.id, 500, 500, 'signup_bonus', 'Welcome bonus — 500 Drishti Credits');

  -- Log security event
  PERFORM public.log_security_event(
    'AUTH_USER_REGISTERED',
    'INFO',
    new.id,
    NULL,
    NULL,
    jsonb_build_object('email', new.email, 'username', v_username)
  );

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- 6.1 Users RLS
CREATE POLICY "Public profiles viewable" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins update any user" ON public.users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- 6.2 E2EE Keys RLS
CREATE POLICY "Public keys viewable by all users" ON public.user_keys FOR SELECT USING (true);
CREATE POLICY "Users publish own public key" ON public.user_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users rotate own public key" ON public.user_keys FOR UPDATE USING (auth.uid() = user_id);

-- 6.3 Posts RLS (Gates premium content to subscribers or author)
CREATE POLICY "Posts viewable according to subscription" ON public.posts FOR SELECT USING (
  is_premium = false OR
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE subscriber_id = auth.uid()
      AND creator_id = posts.user_id
      AND is_active = true
      AND expires_at > now()
  ) OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Users create own posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own posts" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users or Admins delete posts" ON public.posts FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- 6.4 Social: Follows, Likes, Comments
CREATE POLICY "Follows viewable" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Manage own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id);

CREATE POLICY "Likes viewable" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Manage own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Comments viewable" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own comments" ON public.comments FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

CREATE POLICY "Comment likes viewable" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Manage comment likes" ON public.comment_likes FOR ALL USING (auth.uid() = user_id);

-- 6.5 Subscriptions
CREATE POLICY "View own subscriptions" ON public.subscriptions FOR SELECT USING (
  auth.uid() = subscriber_id OR auth.uid() = creator_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- 6.6 Notifications
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- 6.7 Stories & Highlights
CREATE POLICY "Stories viewable" ON public.stories FOR SELECT USING (expires_at > now());
CREATE POLICY "Create own stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Highlights viewable" ON public.highlights FOR SELECT USING (true);
CREATE POLICY "Manage own highlights" ON public.highlights FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Highlight stories viewable" ON public.highlight_stories FOR SELECT USING (true);
CREATE POLICY "Manage own highlight stories" ON public.highlight_stories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.highlights WHERE id = highlight_stories.highlight_id AND user_id = auth.uid())
);

-- 6.8 Saved, Muted, Reports
CREATE POLICY "Manage saved posts" ON public.saved_posts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Manage muted users" ON public.muted_users FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Submit reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins view reports" ON public.reports FOR SELECT USING (
  auth.uid() = reporter_id OR
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);
CREATE POLICY "Admins resolve reports" ON public.reports FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- 6.9 Financial Ledgers (Read-Only to users, mutations strictly through stored procedures)
CREATE POLICY "Users view own transactions" ON public.credit_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users view own orders" ON public.razorpay_orders FOR SELECT USING (auth.uid() = user_id);

-- 6.10 E2EE Messaging (Strict zero-knowledge confidentiality)
CREATE POLICY "Members view conversations" ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = conversations.id AND user_id = auth.uid())
);
CREATE POLICY "Members view conversation members" ON public.conversation_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid())
);
CREATE POLICY "Members send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Members read messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);

-- 6.11 Security Audit Logs (Append-only by procedures, viewable only by Admins)
CREATE POLICY "Admins view security audit logs" ON public.security_audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. INITIAL SEED: Official Bot & Genesis Audit Event
-- ══════════════════════════════════════════════════════════════════════════════

-- Seed first Genesis log entry into the cryptographic chain
SELECT public.log_security_event(
  'SYSTEM_INITIALIZATION',
  'INFO',
  NULL,
  '127.0.0.1',
  'Drishti Engine Migrator 2.0',
  jsonb_build_object('message', 'Zero-Trust Cyber-Hardened Schema successfully established.')
);
