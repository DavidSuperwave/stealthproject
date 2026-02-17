# Supabase Setup for Jaime AI

## Apply the database schema

### Option A: Supabase MCP (Cursor)

With Supabase MCP configured in `.cursor/mcp.json`, you can ask Cursor to apply the migration:

> "Apply the migration from supabase/migrations/001_initial_schema.sql using Supabase MCP"

Or: "Use Supabase MCP to run the database schema migration."

### Option B: Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Open **SQL Editor** → **New Query**
3. Copy the contents of `migrations/001_initial_schema.sql`
4. Paste and click **Run**

### Option C: Supabase CLI

1. Install the CLI: `npm install -g supabase`
2. Link your project: `supabase link --project-ref YOUR_PROJECT_REF`
   - Find your project ref in Dashboard → Project Settings → General
3. Push migrations: `supabase db push`

## Environment variables

Ensure `.env.local` has:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Schema overview

- **profiles** — extends auth.users, auto-created on signup
- **subscription_plans** — seeded with Free, Starter, Pro, Enterprise
- **user_subscriptions** — credits per user, auto-assigned Free plan (0 credits) on signup
- **projects** — video projects
- **videos**, **audio_files**, **variables**, **recipients** — project data
- **generation_jobs**, **generated_videos** — bulk generation tracking
- **scripts** — Script Workshop / knowledge vault

All tables have Row Level Security (RLS) enabled. Users can only access their own data.
