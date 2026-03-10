# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build (runs prebuild to clear .next/dev/types first)
npm run start        # Serve production build
npm run lint         # ESLint
npm run backend      # Run Express backend locally (node backend/server.js)
```

No test runner is configured. Deploy via `vercel --prod` (deploys to patternaligned.com without requiring a git push).

## Architecture

Two services, both on the same PostgreSQL database on Render:

1. **Next.js frontend** (Vercel) — `app/` directory, App Router
2. **Express backend** (`backend/server.js`) — running on Render at `patternaligned-api.onrender.com`

### Auth

NextAuth v4 with GitHub OAuth. All config is in `lib/auth.ts`. On first login, `upsertUser()` in `lib/actions/user.ts` writes to the `users` table in PostgreSQL and returns a UUID. That UUID becomes `session.user.id`. The route handler is a thin wrapper at `app/api/auth/[...nextauth]/route.ts`.

**Server components:** Use `requireAuth()` from `lib/auth-guard.ts` — redirects to `/auth` if unauthenticated.
**Client components:** Use `useSession()` from `next-auth/react`.
**API routes:** Use `getServerSession(authOptions)` and check `session?.user?.email`.

### API Proxy Pattern

`next.config.mjs` has a fallback rewrite: any `/api/*` request not handled by a Next.js route file falls through to `https://patternaligned-api.onrender.com/api/*`.

Next.js API routes act as a **proxy/validation layer** before Render. When calling Render from a Next.js API route, always pass:
```ts
headers: {
  'Content-Type': 'application/json',
  'x-user-email': email,   // required by Render's getUser middleware
}
```

### Onboarding Flow

```
/auth/signin → /onboarding/4-probe → /onboarding/cognitive → /dashboard
```

- `/onboarding/4-probe` — 4 radio questions (compression/friction/execution/contradiction). Submits to `/api/onboarding/4-probe` which proxies to Render `/behavioral/4-probe` with `{ answers: { ... } }`.
- `/onboarding/cognitive` — renders `<OnboardingSequencer />`, which runs 3 phases sequentially:
  1. `GameSequencer` — 6 behavioral games (`app/components/CognitiveTests/`)
  2. `RelationshipModelSelector` — user picks AI interaction style
  3. `FactsSheet` — user confirms key facts
  Then redirects to `/dashboard`.

### Analytics

`logEvent()` in `lib/analytics-logger.ts` POSTs to Render's `/analytics/log`. It's server-side only (calls `getServerSession` internally). Use fire-and-forget: `logEvent(...).catch(() => {})`.

### Environment Variables

| Variable | Used by |
|---|---|
| `DATABASE_URL` | `lib/actions/user.ts`, `app/api/email-capture` (direct pg Pool) |
| `GITHUB_ID` / `GITHUB_SECRET` | `lib/auth.ts` |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | NextAuth |
| `NEXT_PUBLIC_RENDER_BACKEND_URL` | All Render fetch calls (e.g. `https://patternaligned-api.onrender.com`) |
| `RESEND_API_KEY` | `app/api/email-capture/route.ts` |

### Key File Locations

- Auth config: `lib/auth.ts`
- Auth guard (server): `lib/auth-guard.ts`
- DB user upsert: `lib/actions/user.ts`
- Analytics: `lib/analytics-logger.ts`
- Render backend: `backend/server.js`
- Onboarding orchestrator: `app/components/OnboardingSequencer.tsx`
- Cognitive games: `app/components/CognitiveTests/GameSequencer.tsx` (+ 6 sibling files)
