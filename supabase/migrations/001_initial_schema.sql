-- ============================================================
-- Jaime AI — Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- --------------------------------------------------------
-- 0. Helper: auto-update updated_at columns
-- --------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;


-- --------------------------------------------------------
-- 1. Profiles (extends auth.users)
-- --------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- --------------------------------------------------------
-- 2. Subscription plans (reference table)
-- --------------------------------------------------------
create table public.subscription_plans (
  id              uuid primary key default gen_random_uuid(),
  name            text    not null unique,       -- 'Free Trial', 'Starter', 'Pro', 'Enterprise'
  price_cents     integer,                       -- null for free / custom
  credits_monthly integer,                       -- null = unlimited
  features        text[]  not null default '{}',
  tier_level      integer not null default 0,    -- 0=free, 1=starter, 2=pro, 3=enterprise
  created_at      timestamptz not null default now()
);

-- Seed the plans that match the UI
insert into public.subscription_plans (name, price_cents, credits_monthly, features, tier_level) values
  ('Free Trial',  null,  0,    '{"0 credits","Standard quality"}', 0),
  ('Starter',     2900,  100,  '{"100 credits/month","Basic support","Standard quality"}', 1),
  ('Pro',         9900,  500,  '{"500 credits/month","Priority support","High quality","API access"}', 2),
  ('Enterprise',  null,  null, '{"Unlimited credits","Dedicated support","Premium quality","Custom integration"}', 3);


-- --------------------------------------------------------
-- 3. User subscriptions / credits
-- --------------------------------------------------------
create table public.user_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  plan_id               uuid not null references public.subscription_plans(id),
  credits_remaining     numeric(10,2) not null default 0,
  trial_days_remaining  integer,
  status                text not null default 'active'
                        check (status in ('active','cancelled','expired','past_due')),
  started_at            timestamptz not null default now(),
  ends_at               timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index user_subscriptions_active_idx
  on public.user_subscriptions (user_id) where status = 'active';

create trigger user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row execute function public.handle_updated_at();

-- Auto-assign Free Trial subscription when a profile is created
create or replace function public.handle_new_profile_subscription()
returns trigger as $$
declare
  free_plan_id uuid;
begin
  select id into free_plan_id from public.subscription_plans where name = 'Free Trial' limit 1;
  if free_plan_id is not null then
    insert into public.user_subscriptions (user_id, plan_id, credits_remaining, trial_days_remaining, status)
    values (new.id, free_plan_id, 0, NULL, 'active');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute function public.handle_new_profile_subscription();


-- --------------------------------------------------------
-- 4. Projects
-- --------------------------------------------------------
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  name             text not null,
  type             text not null default 'personalization'
                   check (type in ('personalization','translation')),
  status           text not null default 'draft'
                   check (status in ('draft','processing','completed','failed')),
  source_language  text not null default 'Spanish (Mexico)',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.handle_updated_at();


-- --------------------------------------------------------
-- 5. Videos (source video uploads per project)
-- --------------------------------------------------------
create table public.videos (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  file_name    text,
  file_size    bigint,            -- bytes
  duration     text,              -- e.g. "1:30"
  -- LipDub API identifiers
  lipdub_project_id  integer,
  lipdub_scene_id    integer,
  lipdub_actor_id    integer,
  lipdub_video_id    text,
  upload_url   text,
  upload_status text not null default 'pending'
               check (upload_status in ('pending','uploading','completed','failed')),
  created_at   timestamptz not null default now()
);

create index videos_project_id_idx on public.videos (project_id);


-- --------------------------------------------------------
-- 6. Audio files
-- --------------------------------------------------------
create table public.audio_files (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  audio_id      text,              -- LipDub audio_id
  file_name     text,
  content_type  text,
  upload_status text not null default 'pending'
                check (upload_status in ('pending','uploading','completed','failed')),
  created_at    timestamptz not null default now()
);

create index audio_files_project_id_idx on public.audio_files (project_id);


