-- ============================================================
-- Drishti — RLS Patch Script
-- Fixes missing policies for subscriptions, stories, and saved posts
-- ============================================================

-- ── Subscriptions ──────────────────────────────────────────
drop policy if exists "Subscriptions viewable by parties" on public.subscriptions;
create policy "Subscriptions viewable by parties" on public.subscriptions
  for select using (auth.uid() = subscriber_id or auth.uid() = creator_id);

drop policy if exists "Users can subscribe" on public.subscriptions;
create policy "Users can subscribe" on public.subscriptions
  for insert with check (auth.uid() = subscriber_id);

-- ── Stories ────────────────────────────────────────────────
drop policy if exists "Stories viewable by all" on public.stories;
create policy "Stories viewable by all" on public.stories
  for select using (true);

drop policy if exists "Users insert own stories" on public.stories;
create policy "Users insert own stories" on public.stories
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete own stories" on public.stories;
create policy "Users delete own stories" on public.stories
  for delete using (auth.uid() = user_id);

-- ── Saved Posts ─────────────────────────────────────────────
drop policy if exists "Users view own saved posts" on public.saved_posts;
create policy "Users view own saved posts" on public.saved_posts
  for select using (auth.uid() = user_id);

drop policy if exists "Users save posts" on public.saved_posts;
create policy "Users save posts" on public.saved_posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users unsave posts" on public.saved_posts;
create policy "Users unsave posts" on public.saved_posts
  for delete using (auth.uid() = user_id);

-- ── Comment Likes ───────────────────────────────────────────
drop policy if exists "Comment likes viewable" on public.comment_likes;
create policy "Comment likes viewable" on public.comment_likes
  for select using (true);

drop policy if exists "Users manage own comment likes" on public.comment_likes;
create policy "Users manage own comment likes" on public.comment_likes
  for all using (auth.uid() = user_id);

-- ── Atomic Subscription RPC ────────────────────────────────
-- Handles: Balance check, Credit transfer, Subscription insert, Notification insert
-- Runs as SECURITY DEFINER to bypass RLS for credit updates.
create or replace function subscribe_creator(subscriber_id_input uuid, creator_id_input uuid)
returns void as $$
declare
  sub_balance integer;
begin
  -- 1. Check balance
  select credits into sub_balance from public.users where id = subscriber_id_input;
  if sub_balance < 100 then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  -- 2. Deduct from subscriber
  update public.users set credits = credits - 100 where id = subscriber_id_input;
  insert into public.credit_transactions (user_id, amount, type, description)
  values (subscriber_id_input, -100, 'subscription', 'Subscribed to creator');

  -- 3. Add to creator
  update public.users set credits = credits + 100 where id = creator_id_input;
  insert into public.credit_transactions (user_id, amount, type, description)
  values (creator_id_input, 100, 'earned', 'Subscription earned');

  -- 4. Insert subscription
  insert into public.subscriptions (subscriber_id, creator_id)
  values (subscriber_id_input, creator_id_input);

  -- 5. Insert notification
  insert into public.notifications (recipient_id, sender_id, type)
  values (creator_id_input, subscriber_id_input, 'subscription');
end;
$$ language plpgsql security definer;
