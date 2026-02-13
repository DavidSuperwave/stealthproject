# Jaime AI Goon Generator

AI-powered video personalization platform for Mexico.

## Tech Stack

- **Frontend:** Next.js 14 + React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Hosting:** Vercel

## Features

- Upload base video
- Add dynamic variables ({{first_name}}, {{company}})
- Upload recipient CSV
- Generate bulk personalized videos
- Download or email delivery

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
LIPDUB_API_KEY=
```

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

---
Built for the Mexican market 🇲🇽
