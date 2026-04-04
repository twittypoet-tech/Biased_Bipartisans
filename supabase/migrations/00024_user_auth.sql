-- ── User auth: profiles, credits, reports ────────────────────────────────────

-- 1. User profiles (extends Supabase Auth)
CREATE TABLE user_profiles (
  id                     UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name           TEXT,
  avatar_url             TEXT,
  tier                   TEXT        NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  credits                INTEGER     NOT NULL DEFAULT 10,
  credits_updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  interests              TEXT[]      DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Credit transaction log
CREATE TABLE credit_transactions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount        INTEGER     NOT NULL,
  reason        TEXT        NOT NULL CHECK (reason IN (
    'signup_bonus', 'weekly_free', 'monthly_pro', 'purchase',
    'report', 'commentary', 'agent_call'
  )),
  reference_id  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_tx_user ON credit_transactions (user_id, created_at DESC);

-- 3. User-report associations
CREATE TABLE user_reports (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reporter_call_id UUID        NOT NULL REFERENCES reporter_calls(id) ON DELETE CASCADE,
  is_favorite      BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, reporter_call_id)
);

CREATE INDEX idx_user_reports_user ON user_reports (user_id, created_at DESC);

-- 4. Add user_id to reporter_calls (nullable for legacy anonymous reports)
ALTER TABLE reporter_calls ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);

-- 5. Add user_id to report_comments (nullable, supplements session_id)
ALTER TABLE report_comments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_profiles(id);

-- 6. Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, credits)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
    10
  );
  -- Log signup bonus
  INSERT INTO public.credit_transactions (user_id, amount, reason)
  VALUES (NEW.id, 10, 'signup_bonus');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 7. RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public can read basic profile info (for display names in comments etc.)
CREATE POLICY "Public can read display names"
  ON user_profiles FOR SELECT
  USING (true);

-- Users can read own credit transactions
CREATE POLICY "Users can read own transactions"
  ON credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage own report associations
CREATE POLICY "Users can read own reports"
  ON user_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON user_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON user_reports FOR DELETE
  USING (auth.uid() = user_id);
