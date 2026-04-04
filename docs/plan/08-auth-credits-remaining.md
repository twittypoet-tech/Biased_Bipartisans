# Auth, Credits & Dashboard — Remaining Work

> Last updated: 2026-04-04

## What's Built (Phases 1-6)
- [x] Database: user_profiles, credit_transactions, user_reports tables + trigger + RLS
- [x] Supabase SSR auth clients (server + browser) + middleware
- [x] AuthProvider context (user, profile, credits, signOut)
- [x] /auth page with 6-digit OTP flow
- [x] Navigation: hamburger menu, branding, auth buttons
- [x] /subscribe page (Pro card + credit tiers, Stripe placeholder)
- [x] /my dashboard (home, reports, settings pages)
- [x] Magic code email template (docs/email-templates/magic-code.html)

## What Needs Building

### Phase 7: Credit Gating (HIGH PRIORITY)
Credit deduction is not yet enforced. All features are still free.

- [ ] **`/api/reporter/call`**: Check auth, verify 5 credits available, deduct on call creation, log transaction. Anonymous users → show auth prompt in call-hero instead of calling.
- [ ] **Commentary requests**: Require auth + pro tier, deduct 1 credit/agent
- [ ] **Voting**: Require auth (any tier) — update `/api/votes` to check session
- [ ] **Commenting**: Require auth + pro tier — update comment insert to use user_id
- [ ] **call-hero.tsx**: Show "Sign in to make a call" when not authenticated, show credits remaining when authenticated

### Phase 8: Weekly Credit Refill (MEDIUM)
- [ ] SQL function to add 5 credits to all free users weekly
- [ ] SQL function to add 100 credits to all pro users monthly
- [ ] Schedule via Supabase pg_cron or Inngest
- [ ] Log transactions with reason `weekly_free` / `monthly_pro`

### Stripe Integration (BLOCKED — needs Stripe MCP)
- [ ] Create Stripe products/prices for Pro subscription + credit packs
- [ ] Webhook handler for `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- [ ] Wire `/subscribe` page CTAs to Stripe Checkout
- [ ] Update `user_profiles.tier` on subscription change
- [ ] Handle credit pack purchases

### Dashboard Population (MEDIUM)
- [ ] `/my/reports`: Fetch user_reports + reporter_calls join, render report cards
- [ ] Favorite/unfavorite toggle on reports
- [ ] Save report to user_reports when a call completes (webhook or client-side)
- [ ] Show credit usage history on dashboard

### User Recommendations (LOW — future)
- [ ] Vector search / RAG for personalized topic suggestions
- [ ] Use `user_profiles.interests` to filter/rank preset suggestions
- [ ] Pro user daily digest: "Your daily report on {interests} is waiting"

### Admin Route Protection (LOW)
- [ ] Add admin role check to middleware for `/admin/*` and `/api/admin/*`
- [ ] Either a `role` column on user_profiles or a separate admin check

## Important Notes for Next Session

1. **Supabase Auth Email**: The magic-code HTML template at `docs/email-templates/magic-code.html` needs to be manually pasted into Supabase Dashboard → Auth → Email Templates → Magic Link. Use `{{ .Token }}` as the code placeholder.

2. **Supabase Auth Config**: Enable "Email OTP" in Supabase Dashboard → Auth → Providers → Email. Set OTP expiry to 600 seconds (10 min). Disable "Confirm email" if you want instant login without email verification step.

3. **Environment Variables**: The auth system requires both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to be set in Vercel env vars (they should already be there).

4. **Credit Costs Reference**:
   - 1 news report = 5 credits
   - 1 agent commentary = 1 credit (pro only)
   - 1-on-1 agent call = 1 credit/minute (pro only, feature not yet built)
   - Free tier: 10 signup bonus + 5/week
   - Pro tier: 100/month ($25/mo)
   - À la carte: $0.25/credit (down to $0.20 at 1000)

5. **The `isProUser()` function** in `apps/web/src/components/public/pro-upgrade-modal.tsx` still returns `false`. Wire it to `useAuth().profile?.tier === 'pro'` when credit gating is implemented.

6. **Hamburger menu pages** (About, Mission, Work With Us, Contact) are linked but the pages don't exist yet. They'll 404 until created. Low priority — create as simple static pages when needed.
