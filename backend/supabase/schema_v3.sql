-- Drishti schema_v3.sql — Stories Engine + Instagram Features
-- Run this AFTER schema_v2.sql in the Supabase SQL Editor

-- ═══════════════════════════════════════════════════════
-- 1. Extend profiles table with missing columns
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits INT DEFAULT 500,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"likes":true,"comments":true,"follows":true,"subscriptions":true}';

-- ═══════════════════════════════════════════════════════
-- 2. Extend posts table
-- ═══════════════════════════════════════════════════════
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS close_friends_only BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS repost_of UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'posts';

-- ═══════════════════════════════════════════════════════
-- 3. Drishti Stories Engine
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image', 'video')) NOT NULL,
  storage_bucket TEXT DEFAULT 'stories',
  views INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories viewable by all authenticated users."
  ON public.stories FOR SELECT
  USING (expires_at > NOW());

CREATE POLICY "Users can create own stories."
  ON public.stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories."
  ON public.stories FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- 4. Story Views (deduplicated)
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.story_views (
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (story_id, viewer_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Story views visible to story owner."
  ON public.story_views FOR SELECT
  USING (
    auth.uid() = viewer_id OR
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
  );

CREATE POLICY "Viewers can insert story views."
  ON public.story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

-- ═══════════════════════════════════════════════════════
-- 5. Highlights
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlights are publicly viewable."
  ON public.highlights FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own highlights."
  ON public.highlights FOR ALL
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.highlight_stories (
  highlight_id UUID REFERENCES public.highlights(id) ON DELETE CASCADE,
  story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
  PRIMARY KEY (highlight_id, story_id)
);

ALTER TABLE public.highlight_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlight stories publicly viewable."
  ON public.highlight_stories FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their highlight stories."
  ON public.highlight_stories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.highlights WHERE id = highlight_id AND user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════
-- 6. Saved / Bookmarked Posts
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.saved_posts (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved posts."
  ON public.saved_posts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts."
  ON public.saved_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts."
  ON public.saved_posts FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- 7. Reports
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can submit reports."
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ═══════════════════════════════════════════════════════
-- 8. Muted Users
-- ═══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.muted_users (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, muted_user_id)
);

ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their muted list."
  ON public.muted_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mute others."
  ON public.muted_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmute."
  ON public.muted_users FOR DELETE
  USING (auth.uid() = user_id);
