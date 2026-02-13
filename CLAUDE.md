# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jaime AI Goon Generator — an AI-powered video personalization platform for Mexico. Users upload a base video, define dynamic variables (names, companies, etc.), upload recipient lists via CSV, and generate personalized bulk videos. Built with Next.js 14 App Router, TypeScript, Supabase, and Tailwind CSS.

Currently early-stage: the UI is complete with mock data but backend integration (auth, database, video generation) is minimal.

## Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint with Next.js config
```

No test framework is configured yet.

## Architecture

### Routing (App Router)

- `/` — Projects dashboard (`app/page.tsx` → `ProjectsDashboard`)
- `/personalize` — 4-step video personalization wizard
- `/subscription` — Plan and credit management

### Component Organization

- `components/layout/` — Persistent shell: `Layout.tsx` wraps every page with `Sidebar` + `Header`
- `components/personalize/` — Multi-step wizard: `StepProgress`, `UploadStep`, `VariablesStep`, `RecipientsStep`, `GenerateStep`
- `components/projects/` — Dashboard, create modal, tutorial banner

### Personalization Wizard Flow

Step 1 (Upload) → Step 2 (Variables) → Step 3 (Recipients CSV) → Step 4 (Generate). Each step is a separate component; `StepProgress` renders the progress indicator. State is managed locally via `useState` in the page component.

### Data Layer

- `lib/supabase.ts` — Exports `supabase` (client, anon key) and `supabaseAdmin` (service role key)
- `lib/utils.ts` — `cn()` helper combining `clsx` + `tailwind-merge`
- No global state management; all state is local React hooks with hardcoded mock data

### Environment Variables

Copy `.env.example` to `.env.local`. Required:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client config
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side Supabase operations
- `LIPDUB_API_KEY` — LipDub video generation API (server-side only, not exposed to browser)

## Styling

Dark theme exclusively. Custom Tailwind tokens defined in `tailwind.config.ts`:
- Backgrounds: `background` (#0D0D0F), `bg-secondary`, `bg-elevated`
- Accent: `accent` (#E040FB magenta), `accent-secondary`, `accent-hover`
- Text: `text-primary`, `text-secondary`, `text-muted`
- Gradient: `gradient-accent` (magenta → purple)
- Font: Inter via `fontFamily.sans`
- Icons: Lucide React throughout

## Path Alias

`@/*` maps to project root (configured in `tsconfig.json`). Use `@/components/...`, `@/lib/...`, etc.
