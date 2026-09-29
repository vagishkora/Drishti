-- ══════════════════════════════════════════════════════════
-- Admin Role Migration
-- ══════════════════════════════════════════════════════════
-- Adds is_admin column to public.users and seeds the
-- drishti.official bot account as the first admin.
-- Also adds an RLS policy so admins can read all user rows.
-- ══════════════════════════════════════════════════════════

-- 1. Add is_admin boolean column (defaults to false)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- 2. Seed the drishti.official bot account as admin
UPDATE public.users
  SET is_admin = true
  WHERE id = '00000000-0000-0000-0000-000000000010';

-- 3. RLS policy: admins can read all user rows
CREATE POLICY "Admins can read all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND is_admin = true
    )
  );
