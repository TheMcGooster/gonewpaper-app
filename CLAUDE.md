# Go New Paper - Claude Code Context

## Project Overview
- Next.js 14 app (App Router) for local community news in Chariton, IA
- Deployed on Vercel (auto-deploys from `main` branch on GitHub: TheMcGooster/gonewpaper-app)
- Database: Supabase (PostgreSQL) with PostgREST API
- Push notifications: OneSignal (web push, app ID: a7951e0e-737c-42e6-bd9d-fc0931d95766)
- Email marketing: SendFox
- Payments: Stripe

## Tech Stack & Patterns
- Single-page app: most UI lives in `app/page.tsx` (large file, 2000+ lines)
- Supabase client initialized in `app/page.tsx`, service role key used in API routes
- OneSignal SDK loaded in `app/layout.tsx`, initialized via `OneSignalDeferred` pattern
- Cron jobs in `app/api/cron/` — authenticated via `CRON_SECRET` Bearer token
- Vercel Hobby plan: crons limited to daily schedules only (no `*/5` minute intervals)
- ActivePieces calls `/api/cron/event-reminders` every 30 min — this provides the frequency for 30-min-before-event reminders
- Event reminders use time-window filtering: only sends for events starting 15-45 min from now (Central Time)
- `ensureUserRow()` in auth useEffect — creates public.users row if trigger missed + detects first login

## Database Notes
- `user_interests` table links users to events they're interested in
- `user_interests` FK to `public.users` was added manually (not in main schema) — see `fix-database-issues.sql`
- `event_reminders_sent` tracks which user+event combos have been notified (prevents duplicates)
- `get_daily_event_reminders(target_date)` RPC function handles the join query (SECURITY DEFINER)
- Events use TEXT for `date` ('YYYY-MM-DD') and `time` (mixed formats: '16:00:00', '9:30 AM', '4:00 PM')
- `users.last_login` — null means first tracked login → triggers town picker modal
- **GOTCHA**: RLS is enabled on all tables. RPC functions MUST use `SECURITY DEFINER SET search_path = public` or they silently return empty results when called from API routes
- **GOTCHA**: `handle_new_user` trigger can fail silently — `ensureUserRow()` in page.tsx is the client-side fallback

## OneSignal Notes
- Player ID (`onesignal_player_id`) saved to `users` table on login + subscription change
- Player ID capture has 3 layers: immediate check, polling fallback (15 attempts), change listener
- `OneSignal.login(userId)` called in `saveOneSignalPlayerId()` — links ALL user devices via `external_id`
- Town-based targeting uses OneSignal tags (`town_id`)
- Per-user targeting (event reminders): `include_aliases: { external_id: [userId] }` — reaches ALL devices
- Broadcast uses `included_segments: ['Total Subscriptions']`
- **GOTCHA**: `include_subscription_ids` only targets ONE device — always use `include_aliases` for user notifications
- iOS Safari: web push ONLY works in PWA mode (Add to Home Screen). Detect with `isIOSNonPWA` flag in page.tsx

## Build & TypeScript Quirks
- TypeScript target doesn't support `[...new Set()]` spread — use `Array.from(new Set())` instead
- Build with `npx next build` — always verify before pushing
- CRLF line ending warnings from git are normal on Windows

## Environment Variables (set in Vercel dashboard, not visible via CLI)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`
- `CRON_SECRET`

## Plugin Status
- See `.claude/PLUGIN-STATUS.md` for current plugin connection details
- Supabase: connected via Connectors (can Execute SQL directly)
- Vercel: CLI installed & linked (scope: `jarrett-mcgees-projects`)
- GitHub: connected via Connectors
- Stripe: skills available

## Deployment
- `git push origin main` → Vercel auto-deploys
- Or use `vercel` CLI (linked, scope: `--scope jarrett-mcgees-projects`)
- Vercel project: `jarrett-mcgees-projects/gonewpaper-app`

## Common SQL Files (run in Supabase SQL Editor)
- `database-setup.sql` — main schema (doesn't include `user_interests`)
- `event-reminders-setup.sql` — `event_reminders_sent` table + `get_upcoming_event_reminders()` RPC
- `fix-database-issues.sql` — FK constraints, type fixes
- `add-daily-event-reminders-rpc.sql` — `get_daily_event_reminders()` RPC for daily cron
