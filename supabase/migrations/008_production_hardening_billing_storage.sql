-- Production hardening: private media, atomic credit ledger operations, and Stripe subscription tracking.

-- Users can read their balance, but all mutations must go through service-role RPCs.
drop policy if exists "Users can update own subscription" on public.user_subscriptions;

alter table public.user_subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false;

create unique index if not exists user_subscriptions_stripe_customer_id_unique
  on public.user_subscriptions (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists user_subscriptions_stripe_subscription_id_unique
  on public.user_subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table public.subscription_plans
  add column if not exists stripe_price_id text,
  add column if not exists active boolean not null default true,
  add column if not exists sort_order integer not null default 100;

create unique index if not exists subscription_plans_stripe_price_id_unique
  on public.subscription_plans (stripe_price_id)
  where stripe_price_id is not null;

insert into public.subscription_plans (name, price_cents, credits_monthly, tier, active, sort_order)
values
  ('Mensual 25 minutos', 150000, 125, 1, true, 10),
  ('Mensual 75 minutos', 400000, 375, 2, true, 20)
on conflict (name) do update set
  price_cents = excluded.price_cents,
  credits_monthly = excluded.credits_monthly,
  tier = excluded.tier,
  active = excluded.active,
  sort_order = excluded.sort_order,
  updated_at = now();

alter table public.credit_transactions
  add column if not exists idempotency_key text,
  add column if not exists stripe_invoice_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists render_job_id uuid references public.render_jobs(id) on delete set null,
  add column if not exists generation_job_id uuid references public.generation_jobs(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists credit_transactions_stripe_session_id_unique
  on public.credit_transactions (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists credit_transactions_stripe_invoice_id_unique
  on public.credit_transactions (stripe_invoice_id)
  where stripe_invoice_id is not null;

create unique index if not exists credit_transactions_user_idempotency_key_unique
  on public.credit_transactions (user_id, idempotency_key)
  where idempotency_key is not null;

create index if not exists credit_transactions_render_job_id_idx
  on public.credit_transactions (render_job_id)
  where render_job_id is not null;

create index if not exists credit_transactions_generation_job_id_idx
  on public.credit_transactions (generation_job_id)
  where generation_job_id is not null;

alter table public.generation_jobs
  add column if not exists credits_reserved numeric not null default 0,
  add column if not exists credits_refunded_at timestamptz,
  add column if not exists credit_transaction_id uuid references public.credit_transactions(id) on delete set null;

create or replace function public.fulfill_credit_purchase(
  p_user_id uuid,
  p_amount numeric,
  p_stripe_session_id text,
  p_package_id uuid default null,
  p_description text default 'Compra de creditos',
  p_stripe_customer_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription_id uuid;
  v_balance numeric;
  v_transaction_id uuid;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    raise exception 'invalid credit purchase';
  end if;

  if p_stripe_session_id is null or length(trim(p_stripe_session_id)) = 0 then
    raise exception 'stripe session id is required';
  end if;

  select id, credits_remaining
    into v_subscription_id, v_balance
  from public.user_subscriptions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if v_subscription_id is null then
    raise exception 'active subscription not found';
  end if;

  insert into public.credit_transactions (
    user_id,
    subscription_id,
    amount,
    type,
    description,
    stripe_session_id,
    package_id,
    metadata
  )
  values (
    p_user_id,
    v_subscription_id,
    p_amount,
    'purchase',
    coalesce(p_description, 'Compra de creditos'),
    p_stripe_session_id,
    p_package_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (stripe_session_id) where stripe_session_id is not null do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    return v_balance;
  end if;

  update public.user_subscriptions
  set
    credits_remaining = credits_remaining + p_amount,
    stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
    updated_at = now()
  where id = v_subscription_id
  returning credits_remaining into v_balance;

  return v_balance;
end;
$$;

create or replace function public.deduct_credits(
  p_user_id uuid,
  p_amount numeric,
  p_project_id uuid default null,
  p_render_job_id uuid default null,
  p_generation_job_id uuid default null,
  p_idempotency_key text default null,
  p_description text default null
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription_id uuid;
  v_balance numeric;
  v_existing_balance numeric;
  v_transaction_id uuid;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    raise exception 'invalid deduction';
  end if;

  if p_idempotency_key is not null then
    select us.credits_remaining
      into v_existing_balance
    from public.credit_transactions ct
    join public.user_subscriptions us on us.id = ct.subscription_id
    where ct.user_id = p_user_id
      and ct.idempotency_key = p_idempotency_key
    limit 1;

    if v_existing_balance is not null then
      return v_existing_balance;
    end if;
  end if;

  select id, credits_remaining
    into v_subscription_id, v_balance
  from public.user_subscriptions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if v_subscription_id is null or v_balance < p_amount then
    return null;
  end if;

  update public.user_subscriptions
  set credits_remaining = credits_remaining - p_amount,
      updated_at = now()
  where id = v_subscription_id
  returning credits_remaining into v_balance;

  insert into public.credit_transactions (
    user_id,
    subscription_id,
    amount,
    type,
    description,
    project_id,
    render_job_id,
    generation_job_id,
    idempotency_key
  )
  values (
    p_user_id,
    v_subscription_id,
    -p_amount,
    'usage',
    coalesce(p_description, 'Uso de creditos'),
    p_project_id,
    p_render_job_id,
    p_generation_job_id,
    p_idempotency_key
  )
  returning id into v_transaction_id;

  if p_generation_job_id is not null then
    update public.generation_jobs
    set credits_reserved = p_amount,
        credit_transaction_id = v_transaction_id
    where id = p_generation_job_id and user_id = p_user_id;
  end if;

  return v_balance;
end;
$$;

create or replace function public.refund_failed_generation(
  p_user_id uuid,
  p_amount numeric default null,
  p_project_id uuid default null,
  p_render_job_id uuid default null,
  p_generation_job_id uuid default null,
  p_reason text default null,
  p_idempotency_key text default null
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription_id uuid;
  v_balance numeric;
  v_refund_amount numeric;
  v_status text;
  v_key text;
  v_existing_balance numeric;
begin
  if p_user_id is null then
    raise exception 'user id is required';
  end if;

  if p_render_job_id is null and p_generation_job_id is null then
    raise exception 'a failed job id is required';
  end if;

  if p_render_job_id is not null then
    select status::text, credits_reserved
      into v_status, v_refund_amount
    from public.render_jobs
    where id = p_render_job_id and user_id = p_user_id
    for update;

    if v_status is null or v_status not in ('failed', 'cancelled') then
      raise exception 'render job is not refundable';
    end if;

    v_key := coalesce(p_idempotency_key, 'refund:render_job:' || p_render_job_id::text);
  else
    select status::text, credits_reserved
      into v_status, v_refund_amount
    from public.generation_jobs
    where id = p_generation_job_id and user_id = p_user_id
    for update;

    if v_status is null or v_status not in ('failed', 'cancelled') then
      raise exception 'generation job is not refundable';
    end if;

    v_key := coalesce(p_idempotency_key, 'refund:generation_job:' || p_generation_job_id::text);
  end if;

  v_refund_amount := coalesce(nullif(p_amount, 0), v_refund_amount);

  if v_refund_amount is null or v_refund_amount <= 0 then
    raise exception 'refund amount is required';
  end if;

  select us.credits_remaining
    into v_existing_balance
  from public.credit_transactions ct
  join public.user_subscriptions us on us.id = ct.subscription_id
  where ct.user_id = p_user_id
    and ct.idempotency_key = v_key
  limit 1;

  if v_existing_balance is not null then
    return v_existing_balance;
  end if;

  select id, credits_remaining
    into v_subscription_id, v_balance
  from public.user_subscriptions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if v_subscription_id is null then
    raise exception 'active subscription not found';
  end if;

  update public.user_subscriptions
  set credits_remaining = credits_remaining + v_refund_amount,
      updated_at = now()
  where id = v_subscription_id
  returning credits_remaining into v_balance;

  insert into public.credit_transactions (
    user_id,
    subscription_id,
    amount,
    type,
    description,
    project_id,
    render_job_id,
    generation_job_id,
    idempotency_key
  )
  values (
    p_user_id,
    v_subscription_id,
    v_refund_amount,
    'refund',
    coalesce(p_reason, 'Reembolso por generacion fallida'),
    p_project_id,
    p_render_job_id,
    p_generation_job_id,
    v_key
  );

  if p_generation_job_id is not null then
    update public.generation_jobs
    set credits_refunded_at = now()
    where id = p_generation_job_id and user_id = p_user_id;
  end if;

  return v_balance;
end;
$$;

create or replace function public.grant_subscription_invoice_credits(
  p_user_id uuid,
  p_amount numeric,
  p_stripe_invoice_id text,
  p_stripe_subscription_id text,
  p_description text default 'Creditos mensuales',
  p_metadata jsonb default '{}'::jsonb
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_subscription_id uuid;
  v_balance numeric;
  v_transaction_id uuid;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    raise exception 'invalid invoice credit grant';
  end if;

  if p_stripe_invoice_id is null or length(trim(p_stripe_invoice_id)) = 0 then
    raise exception 'stripe invoice id is required';
  end if;

  select id, credits_remaining
    into v_subscription_id, v_balance
  from public.user_subscriptions
  where user_id = p_user_id and status = 'active'
  order by created_at desc
  limit 1
  for update;

  if v_subscription_id is null then
    raise exception 'active subscription not found';
  end if;

  insert into public.credit_transactions (
    user_id,
    subscription_id,
    amount,
    type,
    description,
    stripe_invoice_id,
    stripe_subscription_id,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    v_subscription_id,
    p_amount,
    'subscription_grant',
    coalesce(p_description, 'Creditos mensuales'),
    p_stripe_invoice_id,
    p_stripe_subscription_id,
    'stripe_invoice:' || p_stripe_invoice_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (stripe_invoice_id) where stripe_invoice_id is not null do nothing
  returning id into v_transaction_id;

  if v_transaction_id is null then
    return v_balance;
  end if;

  update public.user_subscriptions
  set credits_remaining = credits_remaining + p_amount,
      stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
      updated_at = now()
  where id = v_subscription_id
  returning credits_remaining into v_balance;

  return v_balance;
end;
$$;

grant execute on function public.fulfill_credit_purchase(uuid, numeric, text, uuid, text, text, jsonb) to service_role;
grant execute on function public.deduct_credits(uuid, numeric, uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.refund_failed_generation(uuid, numeric, uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.grant_subscription_invoice_credits(uuid, numeric, text, text, text, jsonb) to service_role;

revoke execute on function public.fulfill_credit_purchase(uuid, numeric, text, uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.deduct_credits(uuid, numeric, uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.refund_failed_generation(uuid, numeric, uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.grant_subscription_invoice_credits(uuid, numeric, text, text, text, jsonb) from public, anon, authenticated;

-- Trigger/helper functions flagged by Supabase security advisors need an immutable search_path.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.handle_new_profile_subscription()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.user_subscriptions (
    user_id,
    plan_id,
    status,
    credits_remaining,
    current_period_start,
    current_period_end
  )
  select
    new.id,
    sp.id,
    'active',
    coalesce(sp.credits_monthly, 0),
    now(),
    now() + interval '1 month'
  from public.subscription_plans sp
  where sp.name = 'Free Trial'
  order by sp.created_at asc
  limit 1
  on conflict do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_updated_at() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_profile_subscription() from public, anon, authenticated;

-- Private storage by default. Authenticated access goes through RLS object ownership and server signed URLs.
update storage.buckets
set
  public = false,
  allowed_mime_types = array[
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/avi',
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
    'audio/x-wav',
    'audio/ogg',
    'audio/webm',
    'audio/m4a'
  ]
where id = 'videos';
