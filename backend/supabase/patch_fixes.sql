-- ============================================================
-- Drishti — Patch Script (Run after schema_final.sql)
-- Fixes: Storage buckets, RLS, seed data, verified badges, add_credits RPC
-- ============================================================

-- ── Storage Buckets ──────────────────────────────────────────
-- Ensure buckets exist and are PUBLIC
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('videos', 'videos', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('stories', 'stories', true) on conflict (id) do update set public = true;
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do update set public = true;

-- Storage policies (allow authenticated uploads)
drop policy if exists "Auth users upload photos" on storage.objects;
create policy "Auth users upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'photos');

drop policy if exists "Auth users upload videos" on storage.objects;
create policy "Auth users upload videos" on storage.objects for insert to authenticated with check (bucket_id = 'videos');

drop policy if exists "Auth users upload stories" on storage.objects;
create policy "Auth users upload stories" on storage.objects for insert to authenticated with check (bucket_id = 'stories');

drop policy if exists "Auth users upload avatars" on storage.objects;
create policy "Auth users upload avatars" on storage.objects for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "Public read all objects" on storage.objects;
create policy "Public read all objects" on storage.objects for select to public using (true);

drop policy if exists "Authenticated users select all" on storage.objects;
create policy "Authenticated users select all" on storage.objects for select to authenticated using (true);

drop policy if exists "Auth users delete own" on storage.objects;
create policy "Auth users delete own" on storage.objects for delete to authenticated using (true);

drop policy if exists "Auth users update own" on storage.objects;
create policy "Auth users update own" on storage.objects for update to authenticated using (true);

-- ── Fix Posts RLS ────────────────────────────────────────────
drop policy if exists "Users insert own posts" on public.posts;
create policy "Users insert own posts" on public.posts
  for insert with check (auth.uid() = user_id);

-- ── Verified Badge Column ───────────────────────────────────
alter table public.users add column if not exists is_verified boolean default false;
alter table public.users add column if not exists followers_count integer default null;
alter table public.users add column if not exists following_count integer default null;
alter table public.users add column if not exists subscribers_count integer default null;

-- ── add_credits RPC function ────────────────────────────────
drop function if exists add_credits(uuid, integer);
create or replace function add_credits(user_id_input uuid, credits_input integer)
returns integer as $$
declare
  new_balance integer;
begin
  update public.users set credits = credits + credits_input 
  where id = user_id_input
  returning credits into new_balance;
  
  return new_balance;
end;
$$ language plpgsql security definer;

-- ── Drishti Seeded Content System ───────────────────────────
-- Temporarily drop the FK constraint so we can insert bot accounts
alter table public.users drop constraint if exists users_id_fkey;

-- 5 Indian creator bot accounts
insert into public.users (id, username, full_name, bio, avatar_url, account_type, credits, is_verified, followers_count, following_count, subscribers_count)
values
  ('00000000-0000-0000-0000-000000000001', 'arjun.creates', 'Arjun Sharma', 'Filmmaker & Visual Storyteller from Mumbai 🎬', 'https://picsum.photos/seed/arjun/150/150', 'creator', 1000, true, 112400, 482, 1250),
  ('00000000-0000-0000-0000-000000000002', 'priya.lens', 'Priya Patel', 'Travel & Lifestyle Creator from Bangalore 📸', 'https://picsum.photos/seed/priya/150/150', 'creator', 1000, true, 89500, 312, 840),
  ('00000000-0000-0000-0000-000000000003', 'rohit.reels', 'Rohit Verma', 'Tech & Gadgets Review Creator from Delhi 💻', 'https://picsum.photos/seed/rohit/150/150', 'creator', 1000, true, 156000, 128, 2100),
  ('00000000-0000-0000-0000-000000000004', 'sneha.art', 'Sneha Iyer', 'Digital Artist & Illustrator from Chennai 🎨', 'https://picsum.photos/seed/sneha/150/150', 'creator', 1000, true, 42100, 560, 320),
  ('00000000-0000-0000-0000-000000000005', 'vikram.shots', 'Vikram Nair', 'Street & Nature Photographer from Kerala 🌿', 'https://picsum.photos/seed/vikram/150/150', 'creator', 1000, true, 54800, 240, 580)
on conflict (id) do update set 
  followers_count = excluded.followers_count,
  following_count = excluded.following_count,
  subscribers_count = excluded.subscribers_count;

-- Drishti Official promotional account
insert into public.users (id, username, full_name, bio, avatar_url, account_type, credits, is_verified, followers_count, following_count)
values (
  '00000000-0000-0000-0000-000000000010',
  'drishti.official',
  'Drishti Official',
  '👁️ The official Drishti account. See Beyond. | Platform updates, creator spotlights & more',
  'https://picsum.photos/seed/drishti/150/150',
  'creator', 9999, true, 1250000, 10
) on conflict (id) do update set 
  followers_count = excluded.followers_count,
  following_count = excluded.following_count;

-- Re-add the FK constraint (only for REAL users going forward)
-- Using NOT VALID so it doesn't check existing rows (bot accounts)
alter table public.users
  add constraint users_id_fkey
  foreign key (id) references auth.users(id) on delete cascade
  not valid;

-- Seed massive batch of posts (40+)
insert into public.posts (user_id, media_url, media_type, caption, is_premium, views)
values
  -- ArjunSharma (ArjunCreates)
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/arjun1/600/600', 'image', 'Golden hour in Mumbai 🌅 #cinematography #mumbai', false, 12400),
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/arjun2/600/600', 'image', 'Behind the scenes of my latest short film 🎬', false, 8900),
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/arjun3/600/600', 'image', 'The art of storytelling through lenses #filmmaking', true, 5600),
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/arjun4/600/600', 'image', 'Mumbai local trains — A visual symphony 🚂', false, 15000),
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/arjun5/600/600', 'image', 'Color grading session — Teal and Orange vibe', true, 3400),
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/arjun6/600/600', 'image', 'Street food of Mahim — Cinematic cut', false, 18000),
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/arjun7/600/600', 'image', 'Rainy nights at Marine Drive 🌧️', false, 25000),
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/arjun8/600/600', 'image', 'Visualizing the unseen #Drishti', true, 1200),

  -- Priya Patel (PriyaLens)
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/priya1/600/600', 'image', 'Exploring the streets of Bangalore ☕ #travel', false, 21000),
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/priya2/600/600', 'image', 'Sunrise at Coorg 🌄 #naturephotography', false, 15600),
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/priya3/600/600', 'image', 'Cafe hopping in Indiranagar 🍰', false, 34000),
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/priya4/600/600', 'image', 'Weekend getaway to Hampi #heritage', true, 12000),
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/priya5/600/600', 'image', 'The colors of Rajasthan 🏰', false, 45000),
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/priya6/600/600', 'image', 'Varanasi Ghats at dawn 🕯️', false, 67000),
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/priya7/600/600', 'image', 'Ladakh Diaries — The land of high passes ❄️', true, 8900),
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/priya8/600/600', 'image', 'Solo travel tips for India 🎒', false, 120000),

  -- Rohit Verma (RohitReels)
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/rohit1/600/600', 'image', 'Unboxing the latest smartphone from India 📱 #tech', false, 32000),
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/rohit2/600/600', 'image', 'My complete work from home setup 2025 💻 #setup', false, 28000),
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/rohit3/600/600', 'image', 'The perfect camera for creators in 2025 📸', true, 45000),
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/rohit4/600/600', 'image', 'Custom mechanical keyboard build ⌨️', false, 12000),
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/rohit5/600/600', 'image', 'Apple vs Android — The definitive 2025 guide', false, 98000),
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/rohit6/600/600', 'image', 'Reviewing the first Made in India high-end laptop 🇮🇳', true, 110000),
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/rohit7/600/600', 'image', 'Smart home automation on a budget 🏠', false, 56000),
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/rohit8/600/600', 'image', 'Secret productivity apps you need! 🚀', true, 23000),

  -- Sneha Iyer (SnehaArt)
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/sneha1/600/600', 'image', 'New digital artwork — Inspired by Indian mythology 🎨', false, 18900),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/sneha2/600/600', 'image', 'Rangoli meets modern art 🪔 #digitalart #diwali', false, 23400),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/sneha3/600/600', 'image', 'Character design for my new webcomic ✍️', true, 12000),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/sneha4/600/600', 'image', 'Watercolor studies of Kerala backwaters 🎨', false, 8900),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/sneha5/600/600', 'image', 'Creating art with AI — My process 🤖', false, 34000),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/sneha6/600/600', 'image', 'Illustrating the streets of Chennai 🏙️', true, 15000),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/sneha7/600/600', 'image', 'Limited edition prints now available! 🖼️', false, 5600),
  ('00000000-0000-0000-0000-000000000004', 'https://picsum.photos/seed/sneha8/600/600', 'image', 'Speed-painting a Durga portrait 🔱', true, 42000),

  -- Vikram Nair (VikramShots)
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/vikram1/600/600', 'image', 'Misty mornings in Munnar 🌿 #kerala #nature', false, 16700),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/vikram2/600/600', 'image', 'Street life in Fort Kochi 📸 #streetphotography', false, 20900),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/vikram3/600/600', 'image', 'Wildlife of Wayanad — High res shot 🐘', true, 12000),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/vikram4/600/600', 'image', 'Vertical panorama of Athirappilly Falls 🌊', false, 45000),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/vikram5/600/600', 'image', 'Macro photography: The hidden world of bugs 🐜', false, 12000),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/vikram6/600/600', 'image', 'Kerala Boat Races — A frame of adrenaline 🚣‍♂️', true, 89000),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/vikram7/600/600', 'image', 'Shadow play in Old Delhi 👤', false, 23000),
  ('00000000-0000-0000-0000-000000000005', 'https://picsum.photos/seed/vikram8/600/600', 'image', 'Exclusive nature wallpapers for subscribers 🍃', true, 5600),

  -- Drishti Official
  ('00000000-0000-0000-0000-000000000010', 'https://picsum.photos/seed/promo1/600/600', 'image', '👁️ Welcome to Drishti — where creators See Beyond. Join thousands of creators sharing their vision. #Drishti #SeeBeyond', false, 500000),
  ('00000000-0000-0000-0000-000000000010', 'https://picsum.photos/seed/promo2/600/600', 'image', '🚀 Drishti Creators Program is now live! Upload your content and earn Drishti Credits. #CreatorEconomy #Drishti', false, 420000),
  ('00000000-0000-0000-0000-000000000010', 'https://picsum.photos/seed/promo3/600/600', 'image', '💡 Did you know? Premium creators on Drishti earn credits every time someone subscribes. Start creating today! #Drishti', false, 380000),
  ('00000000-0000-0000-0000-000000000010', 'https://picsum.photos/seed/promo4/600/600', 'image', '🏆 Creator of the Month: @arjun.creates! Check out his latest short films.', false, 1200000),
  ('00000000-0000-0000-0000-000000000010', 'https://picsum.photos/seed/promo5/600/600', 'image', '🔒 Upgrade to Premium: Support your favorite creators and get exclusive access.', false, 950000);

