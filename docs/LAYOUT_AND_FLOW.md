# Jaime AI — Layout & Flow Documentation

*Last Updated: February 15, 2026*

---

## 1. Application Layout

### Top Navigation Bar (`TopNav`)

The application uses a single horizontal top-navigation bar instead of a sidebar. This component lives at `components/layout/TopNav.tsx` and is rendered by the shared `Layout` wrapper (`components/layout/Layout.tsx`).

**Structure:**

```
┌──────────────────────────────────────────────────────────────────────┐
│  JAIME AI  │ Proyectos │ Personalizar │ Guiones │ Suscripción │ ... │
│  (logo)    │  (nav)    │   (nav)      │  (nav)  │    (nav)    │ RHS │
└──────────────────────────────────────────────────────────────────────┘
│                          Page Content                                │
```

| Section | Contents |
|---------|----------|
| Left | Logo — links to `/` (home / Proyectos) |
| Center | Horizontal nav links with active-state highlighting |
| Right | Help button, Credits (links to `/subscription`), User email, Avatar, Sign out |

### Route-to-Active Mapping

The active nav item is derived from `usePathname()`:

| Pathname | Active Item |
|----------|-------------|
| `/` | Proyectos |
| `/personalize`, `/upload` | Personalizar video |
| `/scripts` | Biblioteca de guiones |
| `/subscription` | Suscripción |

### Layout Wrapper

All authenticated pages render inside `<Layout>`:

```tsx
<Layout>
  <YourPageContent />
</Layout>
```

`Layout` fetches the user's subscription (credits) from Supabase and passes them to `TopNav`.

---

## 2. Create Project Flow

### Entry Point

User clicks **"Crear Proyecto"** on the Projects Dashboard (`/`). This opens the `CreateProjectModal`.

### Modal Steps

1. **Select project type**
   - **Generar un video** — active, selectable. Creates a `personalization` project.
   - **Traducir un video** — disabled, greyed out, with a "Próximamente" badge. Cannot be selected.

2. **Name the campaign** (required field)
   - User enters a campaign name (e.g. "Campaña Q1 2026").
   - Validation: cannot be empty. If the user clicks "Continuar" without a name, an inline error is shown.

3. **Continue**
   - Calls `createProject()` in Supabase (inserts into `projects` table with `status: 'draft'`).
   - On success, redirects to `/upload?project={id}` to start the Personalizar video flow.

### Flow Diagram

```
Dashboard (/) → "Crear Proyecto" → Modal:
  1. Select type (only "Generar un video" is enabled)
  2. Enter campaign name (required)
  3. "Continuar" → createProject() → /upload?project={id}
```

---

## 3. Credits System

### Frontend

- **Display:** Credits are shown in the top nav bar as `{credits.toFixed(2)} créditos`.
- **Link:** Clicking the credits badge navigates to `/subscription`.
- **Data source:** `Layout` calls `getUserSubscription()` from `lib/db/queries.ts` which queries `user_subscriptions` for the current user.

### Backend (Current)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `user_subscriptions` | `credits_remaining`, `status` | Tracks credits per user |
| `subscription_plans` | `name`, `price_cents`, `credits_monthly` | Defines plan tiers |

- A free subscription (0 credits) is auto-created when a user signs up (via database trigger).
- No credit deduction is implemented yet — this is a TODO.

### Backend Implications (Future)

| Feature | Where | Notes |
|---------|-------|-------|
| Credit deduction | Server action / API route called at video generation time | Decrement `credits_remaining` atomically |
| Pre-generation check | Before starting LipDub generation | Return error if `credits_remaining < 1` |
| Low-credit warning | Frontend, when `credits_remaining` < threshold | Prompt upgrade to higher plan |
| Stripe integration | `/subscription` page | Handle plan upgrades and payment |
| Usage metering | Per-minute or per-video | Depends on final pricing model (see `docs/UNIT_ECONOMICS.md`) |

---

## 4. Files Reference

| File | Role |
|------|------|
| `components/layout/TopNav.tsx` | Horizontal top navigation bar (logo + nav + user actions) |
| `components/layout/Layout.tsx` | Page wrapper; fetches credits, renders TopNav + main content |
| `components/projects/CreateProjectModal.tsx` | Create project modal with type selection, campaign naming, Supabase persistence |
| `components/projects/ProjectsDashboard.tsx` | Projects list, search, "Crear Proyecto" button |
| `lib/db/queries.ts` | `getUserSubscription()`, `getProjects()`, `createProject()` |
| `supabase/migrations/001_initial_schema.sql` | Full database schema including RLS policies |

### Deprecated Files

| File | Status |
|------|--------|
| `components/layout/Sidebar.tsx` | Replaced by `TopNav.tsx`. Can be safely deleted. |
| `components/layout/Header.tsx` | Merged into `TopNav.tsx`. Can be safely deleted. |
