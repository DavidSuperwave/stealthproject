-- ============================================================
-- Migration: Remove trial references and set base credits to 0
-- ============================================================

-- 1. Update the Free Trial plan: 0 credits, remove trial feature text
UPDATE public.subscription_plans
SET credits_monthly = 0,
    features = '{"0 credits","Standard quality"}'
WHERE name = 'Free Trial';

-- 2. Change default credits_remaining on user_subscriptions to 0
ALTER TABLE public.user_subscriptions
  ALTER COLUMN credits_remaining SET DEFAULT 0;

-- 3. Replace the signup trigger so new users get 0 credits & no trial days
CREATE OR REPLACE FUNCTION public.handle_new_profile_subscription()
RETURNS trigger AS $$
DECLARE
  free_plan_id uuid;
BEGIN
  SELECT id INTO free_plan_id FROM public.subscription_plans WHERE name = 'Free Trial' LIMIT 1;
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, credits_remaining, trial_days_remaining, status)
    VALUES (new.id, free_plan_id, 0, NULL, 'active');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Zero out existing Free Trial users
UPDATE public.user_subscriptions
SET credits_remaining = 0, trial_days_remaining = NULL
WHERE plan_id IN (SELECT id FROM public.subscription_plans WHERE name = 'Free Trial');