-- Re-create buckets and policies for FIX 2
insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('photos', 'photos', true),
  ('videos', 'videos', true),
  ('stories', 'stories', true)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload avatars" on storage.objects;
create policy "Authenticated users can upload avatars"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars');

drop policy if exists "Authenticated users can upload photos" on storage.objects;
create policy "Authenticated users can upload photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'photos');

drop policy if exists "Authenticated users can upload videos" on storage.objects;
create policy "Authenticated users can upload videos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'videos');

drop policy if exists "Authenticated users can upload stories" on storage.objects;
create policy "Authenticated users can upload stories"
on storage.objects for insert
to authenticated
with check (bucket_id = 'stories');

drop policy if exists "Public can view all storage objects" on storage.objects;
create policy "Public can view all storage objects"
on storage.objects for select
to public
using (true);

-- FIX 1 Premium Posts Seeding
insert into public.posts (user_id, media_url, media_type, caption, is_premium, views)
values
  ('00000000-0000-0000-0000-000000000001', 'https://picsum.photos/seed/premium1/600/600', 'image', '🔒 Exclusive behind the scenes content', true, 890),
  ('00000000-0000-0000-0000-000000000002', 'https://picsum.photos/seed/premium2/600/600', 'image', '🔒 Premium travel vlog — Subscribers only', true, 1200),
  ('00000000-0000-0000-0000-000000000003', 'https://picsum.photos/seed/premium3/600/600', 'image', '🔒 Exclusive tech review for subscribers', true, 2100);

