-- Durable Guiones chat sessions and workspace-level script drafts.

alter table public.content_scripts
  add column if not exists workspace_id uuid references public.workspaces(id) on delete cascade;

update public.content_scripts s
set workspace_id = c.workspace_id
from public.content_campaigns c
where s.campaign_id = c.id
  and s.workspace_id is null;

alter table public.content_scripts
  alter column workspace_id set not null,
  alter column campaign_id drop not null;

create index if not exists content_scripts_workspace_id_idx on public.content_scripts(workspace_id);
create index if not exists content_scripts_workspace_updated_idx on public.content_scripts(workspace_id, updated_at desc);

alter table public.content_scripts
  drop constraint if exists content_scripts_workspace_brand_fk;

alter table public.content_scripts
  add constraint content_scripts_workspace_brand_fk
  foreign key (brand_id, workspace_id) references public.brands(id, workspace_id);

drop policy if exists "Members can view scripts" on public.content_scripts;
drop policy if exists "Managers can manage scripts" on public.content_scripts;

create policy "Members can view scripts"
  on public.content_scripts for select using (
    public.is_workspace_member(workspace_id)
  );

create policy "Managers can manage scripts"
  on public.content_scripts for all using (
    public.can_manage_workspace(workspace_id)
  )
  with check (
    public.can_manage_workspace(workspace_id)
  );

create table if not exists public.script_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Nuevo chat',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint script_chat_sessions_brand_workspace_fk
    foreign key (brand_id, workspace_id) references public.brands(id, workspace_id)
);

create table if not exists public.script_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.script_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null default '',
  attachments jsonb not null default '[]',
  model text,
  created_at timestamptz not null default now()
);

create index if not exists script_chat_sessions_workspace_updated_idx
  on public.script_chat_sessions(workspace_id, updated_at desc);
create index if not exists script_chat_sessions_user_idx
  on public.script_chat_sessions(user_id);
create index if not exists script_chat_messages_session_created_idx
  on public.script_chat_messages(session_id, created_at asc);

drop trigger if exists script_chat_sessions_updated_at on public.script_chat_sessions;
create trigger script_chat_sessions_updated_at
  before update on public.script_chat_sessions
  for each row execute function public.handle_updated_at();

alter table public.script_chat_sessions enable row level security;
alter table public.script_chat_messages enable row level security;

drop policy if exists "Members can view own script chat sessions" on public.script_chat_sessions;
drop policy if exists "Members can create own script chat sessions" on public.script_chat_sessions;
drop policy if exists "Members can update own script chat sessions" on public.script_chat_sessions;
drop policy if exists "Members can delete own script chat sessions" on public.script_chat_sessions;

create policy "Members can view own script chat sessions"
  on public.script_chat_sessions for select using (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  );

create policy "Members can create own script chat sessions"
  on public.script_chat_sessions for insert with check (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  );

create policy "Members can update own script chat sessions"
  on public.script_chat_sessions for update using (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  )
  with check (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  );

create policy "Members can delete own script chat sessions"
  on public.script_chat_sessions for delete using (
    user_id = auth.uid() and public.is_workspace_member(workspace_id)
  );

drop policy if exists "Members can view own script chat messages" on public.script_chat_messages;
drop policy if exists "Members can create own script chat messages" on public.script_chat_messages;
drop policy if exists "Members can delete own script chat messages" on public.script_chat_messages;

create policy "Members can view own script chat messages"
  on public.script_chat_messages for select using (
    exists (
      select 1
      from public.script_chat_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
        and public.is_workspace_member(s.workspace_id)
    )
  );

create policy "Members can create own script chat messages"
  on public.script_chat_messages for insert with check (
    exists (
      select 1
      from public.script_chat_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
        and public.is_workspace_member(s.workspace_id)
    )
  );

create policy "Members can delete own script chat messages"
  on public.script_chat_messages for delete using (
    exists (
      select 1
      from public.script_chat_sessions s
      where s.id = session_id
        and s.user_id = auth.uid()
        and public.is_workspace_member(s.workspace_id)
    )
  );
