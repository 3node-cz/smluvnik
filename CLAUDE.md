# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Smluvník** is a Czech-language household/business contract management SaaS app. Users track contracts (energy, insurance, mortgage, mobile plans, etc.), get expiration alerts, and can use AI to auto-extract data from scanned documents. Freemium model with Start/Jistota/Business tiers.

Live at: https://smluvnik.cz

## Tech Stack

Next.js 16 (App Router) + `@supabase/ssr` + Tailwind v4 + shadcn/ui.

```bash
npm install
npm run dev        # Dev server
npm run build      # Production build
npm run start      # Preview production
npm run lint       # ESLint
```

## Architecture

### Routing
- `/` — server component, checks auth: renders dashboard (authenticated) or landing page (public)
- `/login` — auth page (login, register, reset password, MFA)
- `/callback` — Supabase auth callback (OAuth, email confirm, password recovery)
- `/suppliers`, `/notifications`, `/settings`, `/plans`, `/admin` — app pages under `(app)` route group with sidebar layout
- `/api/extract` — Gemini AI document extraction
- `/api/admin/resend-stats` — server-side proxy for Resend email stats

### Data Flow
```
Server Component (fetches data via createServerClient + cookies)
  → passes props to Client Component (handles interaction)
    → calls Server Action (mutates via createServerClient)
      → client calls router.refresh() (fresh server render)
```

No ISR, no `revalidatePath()`. All authenticated pages are fully dynamic (using `cookies()` opts out of caching automatically).

### Supabase Integration
Three clients following `@supabase/ssr` pattern:
- `lib/supabase/client.ts` — browser client for client components
- `lib/supabase/server.ts` — server client for server components/actions
- `lib/supabase/middleware.ts` — middleware client for session refresh

Auth middleware at `proxy.ts` (Next.js 16 convention, replaces `middleware.ts`).

### Key Files
- `lib/types/database.ts` — Contract, Profile types + CONTRACT_CATEGORIES (21 categories)
- `lib/context.tsx` — AppProvider + useApp() hook (user, profile, appSettings)
- `lib/actions/` — server actions (contracts, documents, profile, suppliers)
- `components/contracts/` — ContractCard, ContractList (owns form modal state), ContractForm
- `components/shared/sidebar.tsx` — sidebar navigation (desktop + mobile Sheet)

### Database Schema (Supabase PostgreSQL)
- **profiles** — user profile, plan, role, addon flags, subscription details
- **contracts** — core entity with category, provider, payment, validity, file refs
- **contract_documents** — additional documents per contract
- **notification_log** — tracks sent notifications
- **supplier_notes** — per-supplier user notes
- **app_settings** — key-value admin configuration
- **ai_usage_log** — AI extraction call tracking
- RLS enforced on all user-facing tables
- Admin RPC functions: `get_contract_counts`, `get_storage_usage`, `get_ai_usage_stats`

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL               # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY          # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY              # Server-only, admin operations + AI logging
GOOGLE_CLOUD_PROJECT                   # GCP project ID pro Vertex AI
GOOGLE_APPLICATION_CREDENTIALS_JSON   # Service account JSON (inline, pro Vercel)
VERTEX_LOCATION                        # Volitelný, výchozí europe-west4
CRON_SECRET                            # Bearer token pro /api/cron/notifications
```

### External Services
- **Vercel Cron** — spouští `/api/cron/notifications` každý den v 8:00 UTC (viz vercel.json)
- **Resend** — odesílání expirací emailů, API klíč uložen v `app_settings.resend_api_key`
- **Google Vertex AI (europe-west4)** — Gemini 2.5 Flash pro extrakci dat z dokumentů (GDPR)
- **Vercel Analytics** — usage tracking, podmíněno cookie souhlasem

## Design Patterns

- All UI text is Czech (hardcoded, no i18n)
- Tailwind custom `navy-*` and `teal-*` color scales; Inter (body) + DM Sans (headings)
- shadcn/ui components with `@base-ui/react` (NOT Radix) — Button does not support `asChild`
- Icons from `lucide-react`
- Server components for data fetching, client components for interactivity
- Server actions for mutations (no revalidatePath, client uses router.refresh)
