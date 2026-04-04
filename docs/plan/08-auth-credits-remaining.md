# Auth, Credits & Dashboard — Remaining Work

> Last updated: 2026-04-04

## What's Built

### Phases 1-6: Core Auth Infrastructure
- [x] Database: user_profiles, credit_transactions, user_reports tables + trigger + RLS
- [x] Supabase SSR auth clients (server + browser) + middleware
- [x] AuthProvider context (user, profile, credits, signOut)
- [x] /auth page with 6-digit OTP flow
- [x] Navigation: hamburger menu, branding ("Biased Bipartisans"), auth buttons
- [x] /subscribe page (Pro card + credit tiers with expandable value breakdowns)
- [x] /my dashboard (home, reports, settings pages)
- [x] Magic code email template (docs/email-templates/magic-code.html)

### Phase 7: Credit Gating
- [x] `/api/reporter/call`: Auth required + 5 credits deducted per report + transaction logged
- [x] `/api/votes`: Auth required, uses user.id as voter
- [x] `call-hero.tsx`: "Sign in" button when unauthenticated, credits badge when logged in
- [x] Top-up modal: triggered on 402 (insufficient credits), links to /subscribe
- [x] Subscribe page: pro-aware (compact status for Pro members, full card for free users)
- [x] `useIsProUser()` hook wired to real profile.tier check

### Bipi Onboarding Agent
- [x] Retell agent created (agent_dc30d418ef88204e5452f1eed5)
- [x] /api/onboarding/call route (direct 1-on-1 with RetellWebClient)
- [x] Webhook extracts user_interests + interest_entities, updates profile
- [x] Settings page: "Personalize with Bipi" replaces static picker
- [x] Prompt reference: docs/prompts/bipi-onboarding-agent.md

### Monetization Setup
- [x] Google AdSense on /reports/[slug] pages only (2 ad slots)
- [x] Vercel Web Analytics installed

## What Needs Building

### Phase 7 — Remaining Items (MEDIUM)
- [ ] **Commentary requests API**: Require auth + pro tier, deduct 1 credit/agent. Currently UX-only gate.
- [ ] **Commenting API**: Require auth + pro tier for inserting comments. Currently empty state only.

### Phase 8: Weekly Credit Refill (MEDIUM)
- [ ] SQL function to add 5 credits to all free users weekly
- [ ] SQL function to add 100 credits to all pro users monthly
- [ ] Schedule via Supabase pg_cron or Inngest
- [ ] Log transactions with reason `weekly_free` / `monthly_pro`

### Stripe Integration (BLOCKED — needs Stripe MCP)
- [ ] Create Stripe products/prices for Pro subscription ($25/mo) + credit packs (100/500/1000)
- [ ] Webhook handler for `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`
- [ ] Wire `/subscribe` page CTAs to Stripe Checkout sessions
- [ ] Update `user_profiles.tier` on subscription change
- [ ] Handle credit pack purchases (add credits + log transaction)
- [ ] Wire "Manage" button to Stripe Customer Portal

### Dashboard Population (MEDIUM)
- [ ] `/my/reports`: Fetch user_reports + reporter_calls join, render report cards
- [ ] Favorite/unfavorite toggle on reports
- [ ] Save report to user_reports when a call completes (via webhook, using user_id on reporter_calls)
- [ ] Show credit usage history on dashboard

### User Recommendations (LOW — future)
- [ ] Vector search / RAG for personalized topic suggestions based on user_profiles.interests
- [ ] Use interests to filter/rank preset suggestions on home page
- [ ] Pro user daily digest: "Your daily report on {interests} is waiting"

### Admin Route Protection (LOW)
- [ ] Add admin role check to middleware for `/admin/*` and `/api/admin/*`
- [ ] Either a `role` column on user_profiles or a separate admin table

## Important Notes for Next Session

1. **Supabase Auth Email**: Paste `docs/email-templates/magic-code.html` into Supabase Dashboard → Auth → Email Templates → Magic Link. Use `{{ .Token }}` as the code placeholder.

2. **Supabase Auth Config**: Enable "Email OTP" in Supabase Dashboard → Auth → Providers → Email. Set OTP expiry to 600s.

3. **Credit Costs Reference**:
   - 1 news report = 5 credits
   - 1 agent commentary = 1 credit (pro only)
   - 1-on-1 agent call = 1 credit/minute (pro only, feature not yet built)
   - Free tier: 10 signup bonus + 5/week
   - Pro tier: 100/month ($25/mo)
   - À la carte: $0.25/credit (down to $0.20 at 1000)

4. **Hamburger menu pages** (About, Mission, Work With Us, Contact) are linked but pages don't exist yet. Low priority.

5. **Bipi onboarding agent** prompt is at `docs/prompts/bipi-onboarding-agent.md`. Post-call analysis fields: `user_interests`, `interest_entities`, `onboarding_successful`, `interest_summary`.

6. **AdSense** needs site approval before ads render. Ad slot IDs (`data-ad-slot`) should be added once ad units are created in the AdSense dashboard.
