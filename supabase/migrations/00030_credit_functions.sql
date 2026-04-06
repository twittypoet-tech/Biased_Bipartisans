-- ── Credit deduction RPC ──────────────────────────────────────────────────────
-- Atomic credit deduction that fails if insufficient balance.
-- Called by /api/reporter/call and /api/commentary-requests.

CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles
  SET credits = credits - p_amount, credits_updated_at = now()
  WHERE id = p_user_id AND credits >= p_amount;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