-- FIX 2 RLS Policies
drop policy if exists "Users insert own posts" on public.posts;
create policy "Users insert own posts" on public.posts
for insert with check (auth.uid() = user_id);

drop policy if exists "Users insert own stories" on public.stories;
create policy "Users insert own stories" on public.stories
for insert with check (
  (auth.uid() = user_id) OR 
  (user_id BETWEEN '00000000-0000-0000-0000-000000000001' AND '00000000-0000-0000-0000-000000000010')
);

-- ── User Recovery & Robustness (FIX 6) ───────────────────────
-- This fixes the root cause where users exist in auth but not public.users
insert into public.users (id, username, full_name, credits)
select 
  id, 
  coalesce(raw_user_meta_data->>'username', split_part(email, '@', 1)),
  coalesce(raw_user_meta_data->>'full_name', ''),
  500
from auth.users
on conflict (id) do nothing;

-- Ensure storage policies allow SELECT for auth users during upload handshake
drop policy if exists "Authenticated users select own" on storage.objects;
create policy "Authenticated users select own" on storage.objects 
for select to authenticated using (true);

drop policy if exists "Authenticated users delete own" on storage.objects;
create policy "Authenticated users delete own" on storage.objects 
for delete to authenticated using (true);

-- Allow users to delete their own posts
drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts" on public.posts
for delete using (auth.uid() = user_id);

