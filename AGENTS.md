# Jaime AI Goon Generator — Agent Guide

## Project Overview

Jaime AI Goon Generator is an AI-powered video personalization platform targeting the Mexican market. The platform enables users to upload a base video, define dynamic variables (names, companies, etc.), upload recipient lists via CSV, and generate personalized bulk videos using LipDub AI's video generation API.

**Current Status:** Early-stage implementation. The UI is complete with mock data for most features, but backend integration (database persistence, actual video generation workflow) is partially implemented.

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.3 |
| **UI Library** | React 18 |
| **Styling** | Tailwind CSS 3.4 |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Icons** | Lucide React |
| **Utilities** | clsx, tailwind-merge |
| **External APIs** | LipDub AI (video generation), Supermemory (script storage) |

## Project Structure

```
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth route group (no layout wrapper)
│   │   ├── layout.tsx        # Auth pages layout (centered card)
│   │   ├── login/page.tsx    # Sign in page
│   │   └── signup/page.tsx   # Sign up page
│   ├── auth/callback/route.ts # OAuth callback handler
│   ├── layout.tsx            # Root layout (Inter font, dark theme)
│   ├── page.tsx              # Projects dashboard (homepage)
│   ├── personalize/page.tsx  # Redirects to /upload
│   ├── upload/page.tsx       # 4-step video upload/create flow
│   ├── scripts/page.tsx      # Script Workshop (knowledge vault)
│   └── subscription/page.tsx # Plans and credits management
├── components/
│   ├── layout/               # Shell components
│   │   ├── Layout.tsx        # Main app shell (Sidebar + Header)
│   │   ├── Sidebar.tsx       # Navigation sidebar
│   │   └── Header.tsx        # Top bar with credits, user info
│   ├── personalize/          # Wizard step components (legacy)
│   ├── projects/             # Dashboard components
│   ├── script-workshop/      # Script management UI
│   └── upload/               # Video creation flow components
├── lib/                      # Utilities and API clients
│   ├── supabase/             # Supabase client configs
│   │   ├── client.ts         # Browser client (anon key)
│   │   ├── server.ts         # Server client (cookies)
│   │   └── middleware.ts     # Session refresh middleware
│   ├── supabase.ts           # Admin client (service role)
│   ├── lipdub-api.ts         # LipDub API client
│   ├── script-knowledge.ts   # Supermemory integration
│   └── utils.ts              # cn() helper for Tailwind
├── supabase/
│   └── migrations/           # Database schema
├── styles/
│   └── globals.css           # Tailwind imports + custom styles
├── middleware.ts             # Auth redirect middleware
└── test-api.js               # LipDub API test suite
```

## Available Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint with Next.js config
```

**No test framework is configured yet.**

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# LipDub API (server-side only — do NOT prefix with NEXT_PUBLIC_)
LIPDUB_API_KEY=your-lipdub-api-key

# Optional: Supermemory for script storage
NEXT_PUBLIC_SUPERMEMORY_API_KEY=your-supermemory-key
```

## Routing Architecture

The app uses Next.js 14 App Router with route groups:

| Route | File | Description |
|-------|------|-------------|
| `/` | `app/page.tsx` | Projects dashboard (requires auth) |
| `/login` | `app/(auth)/login/page.tsx` | Sign in (redirects if authenticated) |
| `/signup` | `app/(auth)/signup/page.tsx` | Sign up |
| `/personalize` | `app/personalize/page.tsx` | Redirects to `/upload` |
| `/upload` | `app/upload/page.tsx` | 4-step video creation flow |
| `/scripts` | `app/scripts/page.tsx` | Script Workshop |
| `/subscription` | `app/subscription/page.tsx` | Plans and credits |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth exchange |

**Auth Flow:**
- Middleware (`middleware.ts`) protects all routes except auth pages
- Unauthenticated users are redirected to `/login`
- Authenticated users accessing `/login` or `/signup` are redirected to `/`

## Video Creation Flow

The `/upload` page implements a 4-step wizard:

1. **Video Upload** (`VideoUpload.tsx`)
   - Drag & drop video file upload
   - Uploads to LipDub API via signed URL
   - Confirmation dialog with requirements check

2. **Audio/Script** (`AudioUploadEnhanced.tsx`)
   - Upload audio file OR type script for TTS
   - Script Workshop integration available

3. **Shot Creation** (`ShotCreator.tsx`)
   - Creates AI shot from video + audio
   - Polls for processing completion

4. **Download** (`VideoDownload.tsx`)
   - Generated video download link
   - Status tracking

## Database Schema