-- --------------------------------------------------------
-- 7. Variables (dynamic placeholders per project)
-- --------------------------------------------------------
create table public.variables (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  type        text not null default 'text'
              check (type in ('text','company','industry')),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create index variables_project_id_idx on public.variables (project_id);


-- --------------------------------------------------------
-- 8. Recipients (CSV rows per project)
-- --------------------------------------------------------
create table public.recipients (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  first_name  text not null,
  company     text not null,
  email       text not null,
  industry    text,
  extra_data  jsonb,              -- any additional CSV columns
  created_at  timestamptz not null default now()
);

create index recipients_project_id_idx on public.recipients (project_id);


-- --------------------------------------------------------
-- 9. Generation jobs (one per "Generate" click)
-- --------------------------------------------------------
create table public.generation_jobs (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  shot_id       integer,           -- LipDub shot_id
  generate_id   text,              -- LipDub generate_id
  status        text not null default 'queued'
                check (status in ('queued','processing','completed','failed')),
  progress      integer not null default 0 check (progress between 0 and 100),
  current_step  text,
  error         text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index generation_jobs_project_id_idx on public.generation_jobs (project_id);

create trigger generation_jobs_updated_at
  before update on public.generation_jobs
  for each row execute function public.handle_updated_at();


-- --------------------------------------------------------
-- 10. Generated videos (one per recipient per job)
-- --------------------------------------------------------
create table public.generated_videos (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.generation_jobs(id) on delete cascade,
  recipient_id  uuid not null references public.recipients(id) on delete cascade,
  file_url      text,
  download_url  text,
  status        text not null default 'pending'
                check (status in ('pending','processing','completed','failed')),
  error         text,
  generated_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index generated_videos_job_id_idx on public.generated_videos (job_id);
create index generated_videos_recipient_id_idx on public.generated_videos (recipient_id);


-- --------------------------------------------------------
-- 11. Scripts (knowledge vault)
-- --------------------------------------------------------
create table public.scripts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  content       text not null,
  category      text not null default 'outreach',
  tags          text[] not null default '{}',
  usage_count   integer not null default 0,
  last_used     timestamptz,
  -- Performance metrics
  reply_rate    numeric(5,2),      -- percentage e.g. 12.50
  positive_rate numeric(5,2),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index scripts_user_id_idx on public.scripts (user_id);

create trigger scripts_updated_at
  before update on public.scripts
  for each row execute function public.handle_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles          enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;
alter table public.projects          enable row level security;
alter table public.videos            enable row level security;
alter table public.audio_files       enable row level security;
alter table public.variables         enable row level security;
alter table public.recipients        enable row level security;
alter table public.generation_jobs   enable row level security;
alter table public.generated_videos  enable row level security;
alter table public.scripts           enable row level security;

-- Profiles: users can read/update their own profile
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Subscription plans: anyone authenticated can read
create policy "Authenticated users can view plans"
  on public.subscription_plans for select using (auth.role() = 'authenticated');

-- User subscriptions: own data only
create policy "Users can view own subscription"
  on public.user_subscriptions for select using (auth.uid() = user_id);
create policy "Users can update own subscription"
  on public.user_subscriptions for update using (auth.uid() = user_id);

-- Projects: full CRUD on own projects
create policy "Users can view own projects"
  on public.projects for select using (auth.uid() = user_id);
create policy "Users can create projects"
  on public.projects for insert with check (auth.uid() = user_id);
create policy "Users can update own projects"
  on public.projects for update using (auth.uid() = user_id);
create policy "Users can delete own projects"
  on public.projects for delete using (auth.uid() = user_id);

-- Videos: access via project ownership
create policy "Users can view own videos"
  on public.videos for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can insert own videos"
  on public.videos for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can update own videos"
  on public.videos for update
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can delete own videos"
  on public.videos for delete
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- Audio files: access via project ownership
create policy "Users can view own audio"
  on public.audio_files for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can insert own audio"
  on public.audio_files for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can update own audio"
  on public.audio_files for update
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can delete own audio"
  on public.audio_files for delete
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- Variables: access via project ownership
create policy "Users can view own variables"
  on public.variables for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can insert own variables"
  on public.variables for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can update own variables"
  on public.variables for update
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can delete own variables"
  on public.variables for delete
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- Recipients: access via project ownership
create policy "Users can view own recipients"
  on public.recipients for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can insert own recipients"
  on public.recipients for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can update own recipients"
  on public.recipients for update
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can delete own recipients"
  on public.recipients for delete
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- Generation jobs: access via project ownership
create policy "Users can view own jobs"
  on public.generation_jobs for select
  using (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can insert own jobs"
  on public.generation_jobs for insert
  with check (project_id in (select id from public.projects where user_id = auth.uid()));
create policy "Users can update own jobs"
  on public.generation_jobs for update
  using (project_id in (select id from public.projects where user_id = auth.uid()));

-- Generated videos: access via job → project ownership
create policy "Users can view own generated videos"
  on public.generated_videos for select
  using (job_id in (
    select gj.id from public.generation_jobs gj
    join public.projects p on p.id = gj.project_id
    where p.user_id = auth.uid()
  ));
create policy "Users can insert own generated videos"
  on public.generated_videos for insert
  with check (job_id in (
    select gj.id from public.generation_jobs gj
    join public.projects p on p.id = gj.project_id
    where p.user_id = auth.uid()
  ));
create policy "Users can update own generated videos"
  on public.generated_videos for update
  using (job_id in (
    select gj.id from public.generation_jobs gj
    join public.projects p on p.id = gj.project_id
    where p.user_id = auth.uid()
  ));

-- Scripts: own data only
create policy "Users can view own scripts"
  on public.scripts for select using (auth.uid() = user_id);
create policy "Users can create scripts"
  on public.scripts for insert with check (auth.uid() = user_id);
create policy "Users can update own scripts"
  on public.scripts for update using (auth.uid() = user_id);
create policy "Users can delete own scripts"
  on public.scripts for delete using (auth.uid() = user_id);
