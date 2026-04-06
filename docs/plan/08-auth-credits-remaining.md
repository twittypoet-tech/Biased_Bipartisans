# Auth, Credits & Dashboard — Remaining Work

> Last updated: 2026-04-06

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

### Phase 8 & Stripe (completed 2026-04-06)
- [x] `deduct_credits` RPC function (migration 00030) — atomic deduction with balance check
- [x] Stripe products: Pro ($25/mo), 100cr ($25), 500cr ($115), 1000cr ($200)
- [x] `/api/stripe/checkout` — Stripe Checkout sessions (subscription + one-time)
- [x] `/api/stripe/portal` — Stripe Customer Portal (manage subscription, billing history)
- [x] `/api/webhooks/stripe` — full lifecycle: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated/deleted/paused/resumed
- [x] Subscribe page: live Stripe CTAs, success banner, loading states, "Manage" for pro
- [x] TopUpModal links to /subscribe (Stripe checkout)
- [x] Inngest `weeklyFreeRefill` — 5 credits every Monday for free users (cap 50)
- [x] Inngest `monthlyProRefill` — reset to 100 credits on 1st for pro users
- [x] Webhook endpoint: `https://biasedbipartisans.com/api/webhooks/stripe`

## What Needs Building

### Phase 7 — Remaining Items (MEDIUM)
- [x] **Commentary requests API**: Require auth + pro tier, deduct 1 credit/agent. ✅ Built 2026-04-06
- [ ] **Commenting API**: Require auth + pro tier for inserting comments. Currently empty state only.

### Phase 8: Weekly Credit Refill ✅ DONE
- [x] `deduct_credits` RPC function created (migration 00030) — atomic deduction with balance check
- [x] Inngest `weeklyFreeRefill` — adds 5 credits to free users every Monday, capped at 50
- [x] Inngest `monthlyProRefill` — resets pro users to 100 credits on 1st of month
- [x] Both log transactions with reason `weekly_free` / `monthly_pro`

### Stripe Integration ✅ DONE
- [x] Stripe products created: Pro Subscription ($25/mo), 100/500/1000 credit packs
- [x] `/api/stripe/checkout` — creates Stripe Checkout sessions (subscription or one-time)
- [x] `/api/stripe/portal` — Stripe Customer Portal for subscription management
- [x] `/api/webhooks/stripe` — handles checkout.session.completed, invoice.paid, customer.subscription.deleted
- [x] Subscribe page CTAs wired to live Stripe Checkout
- [x] Pro users: "Manage" button opens Stripe Customer Portal
- [x] Credit packs: purchase adds credits + logs transaction
- [x] Subscription lifecycle: activate → monthly renewal → cancellation all handled

### Dashboard Population (MEDIUM)
- [x] `/my/reports`: Functional page — fetches reporter_calls by user_id, shows wire status badges. Done 2026-04-06.
- [ ] Favorite/unfavorite toggle on reports
- [ ] Save report to user_reports when a call completes (via webhook, using user_id on reporter_calls)
- [ ] Show credit usage history on dashboard

### User Recommendations (LOW — future)
- [ ] Vector search / RAG for personalized topic suggestions based on user_profiles.interests
- [ ] Use interests to filter/rank preset suggestions on home page
- [ ] Pro user daily digest: "Your daily report on {interests} is waiting"

### Admin Route Protection (LOW)
- [x] `role` column on user_profiles — `user_role` enum (subscriber/journalist/admin). Done 2026-04-06.
- [ ] Add admin role check to middleware for `/admin/*` and `/api/admin/*`

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

4. **Hamburger menu pages**: About and Mission pages exist. Work With Us: Investigative Journalists page built (2026-04-06) with application form. Contact page still needed.

5. **Bipi onboarding agent** prompt is at `docs/prompts/bipi-onboarding-agent.md`. Post-call analysis fields: `user_interests`, `interest_entities`, `onboarding_successful`, `interest_summary`.

6. **AdSense** needs site approval before ads render. Ad slot IDs (`data-ad-slot`) should be added once ad units are created in the AdSense dashboard.
