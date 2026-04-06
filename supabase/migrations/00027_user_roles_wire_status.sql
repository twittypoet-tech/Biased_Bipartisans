-- ── User roles, wire status, journalist applications ─────────────────────────
--
-- Adds role-based access (subscriber/journalist/admin), wire publishing
-- controls, and a journalist application intake table.

-- 1. Add role column to user_profiles
ALTER TABLE user_profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'subscriber'
  CHECK (role IN ('subscriber', 'journalist', 'admin'));

CREATE INDEX idx_user_profiles_role ON user_profiles (role);

-- 2. Add wire_status column to reporter_calls
ALTER TABLE reporter_calls ADD COLUMN wire_status TEXT NOT NULL DEFAULT 'none'
  CHECK (wire_status IN ('none', 'auto', 'pending', 'approved', 'rejected'));

CREATE INDEX idx_reporter_calls_wire
  ON reporter_calls (wire_status)
  WHERE wire_status IN ('auto', 'approved');

-- 3. Backfill: existing published reports get wire_status = 'auto'
--    so the wire feed doesn't go empty on deploy
UPDATE reporter_calls SET wire_status = 'auto' WHERE is_published = true;

-- 4. Journalist applications table
CREATE TABLE journalist_applications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT        NOT NULL,
  email         TEXT        NOT NULL,
  portfolio_url TEXT,
  expertise     TEXT[]      DEFAULT '{}',
  statement     TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. RLS for journalist_applications (admin-only read, public insert)
ALTER TABLE journalist_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an application"
  ON journalist_applications FOR INSERT
  WITH CHECK (true);

-- 6. Update user_profiles RLS: prevent users from changing their own role
--    Drop and recreate the update policy to include the role guard
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT up.role FROM user_profiles up WHERE up.id = auth.uid())
  );
