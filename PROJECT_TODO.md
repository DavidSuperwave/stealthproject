# DobleLabs (Jaime AI) - Project TODO & Review Checklist

*Last Updated: February 16, 2026*  
*Review Date: Tomorrow (February 17, 2026)*  
*Status: Pre-Launch Final Testing*

---

## 🔴 CRITICAL - MUST FIX BEFORE LAUNCH

### 1. Demo Video Missing
- [ ] **ISSUE:** Self-hosted video `/videos/vsl.mp4` was not loading
- [ ] **SOLUTION:** Switched to Vimeo embed (ID: 1165562311)
- [ ] **ACTION:** Verify Vimeo video displays correctly on landing page
- [ ] **TEST:** Check desktop + mobile responsiveness

### 2. Stripe Test Payment Setup
- [ ] Get Stripe test API keys from https://dashboard.stripe.com/test/apikeys
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
- [ ] Add keys to `.env.local`
- [ ] Create credit packages in Supabase:
```sql
INSERT INTO credit_packages (name, credits, price_cents_mxn, minutes_equivalent, includes_scripts, active) VALUES 
  ('Starter - 50 créditos', 50, 9900, 10, false, true),
  ('Pro - 150 créditos', 150, 24900, 30, true, true),
  ('Enterprise - 500 créditos', 500, 79900, 100, true, true);
```
- [ ] Install Stripe CLI: https://stripe.com/docs/stripe-cli
- [ ] Run `stripe listen --forward-to http://localhost:3000/api/stripe/webhook`
- [ ] Copy webhook secret to `.env.local`
- [ ] **TEST:** Purchase with card `4242 4242 4242 4242`
- [ ] **VERIFY:** Credits appear in user account

### 3. Subscription VSL for First-Time Users
- [ ] Create VSL (Video Sales Letter) for onboarding
- [ ] Add to first login / dashboard
- [ ] OR: Add to email sequence (Close CRM)
- [ ] **CONTENT:** Explain how to use DobleLabs step-by-step

### 4. Update Payment to Monthly
- [ ] **CURRENT:** One-time credit purchases only
- [ ] **NEEDED:** Monthly subscription option
- [ ] Create subscription plans table:
```sql
CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stripe_price_id text,
  price_cents_mxn integer NOT NULL,
  credits_monthly integer NOT NULL,
  features text[] DEFAULT '{}',
  active boolean DEFAULT true
);
```
- [ ] Update Stripe checkout to support `mode: 'subscription'`
- [ ] Add webhook handler for `customer.subscription.created`
- [ ] Add webhook handler for `invoice.payment_succeeded`

### 5. Fix Scripts Feature
- [ ] **ISSUE:** Scripts table exists but UI may not be complete
- [ ] **CHECK:** `app/scripts/page.tsx` - workshop for scripts
- [ ] **VERIFY:** Users can save/load scripts
- [ ] **VERIFY:** Scripts connect to generation workflow
- [ ] **TEST:** Create script → Use in project

---

## 🟡 HIGH PRIORITY - NEEDED FOR FULL FUNCTIONALITY

### 6. Video Download UI Button
- [ ] **LOCATION:** Projects dashboard or project detail page
- [ ] **API:** `/api/projects/{id}/download` exists
- [ ] **ACTION:** Add download button component:
```tsx
<a 
  href={`/api/projects/${projectId}/download`}
  className="btn-primary"
>
  Descargar Video
</a>
```
- [ ] **TEST:** Download works for completed generations

### 7. Production Deployment Checklist
- [ ] Add environment variables to Vercel:
  - [ ] `CLOSE_API_KEY`
  - [ ] `LIPDUB_API_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `STRIPE_SECRET_KEY` (LIVE for production)
  - [ ] `STRIPE_WEBHOOK_SECRET` (LIVE)
  - [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (LIVE)
  - [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `CRON_SECRET`
- [ ] Add production webhook URL in Stripe dashboard
- [ ] Enable email confirmations in Supabase (if disabled)

### 8. Email Sequence Activation (Close CRM)
- [ ] Create email sequence in Close CRM
- [ ] Get sequence ID: `seq_xxx`
- [ ] Add to CLOSE_CONFIG in `app/api/close/create-lead/route.ts`:
```typescript
EMAIL_SEQUENCE_ID: 'seq_your_sequence_id_here',
```
- [ ] Uncomment sequence subscription code
- [ ] **TEST:** New signup receives welcome email series

### 9. Error Handling & Retry Logic
- [ ] Handle LipDub API failures (auto-retry)
- [ ] Handle Stripe webhook failures
- [ ] Add user notifications for failed generations
- [ ] Add loading states for all async operations

---

## 🟢 NICE TO HAVE - POST-LAUNCH

### 10. Analytics & Tracking
- [ ] Add Google Analytics or Plausible
- [ ] Track: Signups, video uploads, generations, purchases
- [ ] Close CRM conversion tracking

### 11. Advanced Features
- [ ] Bulk generation (multiple recipients)
- [ ] CSV upload for personalization variables
- [ ] Webhook notifications for generation completion
- [ ] Zapier integration

### 12. UI/UX Improvements
- [ ] Dark mode toggle
- [ ] Spanish/English language switcher
- [ ] Onboarding tutorial for first-time users
- [ ] FAQ chatbot

---

## 📊 SYSTEMS INTEGRATED (DONE)

| System | Status | Purpose |
|--------|--------|---------|
| Supabase Auth | ✅ DONE | User signup/login |
| Supabase DB | ✅ DONE | Store projects, videos, jobs |
| LipDub API | ✅ DONE | AI video generation |
| Close CRM | ✅ DONE | Lead management, follow-ups |
| Vimeo | ✅ DONE | Landing page video hosting |
| Stripe | 🟡 SETUP | Payments (test mode) |
| Vercel | 🟡 DEPLOY | Hosting (need env vars) |

---

## 🧪 FINAL TEST CHECKLIST

Before going live, verify:

- [ ] User can sign up → Lead appears in Close CRM
- [ ] User can upload video → Shot created in LipDub
- [ ] User can upload audio → Audio processed
- [ ] Generation completes → User can download video
- [ ] User can purchase credits → Stripe payment works
- [ ] Failed generation → Credits refunded
- [ ] Download button works for completed videos
- [ ] Scripts feature works (save/load)
- [ ] All pages mobile-responsive
- [ ] No console errors in browser

---

## 📞 SUPPORT CONTACTS

| Service | Support URL |
|---------|-------------|
| LipDub API | https://lipdub.readme.io/ |
| Close CRM | https://help.close.com/ |
| Stripe | https://support.stripe.com/ |
| Supabase | https://supabase.com/support |
| Vercel | https://vercel.com/help |

---

## 📝 NOTES FOR TOMORROW'S REVIEW

**Julian's Summary:**
- Core functionality is 90% complete
- Main blockers: Stripe payments (needs test), Download UI (quick add)
- Close CRM fully integrated with opportunities + tasks
- Video generation tested and working
- Need final end-to-end test with real signup → payment → generation flow

**Questions to Answer:**
1. Do we launch with one-time credits or wait for monthly subscriptions?
2. What's the VSL content for onboarding?
3. Do we need email sequences active before launch?

---

*Document created by Julian for DobleLabs final review*  
*Ready for testing session: February 17, 2026*
