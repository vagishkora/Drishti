-- Drishti schema_v2.sql — Feature Expansion
-- Run this AFTER schema.sql in the Supabase SQL Editor

-- ═══════════════════════════════════════════════════════════
-- 1. Modify existing profiles table
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'viewer' CHECK (account_type IN ('viewer', 'creator')),
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;


-- ═══════════════════════════════════════════════════════════
-- 2. Posts Table (unified photos + videos)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT CHECK (type IN ('video', 'photo')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  views_count INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  is_demo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public posts viewable by all."
  ON public.posts FOR SELECT
  USING (
    is_premium = false
    OR auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM public.subscriptions
      WHERE subscriber_id = auth.uid()
        AND creator_id = posts.creator_id
        AND status = 'active'
        AND current_period_end > NOW()
    )
  );

CREATE POLICY "Creators can insert posts."
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update own posts."
  ON public.posts FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete own posts."
  ON public.posts FOR DELETE
  USING (auth.uid() = creator_id);


-- ═══════════════════════════════════════════════════════════
-- 3. Drishti Credits System
-- ═══════════════════════════════════════════════════════════
-- Architectural Note: This is a pluggable credits abstraction layer.
-- Future work: Replace add/spend logic with Razorpay/Stripe webhooks.
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance INT DEFAULT 500 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credits."
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

-- Insert/Update handled by backend service role only


-- ═══════════════════════════════════════════════════════════
-- 4. Social Follow System
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows are publicly viewable."
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others."
  ON public.follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow."
  ON public.follows FOR DELETE
  USING (auth.uid() = follower_id);


-- ═══════════════════════════════════════════════════════════
-- 5. Likes
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_id UUID NOT NULL,
  content_type TEXT CHECK (content_type IN ('post', 'comment')) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_id, content_type)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes are viewable by all."
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like content."
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike."
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- 6. Comments (with one-level replies)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  body TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by all."
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can comment."
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments."
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- 7. Notifications
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('follow', 'like', 'comment', 'subscribe', 'reply')) NOT NULL,
  content_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own notifications."
  ON public.notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Backend can insert notifications."
  ON public.notifications FOR UPDATE
  USING (auth.uid() = recipient_id);
