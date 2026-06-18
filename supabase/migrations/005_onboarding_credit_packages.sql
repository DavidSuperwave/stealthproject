-- ============================================================
-- Doble Labs onboarding and billing package support
-- Required first-account intake plus credit package catalog.
-- ============================================================

alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles add column if not exists creator_type text;
alter table public.profiles add column if not exists business_type text;
alter table public.profiles add column if not exists primary_use_case text;
alter table public.profiles add column if not exists target_audience text;
alter table public.profiles add column if not exists content_channels text[] not null default '{}';
alter table public.profiles add column if not exists monthly_video_volume text;
alter table public.profiles add column if not exists interested_services text[] not null default '{}';
alter table public.profiles add column if not exists onboarding_goals text;

update public.profiles
set
  onboarding_completed = true,
  onboarding_completed_at = coalesce(onboarding_completed_at, now())
where onboarding_completed = false
  and created_at < now() - interval '1 minute';

create table if not exists public.credit_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_cents_mxn integer not null check (price_cents_mxn >= 0),
  credits numeric(10,2) not null check (credits > 0),
  minutes_equivalent numeric(10,2) not null check (minutes_equivalent > 0),
  features text[] not null default '{}',
  is_best_value boolean not null default false,
  includes_scripts boolean not null default false,
  stripe_price_id text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_packages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_packages'
      and policyname = 'Active credit packages are public'
  ) then
    create policy "Active credit packages are public"
      on public.credit_packages for select using (active = true);
  end if;
end $$;

insert into public.credit_packages
  (name, price_cents_mxn, credits, minutes_equivalent, features, is_best_value, includes_scripts, active, sort_order)
values
  ('Starter', 29000, 50, 10, '{"10 minutes of AI video","Standard generation queue","Script chat access"}', false, true, true, 10),
  ('Growth', 79000, 175, 35, '{"35 minutes of AI video","Priority workflow support","Script chat access","Campaign planning"}', true, true, true, 20),
  ('Studio', 149000, 400, 80, '{"80 minutes of AI video","Priority workflow support","Script chat access","Managed service review"}', false, true, true, 30)
on conflict (id) do nothing;

alter table public.credit_transactions add column if not exists stripe_session_id text;
alter table public.credit_transactions add column if not exists package_id uuid references public.credit_packages(id) on delete set null;

create index if not exists credit_transactions_package_id_idx on public.credit_transactions(package_id);
create index if not exists credit_transactions_stripe_session_id_idx on public.credit_transactions(stripe_session_id);
