-- Drishti Supabase Database Schema
-- Includes RLS (Row Level Security) policies for secure access

-- 1. Profiles Table (extends internal auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger to auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'phone');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Subscriptions Table
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due')) NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscriber_id, creator_id)
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for Subscriptions
CREATE POLICY "Users can view their own subscriptions."
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);

-- Note: Insert/Update handled by backend Service Role (Simulated Payment Gateway)


-- 3. Videos Table
CREATE TABLE public.videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Policies for Videos
CREATE POLICY "Free videos are viewable by everyone."
  ON public.videos FOR SELECT
  USING (is_premium = false OR auth.uid() = creator_id);

CREATE POLICY "Premium videos are viewable by subscribers or creators."
  ON public.videos FOR SELECT
  USING (
    is_premium = true AND (
      auth.uid() = creator_id OR
      EXISTS (
        SELECT 1 FROM public.subscriptions 
        WHERE subscriber_id = auth.uid() 
        AND creator_id = videos.creator_id 
        AND status = 'active' 
        AND current_period_end > NOW()
      )
    )
  );

CREATE POLICY "Creators can insert their own videos."
  ON public.videos FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their own videos."
  ON public.videos FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their own videos."
  ON public.videos FOR DELETE
  USING (auth.uid() = creator_id);


-- 4. Transactions Table
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'INR' NOT NULL,
  status TEXT CHECK (status IN ('succeeded', 'failed', 'pending')) NOT NULL,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies for Transactions
CREATE POLICY "Users can view their own transactions."
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Storage configuration
-- Need to run this in SQL editor as well:
-- 1. Create a bucket named "videos"
-- 2. Make it private, or public if using signed URLs (we use signed URLs, so keep private).
-- 3. Add storage RLS policies for uploads.