See `supabase/migrations/001_initial_schema.sql` for complete schema. Key tables:

- `profiles` — extends `auth.users`
- `subscription_plans` — pricing tiers (Free Trial, Starter, Pro, Enterprise)
- `user_subscriptions` — user credits and billing
- `projects` — video projects
- `videos` — source video uploads with LipDub IDs
- `audio_files` — audio uploads
- `variables` — dynamic placeholders
- `recipients` — CSV data
- `generation_jobs` — async generation tracking
- `generated_videos` — output videos per recipient
- `scripts` — reusable script templates

**Row Level Security (RLS)** is enabled on all tables. Users can only access their own data.

## Styling Guidelines

### Color Palette (Dark Theme Only)

| Token | Value | Usage |
|-------|-------|-------|
| `background` | `#0D0D0F` | Page background |
| `bg-secondary` | `#1A1A1F` | Cards, sidebar |
| `bg-elevated` | `#25252B` | Inputs, hover states |
| `border` | `#2D2D35` | Borders, dividers |
| `accent` | `#E040FB` | Primary magenta |
| `accent-secondary` | `#B027F7` | Purple gradient end |
| `text-primary` | `#FFFFFF` | Headings |
| `text-secondary` | `#9CA3AF` | Body text |
| `text-muted` | `#6B7280` | Placeholders |

### Utility Classes

```css
/* Gradient text */
.gradient-text  /* magenta → purple gradient text */

/* Upload zone */
.upload-zone    /* dashed border, hover accent */
```

### Component Patterns

- Use `cn()` from `@/lib/utils` for conditional classes
- Icons: `lucide-react` only
- Buttons: `bg-accent hover:bg-accent-hover` for primary
- Inputs: `bg-bg-elevated border-border focus:border-accent`

## Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`):

```typescript
import Layout from '@/components/layout/Layout'
import { createClient } from '@/lib/supabase/client'
```

## API Clients

### Supabase

Three clients for different contexts:

```typescript
// Browser (Client Components)
import { createClient } from '@/lib/supabase/client'

// Server (Server Components/Actions)
import { createClient } from '@/lib/supabase/server'

// Admin (bypasses RLS, server-only)
import { supabaseAdmin } from '@/lib/supabase'
```

### LipDub API

```typescript
import { lipdubApi } from '@/lib/lipdub-api'

// Upload video
const upload = await lipdubApi.initiateVideoUpload({
  file_name: 'video.mp4',
  content_type: 'video/mp4',
  project_name: 'My Project',
  scene_name: 'Scene 1',
  actor_name: 'Actor'
})

// Upload to signed URL
await lipdubApi.uploadFileToUrl(upload.upload_url, file)

// Generate video
const result = await lipdubApi.generateVideo(shotId, {
  output_filename: 'output.mp4',
  audio_id: 'audio-123'
})
```

## Code Style

- **Strict TypeScript** enabled (`strict: true`)
- **Quotes:** Single quotes for strings
- **Semicolons:** No strict requirement (follow existing code)
- **Components:** Default exports for page components
- **Props Interfaces:** Define inline or in same file

## Testing

No test framework is configured. The `test-api.js` file contains a Node.js script for manually testing LipDub API endpoints:

```bash
node test-api.js
```

## Security Considerations

1. **API Keys:** LipDub API key is server-side only (`LIPDUB_API_KEY` without `NEXT_PUBLIC_` prefix)
2. **Supabase:** Service role key never exposed to browser
3. **RLS:** All database tables have Row Level Security enabled
4. **Middleware:** Auth redirects at edge
5. **File Uploads:** Signed URLs for direct-to-storage uploads

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Common Tasks

### Adding a New Page

1. Create file in `app/` directory
2. Wrap with `Layout` component if it should show sidebar/header
3. Use `(auth)` group for auth-related pages (no Layout wrapper)

### Adding a New API Integration

1. Create client in `lib/` directory
2. Use environment variables for API keys
3. Never expose server-only keys to browser (no `NEXT_PUBLIC_` prefix)

### Database Changes

1. Update `supabase/migrations/001_initial_schema.sql`
2. Apply changes via Supabase Dashboard SQL Editor
3. Update RLS policies for new tables

## Notes for AI Agents

- The project uses **mock data** in many components (check for `mockProjects`, `mockScripts`)
- Backend persistence is partially implemented — verify if features need database integration
- The UI is dark theme **only** — no light mode support
- Language is set to Spanish (`lang="es"`) but all content is in English
- Credit system and subscription tiers are defined in database but UI uses hardcoded values
