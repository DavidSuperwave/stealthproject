-- ============================================================
-- Doble Labs platform foundation
-- Workspaces, brands, campaigns, render jobs, usage, and performance learning.
-- ============================================================

-- Compatibility columns used by the current app code.
alter table public.generation_jobs add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.generation_jobs add column if not exists audio_id text;
alter table public.generation_jobs add column if not exists download_url text;
alter table public.generation_jobs add column if not exists notified_at timestamptz;

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  type text not null,
  project_id uuid references public.projects(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_id_idx on public.credit_transactions(user_id);
create index if not exists credit_transactions_project_id_idx on public.credit_transactions(project_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'info' check (type in ('info','success','warning','error')),
  title text not null,
  body text,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_read_idx on public.notifications(user_id, read_at, created_at desc);

-- Workspace/brand hierarchy.
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  mode text not null default 'self_serve' check (mode in ('managed_service','self_serve')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','operator','client','viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  industry text,
  audience text,
  offer text,
  positioning text,
  voice_profile jsonb not null default '{}',
  compliance_rules jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_memory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  type text not null,
  title text,
  content text not null,
  summary text,
  metadata jsonb not null default '{}',
  source text,
  source_url text,
  importance integer not null default 3 check (importance between 1 and 5),
  status text not null default 'active' check (status in ('active','archived','needs_review')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brain_snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete cascade,
  snapshot jsonb not null,
  reason text,
  created_at timestamptz not null default now()
);

create table public.prompt_versions (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references public.brands(id) on delete set null,
  type text not null,
  system_prompt text not null,
  user_prompt text not null,
  model_provider text,
  model_name text,
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  token_usage jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Content engine.
create table public.content_campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  objective text,
  platform text not null default 'tiktok',
  target_video_count integer,
  target_duration_sec integer not null default 45,
  status text not null default 'draft' check (status in ('draft','ideation','scripting','rendering','review','completed','archived')),
  brief jsonb not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.content_campaigns(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  title text not null,
  hook text,
  angle text,
  format text,
  target_persona text,
  awareness_stage text,
  source_memory_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','approved','rejected','rendered')),
  score numeric(5,2),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_scripts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.content_campaigns(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  idea_id uuid references public.content_ideas(id) on delete set null,
  title text,
  hook text,
  body text,
  cta text,
  full_script text not null,
  duration_target_sec integer not null default 45,
  caption_text text,
  compliance_notes text[] not null default '{}',
  risk_flags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','approved','rejected','sent_to_render','rendered')),
  prompt_version_id uuid references public.prompt_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Persistent provider jobs.
create table public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  campaign_id uuid references public.content_campaigns(id) on delete set null,
  script_id uuid references public.content_scripts(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null,
  provider_model text not null,
  idempotency_key text,
  provider_request_id text,
  provider_job_id text,
  status text not null default 'queued' check (status in ('draft','queued','submitted','in_progress','completed','failed','cancelled','refunded')),
  progress integer not null default 0 check (progress between 0 and 100),
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  estimated_cost_usd numeric(10,4),
  actual_cost_usd numeric(10,4),
  credits_reserved numeric(10,2),
  credits_captured numeric(10,2),
  error_code text,
  error_message text,
  submitted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.render_jobs(id) on delete cascade,
  event_type text not null,
  message text,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.video_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  campaign_id uuid references public.content_campaigns(id) on delete set null,
  render_job_id uuid references public.render_jobs(id) on delete set null,
  script_id uuid references public.content_scripts(id) on delete set null,
  title text,
  source_url text,
  storage_path text,
  public_url text,
  duration_sec numeric(8,2),
  width integer,
  height integer,
  content_type text,
  file_size bigint,
  provider text,
  status text not null default 'ready' check (status in ('ready','processing','failed','archived')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  campaign_id uuid references public.content_campaigns(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  render_job_id uuid references public.render_jobs(id) on delete set null,
  event_type text not null,
  provider text,
  model text,
  units numeric(12,4),
  unit_type text,
  estimated_cost_usd numeric(10,4),
  actual_cost_usd numeric(10,4),
  credits numeric(10,2),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Manual performance loop.
create table public.performance_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  campaign_id uuid references public.content_campaigns(id) on delete set null,
  title text not null,
  source text not null default 'manual',
  imported_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.performance_metrics (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.performance_reports(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  campaign_id uuid references public.content_campaigns(id) on delete set null,
  video_asset_id uuid references public.video_assets(id) on delete set null,
  render_job_id uuid references public.render_jobs(id) on delete set null,
  content_script_id uuid references public.content_scripts(id) on delete set null,
  platform text not null default 'tiktok',
  platform_url text,
  views integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  saves integer not null default 0,
  average_watch_time_sec numeric(8,2),
  completion_rate numeric(6,4),
  hold_rate_2s numeric(6,4),
  leads integer,
  conversions integer,
  notes text,
  performance_score numeric(8,4),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.performance_learnings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  campaign_id uuid references public.content_campaigns(id) on delete set null,
  metric_id uuid references public.performance_metrics(id) on delete cascade,
  memory_item_id uuid references public.brand_memory_items(id) on delete set null,
  type text not null,
  title text not null,
  insight text not null,
  confidence numeric(5,2) not null default 0.50,
  status text not null default 'needs_review' check (status in ('needs_review','approved','rejected','added_to_brain')),
  metadata jsonb not null default '{}',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.candidate_memory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  type text not null,
  title text,
  content text not null,
  metadata jsonb not null default '{}',
  status text not null default 'needs_review' check (status in ('needs_review','approved','rejected','added_to_brain')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists workspace_id uuid references public.workspaces(id) on delete set null;
alter table public.projects add column if not exists brand_id uuid references public.brands(id) on delete set null;
alter table public.projects add column if not exists legacy_flow boolean not null default true;

alter table public.brands add constraint brands_id_workspace_unique unique (id, workspace_id);
alter table public.content_campaigns add constraint content_campaigns_id_workspace_unique unique (id, workspace_id);
alter table public.content_campaigns add constraint content_campaigns_id_brand_unique unique (id, brand_id);
alter table public.content_scripts add constraint content_scripts_id_campaign_unique unique (id, campaign_id);
alter table public.render_jobs add constraint render_jobs_id_workspace_unique unique (id, workspace_id);
alter table public.video_assets add constraint video_assets_id_workspace_unique unique (id, workspace_id);
alter table public.render_jobs add constraint render_jobs_script_requires_campaign check (script_id is null or campaign_id is not null);
alter table public.video_assets add constraint video_assets_script_requires_campaign check (script_id is null or campaign_id is not null);

alter table public.brand_memory_items
  add constraint brand_memory_items_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

alter table public.content_campaigns
  add constraint content_campaigns_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

alter table public.content_ideas
  add constraint content_ideas_campaign_brand_fk
  foreign key (campaign_id, brand_id) references public.content_campaigns(id, brand_id);

alter table public.content_scripts
  add constraint content_scripts_campaign_brand_fk
  foreign key (campaign_id, brand_id) references public.content_campaigns(id, brand_id);

alter table public.render_jobs
  add constraint render_jobs_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

alter table public.render_jobs
  add constraint render_jobs_campaign_workspace_fk
  foreign key (campaign_id, workspace_id) references public.content_campaigns(id, workspace_id);

alter table public.render_jobs
  add constraint render_jobs_script_campaign_fk
  foreign key (script_id, campaign_id) references public.content_scripts(id, campaign_id);

alter table public.video_assets
  add constraint video_assets_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

alter table public.video_assets
  add constraint video_assets_campaign_workspace_fk
  foreign key (campaign_id, workspace_id) references public.content_campaigns(id, workspace_id);

alter table public.video_assets
  add constraint video_assets_script_campaign_fk
  foreign key (script_id, campaign_id) references public.content_scripts(id, campaign_id);

alter table public.usage_events
  add constraint usage_events_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

alter table public.usage_events
  add constraint usage_events_campaign_workspace_fk
  foreign key (campaign_id, workspace_id) references public.content_campaigns(id, workspace_id);

alter table public.performance_reports
  add constraint performance_reports_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

alter table public.performance_metrics
  add constraint performance_metrics_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

alter table public.performance_learnings
  add constraint performance_learnings_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

alter table public.candidate_memory_items
  add constraint candidate_memory_items_brand_workspace_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

create index workspaces_owner_id_idx on public.workspaces(owner_id);
create index workspace_members_user_id_idx on public.workspace_members(user_id);
create index brands_workspace_id_idx on public.brands(workspace_id);
create index brand_memory_items_brand_id_idx on public.brand_memory_items(brand_id);
create index content_campaigns_brand_id_idx on public.content_campaigns(brand_id);
create index content_ideas_campaign_id_idx on public.content_ideas(campaign_id);
create index content_scripts_campaign_id_idx on public.content_scripts(campaign_id);
create index render_jobs_workspace_status_idx on public.render_jobs(workspace_id, status, updated_at desc);
create index render_jobs_user_status_idx on public.render_jobs(user_id, status, updated_at desc);
create unique index render_jobs_user_idempotency_key_idx
  on public.render_jobs(user_id, idempotency_key)
  where idempotency_key is not null;
create index job_events_job_id_idx on public.job_events(job_id, created_at);
create index video_assets_brand_id_idx on public.video_assets(brand_id, created_at desc);
create index usage_events_workspace_id_idx on public.usage_events(workspace_id, created_at desc);
create index performance_metrics_brand_id_idx on public.performance_metrics(brand_id, created_at desc);
create index performance_learnings_brand_status_idx on public.performance_learnings(brand_id, status, created_at desc);

create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.handle_updated_at();
create trigger brands_updated_at before update on public.brands
  for each row execute function public.handle_updated_at();
create trigger brand_memory_items_updated_at before update on public.brand_memory_items
  for each row execute function public.handle_updated_at();
create trigger content_campaigns_updated_at before update on public.content_campaigns
  for each row execute function public.handle_updated_at();
create trigger content_ideas_updated_at before update on public.content_ideas
  for each row execute function public.handle_updated_at();
create trigger content_scripts_updated_at before update on public.content_scripts
  for each row execute function public.handle_updated_at();
create trigger render_jobs_updated_at before update on public.render_jobs
  for each row execute function public.handle_updated_at();
create trigger performance_learnings_updated_at before update on public.performance_learnings
  for each row execute function public.handle_updated_at();
create trigger candidate_memory_items_updated_at before update on public.candidate_memory_items
  for each row execute function public.handle_updated_at();

create or replace function public.workspace_role(p_workspace_id uuid)
returns text as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = auth.uid()
  limit 1;
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function public.is_workspace_admin(p_workspace_id uuid)
returns boolean as $$
  select coalesce(public.workspace_role(p_workspace_id) in ('owner','admin'), false);
$$ language sql stable security definer set search_path = public, pg_temp;

create or replace function public.can_manage_workspace(p_workspace_id uuid)
returns boolean as $$
  select coalesce(public.workspace_role(p_workspace_id) in ('owner','admin','operator'), false);
$$ language sql stable security definer set search_path = public, pg_temp;

-- RLS.
alter table public.credit_transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.brands enable row level security;
alter table public.brand_memory_items enable row level security;
alter table public.brain_snapshots enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.content_campaigns enable row level security;
alter table public.content_ideas enable row level security;
alter table public.content_scripts enable row level security;
alter table public.render_jobs enable row level security;
alter table public.job_events enable row level security;
alter table public.video_assets enable row level security;
alter table public.usage_events enable row level security;
alter table public.performance_reports enable row level security;
alter table public.performance_metrics enable row level security;
alter table public.performance_learnings enable row level security;
alter table public.candidate_memory_items enable row level security;

create policy "Users can view own credit transactions"
  on public.credit_transactions for select using (auth.uid() = user_id);

create policy "Users can view own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users can update own notifications"
  on public.notifications for update using (auth.uid() = user_id);

create policy "Members can view workspaces"
  on public.workspaces for select using (public.is_workspace_member(id));
create policy "Owners and admins can update workspaces"
  on public.workspaces for update using (public.is_workspace_admin(id));

create policy "Members can view workspace memberships"
  on public.workspace_members for select using (public.is_workspace_member(workspace_id));
create policy "Owners and admins can invite workspace members"
  on public.workspace_members for insert with check (
    public.is_workspace_admin(workspace_id)
    and role in ('admin','operator','client','viewer')
  );

create policy "Members can view brands"
  on public.brands for select using (public.is_workspace_member(workspace_id));
create policy "Managers can create brands"
  on public.brands for insert with check (public.can_manage_workspace(workspace_id));
create policy "Managers can update brands"
  on public.brands for update using (public.can_manage_workspace(workspace_id));

create policy "Members can view brand memory"
  on public.brand_memory_items for select using (public.is_workspace_member(workspace_id));
create policy "Managers can manage brand memory"
  on public.brand_memory_items for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy "Members can view brain snapshots"
  on public.brain_snapshots for select using (
    exists (select 1 from public.brands b where b.id = brand_id and public.is_workspace_member(b.workspace_id))
  );
create policy "Members can view prompt versions"
  on public.prompt_versions for select using (
    exists (select 1 from public.brands b where b.id = brand_id and public.is_workspace_member(b.workspace_id))
  );

create policy "Members can view campaigns"
  on public.content_campaigns for select using (public.is_workspace_member(workspace_id));
create policy "Managers can manage campaigns"
  on public.content_campaigns for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy "Members can view ideas"
  on public.content_ideas for select using (
    exists (select 1 from public.content_campaigns c where c.id = campaign_id and public.is_workspace_member(c.workspace_id))
  );
create policy "Managers can manage ideas"
  on public.content_ideas for all using (
    exists (select 1 from public.content_campaigns c where c.id = campaign_id and public.can_manage_workspace(c.workspace_id))
  )
  with check (
    exists (select 1 from public.content_campaigns c where c.id = campaign_id and public.can_manage_workspace(c.workspace_id))
  );
create policy "Members can view scripts"
  on public.content_scripts for select using (
    exists (select 1 from public.content_campaigns c where c.id = campaign_id and public.is_workspace_member(c.workspace_id))
  );
create policy "Managers can manage scripts"
  on public.content_scripts for all using (
    exists (select 1 from public.content_campaigns c where c.id = campaign_id and public.can_manage_workspace(c.workspace_id))
  )
  with check (
    exists (select 1 from public.content_campaigns c where c.id = campaign_id and public.can_manage_workspace(c.workspace_id))
  );

create policy "Members can view render jobs"
  on public.render_jobs for select using (
    user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

create policy "Members can view job events"
  on public.job_events for select using (
    exists (
      select 1 from public.render_jobs r
      where r.id = job_id and (r.user_id = auth.uid() or (r.workspace_id is not null and public.is_workspace_member(r.workspace_id)))
    )
  );

create policy "Members can view video assets"
  on public.video_assets for select using (
    workspace_id is not null and public.is_workspace_member(workspace_id)
  );

create policy "Members can view usage events"
  on public.usage_events for select using (
    user_id = auth.uid() or (workspace_id is not null and public.is_workspace_member(workspace_id))
  );

create policy "Members can view performance reports"
  on public.performance_reports for select using (public.is_workspace_member(workspace_id));
create policy "Managers can manage performance reports"
  on public.performance_reports for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy "Members can view performance metrics"
  on public.performance_metrics for select using (public.is_workspace_member(workspace_id));
create policy "Managers can manage performance metrics"
  on public.performance_metrics for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy "Members can view performance learnings"
  on public.performance_learnings for select using (public.is_workspace_member(workspace_id));
create policy "Managers can manage performance learnings"
  on public.performance_learnings for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
create policy "Members can view candidate memory"
  on public.candidate_memory_items for select using (public.is_workspace_member(workspace_id));
create policy "Managers can manage candidate memory"
  on public.candidate_memory_items for all using (public.can_manage_workspace(workspace_id))
  with check (public.can_manage_workspace(workspace_id));
