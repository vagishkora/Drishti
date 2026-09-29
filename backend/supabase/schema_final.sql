-- ============================================================
-- Drishti (दृष्टि) — Final Database Schema (MIGRATION)
-- This script DROPS all old tables and recreates them cleanly.
-- ============================================================

-- Drop old trigger first
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop all existing tables (order matters due to foreign keys)
drop table if exists public.highlight_stories cascade;
drop table if exists public.highlights cascade;
drop table if exists public.story_views cascade;
drop table if exists public.stories cascade;
drop table if exists public.razorpay_orders cascade;
drop table if exists public.credit_transactions cascade;
drop table if exists public.reports cascade;
drop table if exists public.muted_users cascade;
drop table if exists public.saved_posts cascade;
drop table if exists public.notifications cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.comment_likes cascade;
drop table if exists public.comments cascade;
drop table if exists public.likes cascade;
drop table if exists public.follows cascade;
drop table if exists public.posts cascade;
drop table if exists public.videos cascade;
drop table if exists public.profiles cascade;
drop table if exists public.users cascade;

-- ============================================================
-- CREATE TABLES
-- ============================================================

create extension if not exists "uuid-ossp";

create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text,
  bio text,
  website text,
  avatar_url text,
  account_type text check (account_type in ('viewer','creator')) default 'viewer',
  credits integer default 500,
  is_private boolean default false,
  notification_preferences jsonb default '{"likes":true,"comments":true,"follows":true,"subscriptions":true}',
  created_at timestamptz default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  media_url text not null,
  media_type text check (media_type in ('image','video')),
  thumbnail_url text,
  caption text,
  is_premium boolean default false,
  is_pinned boolean default false,
  close_friends_only boolean default false,
  repost_of uuid references public.posts(id),
  views integer default 0,
  created_at timestamptz default now()
);

create table public.follows (
  follower_id uuid references public.users(id) on delete cascade,
  following_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

create table public.likes (
  user_id uuid references public.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  parent_id uuid references public.comments(id),
  content text not null,
  created_at timestamptz default now()
);

create table public.comment_likes (
  user_id uuid references public.users(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  primary key (user_id, comment_id)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.users(id) on delete cascade,
  creator_id uuid references public.users(id) on delete cascade,
  started_at timestamptz default now(),
  expires_at timestamptz default now() + interval '30 days',
  is_active boolean default true
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.users(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  type text check (type in ('like','comment','follow','subscription','reply')),
  post_id uuid references public.posts(id) on delete cascade,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  media_url text not null,
  media_type text check (media_type in ('image','video')),
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '24 hours',
  views integer default 0
);

create table public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  cover_url text,
  created_at timestamptz default now()
);

create table public.highlight_stories (
  highlight_id uuid references public.highlights(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  primary key (highlight_id, story_id)
);

create table public.saved_posts (
  user_id uuid references public.users(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  saved_at timestamptz default now(),
  primary key (user_id, post_id)
);

create table public.muted_users (
  user_id uuid references public.users(id) on delete cascade,
  muted_user_id uuid references public.users(id) on delete cascade,
  primary key (user_id, muted_user_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users(id),
  reported_user_id uuid references public.users(id),
  reported_post_id uuid references public.posts(id),
  reason text,
  created_at timestamptz default now()
);

create table public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  amount integer not null,
  type text check (type in ('purchase','subscription','signup_bonus','earned')),
  razorpay_order_id text,
  razorpay_payment_id text,
  description text,
  created_at timestamptz default now()
);

create table public.razorpay_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  razorpay_order_id text unique not null,
  amount integer not null,
  credits integer not null,
  status text check (status in ('created','paid','failed')) default 'created',
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notifications enable row level security;
alter table public.stories enable row level security;
alter table public.saved_posts enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.razorpay_orders enable row level security;

-- Users
create policy "Public profiles viewable" on public.users for select using (true);
create policy "Users update own profile" on public.users for update using (auth.uid() = id);
create policy "Users insert own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users delete own account" on public.users for delete using (auth.uid() = id);

-- Posts
create policy "Public posts viewable" on public.posts for select using (
  is_premium = false or
  user_id = auth.uid() or
  exists (
    select 1 from public.subscriptions
    where subscriber_id = auth.uid()
    and creator_id = posts.user_id
    and is_active = true
    and expires_at > now()
  )
);
create policy "Users insert own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users update own posts" on public.posts for update using (auth.uid() = user_id);
create policy "Users delete own posts" on public.posts for delete using (auth.uid() = user_id);

-- Follows
create policy "Follows viewable" on public.follows for select using (true);
create policy "Users manage own follows" on public.follows for all using (auth.uid() = follower_id);

-- Likes
create policy "Likes viewable" on public.likes for select using (true);
create policy "Users manage own likes" on public.likes for all using (auth.uid() = user_id);

-- Comments
create policy "Comments viewable" on public.comments for select using (true);
create policy "Users manage own comments" on public.comments for all using (auth.uid() = user_id);

-- Notifications
create policy "Users view own notifications" on public.notifications for select using (auth.uid() = recipient_id);
create policy "Anyone insert notifications" on public.notifications for insert with check (true);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = recipient_id);

-- Credit transactions
create policy "Users view own transactions" on public.credit_transactions for select using (auth.uid() = user_id);
create policy "Users insert own transactions" on public.credit_transactions for insert with check (auth.uid() = user_id);

-- Razorpay orders
create policy "Users view own orders" on public.razorpay_orders for select using (auth.uid() = user_id);
create policy "Users insert own orders" on public.razorpay_orders for insert with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username, full_name, credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    500
  );
  insert into public.credit_transactions (user_id, amount, type, description)
  values (new.id, 500, 'signup_bonus', 'Welcome bonus — 500 Drishti Credits');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
